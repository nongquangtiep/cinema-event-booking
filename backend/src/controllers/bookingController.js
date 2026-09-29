/**
 * Booking and Payment Controller
 * Implements Seat Locking (TTL 5 mins), MySQL Transactions, and Mock Payment
 */

const { pool } = require('../config/database');
const { generateQRCode } = require('../utils/qrGenerator');
const {
  cinemaTicketsBookedTotal,
  cinemaRevenueTotalVnd,
  cinemaActiveSeatLocks
} = require('../utils/metrics');
const logger = require('../config/logger');

/**
 * Hold seats temporarily with 5-minute TTL
 * POST /api/bookings/hold-seats
 */
async function holdSeats(req, res, next) {
  const { showtime_id, seat_ids, session_id } = req.body;

  if (!showtime_id || !Array.isArray(seat_ids) || seat_ids.length === 0 || !session_id) {
    return res.status(400).json({ error: 'Thiếu thông tin: showtime_id, seat_ids (mảng) và session_id là bắt buộc.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const placeholders = seat_ids.map(() => '?').join(',');

    // 1. Clean up any expired locks for these specific seats
    await connection.query(
      `DELETE FROM seat_locks WHERE showtime_id = ? AND seat_id IN (${placeholders}) AND locked_until <= NOW()`,
      [showtime_id, ...seat_ids]
    );

    // 2. Check if any seat is already booked (paid)
    const [alreadyBooked] = await connection.query(
      `SELECT seat_id FROM booking_seats WHERE showtime_id = ? AND seat_id IN (${placeholders})`,
      [showtime_id, ...seat_ids]
    );

    if (alreadyBooked.length > 0) {
      await connection.rollback();
      const bookedIds = alreadyBooked.map(r => r.seat_id);
      return res.status(409).json({
        error: 'Một hoặc nhiều ghế đã được mua thành công bởi người khác.',
        conflict_seat_ids: bookedIds
      });
    }

    // 3. Check if any seat is locked by another session
    const [lockedByOthers] = await connection.query(
      `SELECT seat_id FROM seat_locks 
       WHERE showtime_id = ? AND seat_id IN (${placeholders}) 
         AND session_id != ? AND locked_until > NOW()`,
      [showtime_id, ...seat_ids, session_id]
    );

    if (lockedByOthers.length > 0) {
      await connection.rollback();
      const lockedIds = lockedByOthers.map(r => r.seat_id);
      return res.status(409).json({
        error: 'Một hoặc nhiều ghế đang được giữ bởi người khác.',
        conflict_seat_ids: lockedIds
      });
    }

    // 4. Insert or update seat locks with 5 minutes TTL
    for (const seatId of seat_ids) {
      await connection.execute(
        `INSERT INTO seat_locks (showtime_id, seat_id, session_id, locked_until)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
         ON DUPLICATE KEY UPDATE session_id = VALUES(session_id), locked_until = VALUES(locked_until)`,
        [showtime_id, seatId, session_id]
      );
    }

    await connection.commit();

    // Update Prometheus active seat locks gauge
    const [[{ activeCount }]] = await pool.query('SELECT COUNT(*) AS activeCount FROM seat_locks WHERE locked_until > NOW()');
    cinemaActiveSeatLocks.set(Number(activeCount));

    logger.info('Seats held successfully', { showtime_id, seat_ids, session_id });

    res.json({
      success: true,
      expires_in_seconds: 300,
      showtime_id,
      seat_ids,
      session_id
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        // Rollback may already be triggered by deadlock
      }
    }

    // Handle concurrent lock conflict, deadlock, timeout, or duplicate entry as HTTP 409
    if (
      err.code === 'ER_LOCK_DEADLOCK' ||
      err.errno === 1213 ||
      err.code === 'ER_LOCK_WAIT_TIMEOUT' ||
      err.errno === 1205 ||
      err.code === 'ER_DUP_ENTRY' ||
      err.errno === 1062
    ) {
      logger.warn('Concurrent seat lock race condition detected - returning 409 Conflict', {
        showtime_id,
        seat_ids,
        session_id,
        error: err.code
      });
      return res.status(409).json({
        error: 'Một hoặc nhiều ghế đang được giữ bởi người khác.',
        conflict_seat_ids: seat_ids
      });
    }

    next(err);
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Release seats manually when customer cancels or navigates back
 * POST /api/bookings/release-seats
 */
async function releaseSeats(req, res, next) {
  try {
    const { showtime_id, seat_ids, session_id } = req.body;

    if (!showtime_id || !session_id) {
      return res.status(400).json({ error: 'Yêu cầu showtime_id và session_id.' });
    }

    if (Array.isArray(seat_ids) && seat_ids.length > 0) {
      const placeholders = seat_ids.map(() => '?').join(',');
      await pool.query(
        `DELETE FROM seat_locks WHERE showtime_id = ? AND session_id = ? AND seat_id IN (${placeholders})`,
        [showtime_id, session_id, ...seat_ids]
      );
    } else {
      await pool.execute(
        'DELETE FROM seat_locks WHERE showtime_id = ? AND session_id = ?',
        [showtime_id, session_id]
      );
    }

    // Update Prometheus metric
    const [[{ activeCount }]] = await pool.query('SELECT COUNT(*) AS activeCount FROM seat_locks WHERE locked_until > NOW()');
    cinemaActiveSeatLocks.set(Number(activeCount));

    res.json({ success: true, message: 'Đã giải phóng ghế giữ chỗ.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new pending booking order
 * POST /api/bookings/create
 */
async function createBooking(req, res, next) {
  try {
    const { showtime_id, seat_ids, customer_name, customer_email, customer_phone, payment_method } = req.body;

    if (!showtime_id || !Array.isArray(seat_ids) || seat_ids.length === 0 || !customer_name || !customer_email || !customer_phone) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ: showtime_id, seat_ids, customer_name, customer_email, customer_phone.' });
    }

    // Fetch showtime details to compute price
    const [showtimes] = await pool.execute('SELECT * FROM showtimes WHERE id = ?', [showtime_id]);
    if (showtimes.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy suất chiếu.' });
    }
    const showtime = showtimes[0];

    // Fetch seat types to calculate exact total amount
    const placeholders = seat_ids.map(() => '?').join(',');
    const [seats] = await pool.query(
      `SELECT id, seat_type FROM seats WHERE id IN (${placeholders})`,
      seat_ids
    );

    let totalAmount = 0;
    seats.forEach(s => {
      if (s.seat_type === 'vip') totalAmount += Number(showtime.price_vip);
      else if (s.seat_type === 'couple') totalAmount += Number(showtime.price_couple);
      else totalAmount += Number(showtime.price_standard);
    });

    // Generate unique booking code
    const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const bookingCode = `BK-${Date.now().toString(36).toUpperCase()}-${uniqueSuffix}`;
    const userId = req.user ? req.user.id : null;

    const [result] = await pool.execute(
      `INSERT INTO bookings (user_id, booking_code, showtime_id, customer_name, customer_email, customer_phone, total_amount, payment_status, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [userId, bookingCode, showtime_id, customer_name, customer_email, customer_phone, totalAmount, payment_method || 'mock_vnpay']
    );

    const bookingId = result.insertId;
    logger.info('Booking order created (pending)', { bookingId, bookingCode, totalAmount });

    res.status(201).json({
      message: 'Tạo đơn đặt vé thành công',
      data: {
        booking_id: bookingId,
        booking_code: bookingCode,
        showtime_id,
        seat_ids,
        total_amount: totalAmount,
        payment_status: 'pending'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Confirm Mock Payment & Issue E-Ticket with QR Code
 * POST /api/bookings/:id/confirm-payment
 */
async function confirmPayment(req, res, next) {
  const { id } = req.params;
  const { session_id, payment_method, seat_ids } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Fetch booking with row lock
    const [bookings] = await connection.execute(
      'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
      [id]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt vé.' });
    }

    const booking = bookings[0];

    // If already paid, return directly
    if (booking.payment_status === 'paid') {
      await connection.commit();
      return res.json({
        message: 'Đơn hàng đã được thanh toán trước đó.',
        data: booking
      });
    }

    // Determine seats to book: from body or from seat_locks for this session
    let seatsToBook = seat_ids;
    if (!Array.isArray(seatsToBook) || seatsToBook.length === 0) {
      const [heldRows] = await connection.execute(
        'SELECT seat_id FROM seat_locks WHERE showtime_id = ? AND session_id = ?',
        [booking.showtime_id, session_id]
      );
      seatsToBook = heldRows.map(r => r.seat_id);
    }

    if (!seatsToBook || seatsToBook.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Không tìm thấy danh sách ghế của đơn hàng hoặc phiên giữ ghế đã hết hạn.' });
    }

    // 2. Fetch seats & showtime prices
    const [showtimes] = await connection.execute('SELECT * FROM showtimes WHERE id = ?', [booking.showtime_id]);
    const showtime = showtimes[0];

    const placeholders = seatsToBook.map(() => '?').join(',');
    const [seatDetails] = await connection.query(
      `SELECT id, seat_type FROM seats WHERE id IN (${placeholders})`,
      seatsToBook
    );

    // 3. Insert into booking_seats (Double Booking hard guard!)
    for (const seat of seatDetails) {
      let seatPrice = Number(showtime.price_standard);
      if (seat.seat_type === 'vip') seatPrice = Number(showtime.price_vip);
      else if (seat.seat_type === 'couple') seatPrice = Number(showtime.price_couple);

      try {
        await connection.execute(
          `INSERT INTO booking_seats (booking_id, showtime_id, seat_id, price)
           VALUES (?, ?, ?, ?)`,
          [booking.id, booking.showtime_id, seat.id, seatPrice]
        );
      } catch (insertErr) {
        // Catch duplicate key on unique_showtime_seat or concurrency contention
        if (
          insertErr.code === 'ER_DUP_ENTRY' ||
          insertErr.errno === 1062 ||
          insertErr.code === 'ER_LOCK_DEADLOCK' ||
          insertErr.errno === 1213 ||
          insertErr.code === 'ER_LOCK_WAIT_TIMEOUT' ||
          insertErr.errno === 1205
        ) {
          await connection.rollback();
          logger.warn('Double booking prevented by UNIQUE constraint or lock conflict!', {
            booking_id: booking.id,
            showtime_id: booking.showtime_id,
            seat_id: seat.id
          });
          return res.status(409).json({
            error: 'Thao tác không thành công: Ghế này vừa được thanh toán bởi một khách hàng khác!',
            seat_id: seat.id
          });
        }
        throw insertErr;
      }
    }

    // 4. Clear seat_locks
    await connection.query(
      `DELETE FROM seat_locks WHERE showtime_id = ? AND seat_id IN (${placeholders})`,
      [booking.showtime_id, ...seatsToBook]
    );

    // 5. Generate QR Code
    const qrCodeDataUrl = await generateQRCode(booking.booking_code);

    // 6. Update booking status to 'paid'
    const finalMethod = payment_method || booking.payment_method || 'mock_vnpay';
    await connection.execute(
      `UPDATE bookings SET payment_status = 'paid', payment_method = ?, qr_code = ? WHERE id = ?`,
      [finalMethod, qrCodeDataUrl, booking.id]
    );

    await connection.commit();

    // 7. Update Prometheus Metrics
    cinemaTicketsBookedTotal.inc({ movie_id: showtime.movie_event_id.toString() }, seatsToBook.length);
    cinemaRevenueTotalVnd.inc(Number(booking.total_amount));
    const [[{ activeCount }]] = await pool.query('SELECT COUNT(*) AS activeCount FROM seat_locks WHERE locked_until > NOW()');
    cinemaActiveSeatLocks.set(Number(activeCount));

    logger.info('Booking payment confirmed and tickets issued', {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      ticketsCount: seatsToBook.length,
      amount: booking.total_amount
    });

    res.json({
      message: 'Thanh toán thành công! Vé điện tử đã được phát hành.',
      data: {
        id: booking.id,
        booking_code: booking.booking_code,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        total_amount: booking.total_amount,
        payment_status: 'paid',
        payment_method: finalMethod,
        qr_code: qrCodeDataUrl,
        seats_booked: seatsToBook
      }
    });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Retrieve booking details by booking_code
 * GET /api/bookings/:bookingCode
 */
async function getBookingByCode(req, res, next) {
  try {
    const { bookingCode } = req.params;

    const [bookings] = await pool.execute(
      `SELECT b.*, 
              s.start_time, s.end_time,
              m.title AS movie_title, m.poster_url AS movie_poster, m.duration_minutes,
              h.name AS hall_name, h.type AS hall_type,
              c.name AS cinema_name, c.address AS cinema_address, c.city AS cinema_city
       FROM bookings b
       JOIN showtimes s ON b.showtime_id = s.id
       JOIN movies_events m ON s.movie_event_id = m.id
       JOIN halls h ON s.hall_id = h.id
       JOIN cinemas c ON h.cinema_id = c.id
       WHERE b.booking_code = ? LIMIT 1`,
      [bookingCode]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy vé với mã này.' });
    }

    const booking = bookings[0];

    // Fetch booked seats
    const [seats] = await pool.execute(
      `SELECT bs.price, s.seat_row, s.seat_number, s.seat_type
       FROM booking_seats bs
       JOIN seats s ON bs.seat_id = s.id
       WHERE bs.booking_id = ?`,
      [booking.id]
    );

    res.json({
      data: {
        ...booking,
        seats
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  holdSeats,
  releaseSeats,
  createBooking,
  confirmPayment,
  getBookingByCode
};

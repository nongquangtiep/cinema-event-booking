/**
 * Admin Management Controller
 */

const { pool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Get dashboard statistical KPIs
 * GET /api/admin/dashboard/stats
 */
async function getDashboardStats(req, res, next) {
  try {
    // 1. Total revenue from paid bookings
    const [[{ total_revenue }]] = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM bookings WHERE payment_status = 'paid'"
    );

    // 2. Total paid tickets count
    const [[{ total_tickets }]] = await pool.query(
      "SELECT COUNT(*) AS total_tickets FROM booking_seats"
    );

    // 3. Total active movies count
    const [[{ total_movies }]] = await pool.query(
      "SELECT COUNT(*) AS total_movies FROM movies_events WHERE status = 'now_showing'"
    );

    // 4. Total registered users count
    const [[{ total_users }]] = await pool.query(
      "SELECT COUNT(*) AS total_users FROM users WHERE role = 'user'"
    );

    // 5. Recent 5 bookings
    const [recentBookings] = await pool.query(
      `SELECT b.id, b.booking_code, b.customer_name, b.total_amount, b.payment_status, b.created_at,
              m.title AS movie_title
       FROM bookings b
       JOIN showtimes s ON b.showtime_id = s.id
       JOIN movies_events m ON s.movie_event_id = m.id
       ORDER BY b.created_at DESC LIMIT 5`
    );

    res.json({
      data: {
        total_revenue: Number(total_revenue),
        total_tickets: Number(total_tickets),
        total_movies: Number(total_movies),
        total_users: Number(total_users),
        recent_bookings: recentBookings
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get bookings list with optional filter and search
 * GET /api/admin/bookings
 */
async function getAdminBookings(req, res, next) {
  try {
    const { status, search, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT b.*, 
             s.start_time, 
             m.title AS movie_title,
             c.name AS cinema_name,
             h.name AS hall_name
      FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.id
      JOIN movies_events m ON s.movie_event_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND b.payment_status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (b.booking_code LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * Check-in ticket at the cinema gate
 * POST /api/admin/check-in
 */
async function checkInTicket(req, res, next) {
  try {
    const { booking_code } = req.body;

    if (!booking_code) {
      return res.status(400).json({ error: 'Vui lòng cung cấp booking_code để soát vé.' });
    }

    const [bookings] = await pool.execute(
      `SELECT b.*, s.start_time, m.title AS movie_title, h.name AS hall_name, c.name AS cinema_name
       FROM bookings b
       JOIN showtimes s ON b.showtime_id = s.id
       JOIN movies_events m ON s.movie_event_id = m.id
       JOIN halls h ON s.hall_id = h.id
       JOIN cinemas c ON h.cinema_id = c.id
       WHERE b.booking_code = ? LIMIT 1`,
      [booking_code]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Mã vé không tồn tại trên hệ thống.' });
    }

    const booking = bookings[0];

    if (booking.payment_status !== 'paid') {
      return res.status(400).json({
        error: `Vé chưa được thanh toán thành công (Trạng thái: ${booking.payment_status}). Không thể check-in!`
      });
    }

    // Fetch seats associated with this ticket
    const [seats] = await pool.execute(
      `SELECT s.seat_row, s.seat_number, s.seat_type
       FROM booking_seats bs
       JOIN seats s ON bs.seat_id = s.id
       WHERE bs.booking_id = ?`,
      [booking.id]
    );

    logger.info('Ticket check-in verified successfully', { bookingCode: booking_code, adminId: req.user.id });

    res.json({
      message: 'Soát vé hợp lệ! Cho phép khách vào phòng chiếu.',
      valid: true,
      ticket: {
        booking_code: booking.booking_code,
        customer_name: booking.customer_name,
        movie_title: booking.movie_title,
        cinema_name: booking.cinema_name,
        hall_name: booking.hall_name,
        start_time: booking.start_time,
        seats: seats.map(s => `${s.seat_row}${s.seat_number}`)
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getAdminBookings,
  checkInTicket
};

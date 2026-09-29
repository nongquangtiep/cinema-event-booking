/**
 * Showtimes Controller
 */

const { pool } = require('../config/database');

/**
 * Get showtimes with optional filtering by movie, cinema, or date
 * GET /api/showtimes
 */
async function getAllShowtimes(req, res, next) {
  try {
    const { movie_id, cinema_id, date } = req.query;

    let query = `
      SELECT s.*, 
             m.title AS movie_title, m.poster_url AS movie_poster, m.duration_minutes,
             h.name AS hall_name, h.type AS hall_type,
             c.id AS cinema_id, c.name AS cinema_name, c.address AS cinema_address, c.city AS cinema_city
      FROM showtimes s
      JOIN movies_events m ON s.movie_event_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE s.status != 'cancelled'
    `;
    const params = [];

    if (movie_id) {
      query += ' AND s.movie_event_id = ?';
      params.push(movie_id);
    }

    if (cinema_id) {
      query += ' AND c.id = ?';
      params.push(cinema_id);
    }

    if (date) {
      query += ' AND DATE(s.start_time) = ?';
      params.push(date);
    }

    query += ' ORDER BY s.start_time ASC';

    const [rows] = await pool.execute(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * Get seats layout and dynamic real-time status for a specific showtime
 * GET /api/showtimes/:id/seats
 */
async function getShowtimeSeats(req, res, next) {
  try {
    const { id } = req.params;

    // 1. Fetch showtime details
    const [showtimes] = await pool.execute(
      `SELECT s.*, 
              m.title AS movie_title, m.poster_url AS movie_poster,
              h.id AS hall_id, h.name AS hall_name, h.type AS hall_type, h.total_rows, h.total_cols,
              c.name AS cinema_name, c.city AS cinema_city
       FROM showtimes s
       JOIN movies_events m ON s.movie_event_id = m.id
       JOIN halls h ON s.hall_id = h.id
       JOIN cinemas c ON h.cinema_id = c.id
       WHERE s.id = ? LIMIT 1`,
      [id]
    );

    if (showtimes.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy suất chiếu.' });
    }

    const showtime = showtimes[0];

    // 2. Fetch all seats configured for this hall
    const [allSeats] = await pool.execute(
      `SELECT id, hall_id, seat_row, seat_number, seat_type, status
       FROM seats
       WHERE hall_id = ? AND status = 'active'
       ORDER BY seat_row ASC, seat_number ASC`,
      [showtime.hall_id]
    );

    // 3. Fetch all already booked seats for this showtime
    const [bookedRows] = await pool.execute(
      `SELECT seat_id FROM booking_seats WHERE showtime_id = ?`,
      [id]
    );
    const bookedSeatIds = new Set(bookedRows.map(r => r.seat_id));

    // 4. Fetch currently active seat locks (locked_until > NOW())
    const [lockedRows] = await pool.execute(
      `SELECT seat_id, session_id, locked_until 
       FROM seat_locks 
       WHERE showtime_id = ? AND locked_until > NOW()`,
      [id]
    );
    const activeLockMap = new Map();
    lockedRows.forEach(r => activeLockMap.set(r.seat_id, r));

    // 5. Combine and compute dynamic status for each seat
    const seats = allSeats.map(seat => {
      let dynamicStatus = 'available';

      if (bookedSeatIds.has(seat.id)) {
        dynamicStatus = 'booked';
      } else if (activeLockMap.has(seat.id)) {
        dynamicStatus = 'locked';
      }

      // Calculate price based on seat_type
      let price = Number(showtime.price_standard);
      if (seat.seat_type === 'vip') price = Number(showtime.price_vip);
      else if (seat.seat_type === 'couple') price = Number(showtime.price_couple);

      return {
        id: seat.id,
        seat_row: seat.seat_row,
        seat_number: seat.seat_number,
        seat_type: seat.seat_type,
        price,
        status: dynamicStatus
      };
    });

    res.json({
      showtime: {
        id: showtime.id,
        movie_title: showtime.movie_title,
        movie_poster: showtime.movie_poster,
        hall_name: showtime.hall_name,
        hall_type: showtime.hall_type,
        cinema_name: showtime.cinema_name,
        start_time: showtime.start_time,
        end_time: showtime.end_time,
        price_standard: Number(showtime.price_standard),
        price_vip: Number(showtime.price_vip),
        price_couple: Number(showtime.price_couple)
      },
      seats
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllShowtimes,
  getShowtimeSeats
};

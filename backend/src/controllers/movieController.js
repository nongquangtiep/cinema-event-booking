/**
 * Movies and Events Controller
 */

const { pool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Get all movies/events with optional filters
 * GET /api/movies
 */
async function getAllMovies(req, res, next) {
  try {
    const { status, type, category_id, search } = req.query;

    let query = `
      SELECT m.*, c.name AS category_name, c.type AS category_type
      FROM movies_events m
      JOIN categories c ON m.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND c.type = ?';
      params.push(type);
    }

    if (category_id) {
      query += ' AND m.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND (m.title LIKE ? OR m.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY m.release_date DESC';

    const [rows] = await pool.execute(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * Get movie details and upcoming showtimes by ID
 * GET /api/movies/:id
 */
async function getMovieById(req, res, next) {
  try {
    const { id } = req.params;

    const [movies] = await pool.execute(
      `SELECT m.*, c.name AS category_name, c.type AS category_type
       FROM movies_events m
       JOIN categories c ON m.category_id = c.id
       WHERE m.id = ? LIMIT 1`,
      [id]
    );

    if (movies.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phim/sự kiện.' });
    }

    // Fetch upcoming showtimes for this movie
    const [showtimes] = await pool.execute(
      `SELECT s.*, h.name AS hall_name, h.type AS hall_type, c.name AS cinema_name, c.address AS cinema_address, c.city AS cinema_city
       FROM showtimes s
       JOIN halls h ON s.hall_id = h.id
       JOIN cinemas c ON h.cinema_id = c.id
       WHERE s.movie_event_id = ? AND s.status != 'cancelled'
       ORDER BY s.start_time ASC`,
      [id]
    );

    res.json({
      data: {
        ...movies[0],
        showtimes
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new movie/event (Admin only)
 * POST /api/movies
 */
async function createMovie(req, res, next) {
  try {
    const { category_id, title, description, duration_minutes, release_date, poster_url, trailer_url, status } = req.body;

    if (!category_id || !title || !duration_minutes || !release_date) {
      return res.status(400).json({ error: 'Vui lòng cung cấp category_id, title, duration_minutes, release_date.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO movies_events (category_id, title, description, duration_minutes, release_date, poster_url, trailer_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        title,
        description || '',
        duration_minutes,
        release_date,
        poster_url || null,
        trailer_url || null,
        status || 'now_showing'
      ]
    );

    logger.info('Movie created by admin', { movieId: result.insertId, title });

    res.status(201).json({
      message: 'Tạo phim/sự kiện thành công',
      data: {
        id: result.insertId,
        title,
        status: status || 'now_showing'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update movie/event (Admin only)
 * PUT /api/movies/:id
 */
async function updateMovie(req, res, next) {
  try {
    const { id } = req.params;
    const { category_id, title, description, duration_minutes, release_date, poster_url, trailer_url, status } = req.body;

    const [existing] = await pool.execute('SELECT id FROM movies_events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phim cần cập nhật.' });
    }

    await pool.execute(
      `UPDATE movies_events SET
        category_id = COALESCE(?, category_id),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        duration_minutes = COALESCE(?, duration_minutes),
        release_date = COALESCE(?, release_date),
        poster_url = COALESCE(?, poster_url),
        trailer_url = COALESCE(?, trailer_url),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [category_id, title, description, duration_minutes, release_date, poster_url, trailer_url, status, id]
    );

    logger.info('Movie updated by admin', { movieId: id });

    res.json({ message: 'Cập nhật phim thành công' });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete movie or mark as ended (Admin only)
 * DELETE /api/movies/:id
 */
async function deleteMovie(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT id FROM movies_events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phim.' });
    }

    // Soft delete: change status to ended
    await pool.execute("UPDATE movies_events SET status = 'ended' WHERE id = ?", [id]);

    logger.info('Movie status changed to ended', { movieId: id });
    res.json({ message: 'Đã chuyển trạng thái phim sang kết thúc (ended).' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie
};

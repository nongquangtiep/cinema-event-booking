const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

router.get('/', movieController.getAllMovies);
router.get('/:id', movieController.getMovieById);
router.post('/', authenticate, authorizeAdmin, movieController.createMovie);
router.put('/:id', authenticate, authorizeAdmin, movieController.updateMovie);
router.delete('/:id', authenticate, authorizeAdmin, movieController.deleteMovie);

module.exports = router;

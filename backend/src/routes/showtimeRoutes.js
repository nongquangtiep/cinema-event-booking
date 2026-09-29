const express = require('express');
const router = express.Router();
const showtimeController = require('../controllers/showtimeController');

router.get('/', showtimeController.getAllShowtimes);
router.get('/:id/seats', showtimeController.getShowtimeSeats);

module.exports = router;

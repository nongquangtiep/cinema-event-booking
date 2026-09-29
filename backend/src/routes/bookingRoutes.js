const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { optionalAuthenticate } = require('../middleware/authMiddleware');

router.post('/hold-seats', bookingController.holdSeats);
router.post('/release-seats', bookingController.releaseSeats);
router.post('/create', optionalAuthenticate, bookingController.createBooking);
router.post('/:id/confirm-payment', bookingController.confirmPayment);
router.get('/:bookingCode', bookingController.getBookingByCode);

module.exports = router;

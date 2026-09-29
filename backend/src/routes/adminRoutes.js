const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

// Protect all admin routes with authentication and admin role check
router.use(authenticate, authorizeAdmin);

router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/bookings', adminController.getAdminBookings);
router.post('/check-in', adminController.checkInTicket);

module.exports = router;

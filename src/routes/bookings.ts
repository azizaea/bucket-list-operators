import { Router } from 'express';
import {
  createSchedule,
  getSchedules,
  createBooking,
  getBookings,
  getBooking,
} from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All booking routes require authentication
router.use(authMiddleware);

/**
 * POST /api/bookings/schedules/:tourId
 * Create a tour schedule (departure time)
 */
router.post('/schedules/:tourId', createSchedule);

/**
 * GET /api/bookings/schedules/:tourId
 * Get all schedules for a tour
 */
router.get('/schedules/:tourId', getSchedules);

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post('/', createBooking);

/**
 * GET /api/bookings
 * Get all bookings for operator
 * Query params: page, limit, bookingStatus, paymentStatus
 */
router.get('/', getBookings);

/**
 * GET /api/bookings/:id
 * Get single booking details
 */
router.get('/:id', getBooking);

export default router;

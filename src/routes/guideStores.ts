import { Router } from 'express';
import {
  getStoreBySlug,
  getStoreToursBySlug,
  getMyStore,
  upsertStoreSettings,
  publishStore,
} from '../controllers/guideStoreController.js';
import {
  createBooking,
  getGuideBookings,
  acceptBooking,
  declineBooking,
} from '../controllers/guideStoreBookingController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes (no auth)
router.get('/public/:slug', getStoreBySlug);
router.get('/public/:slug/tours', getStoreToursBySlug);
router.post('/public/:slug/tours/:tourId/book', createBooking);

// Guide-protected routes (auth + role: guide)
router.get('/settings', authMiddleware, requireRole('guide'), getMyStore);
router.put('/settings', authMiddleware, requireRole('guide'), upsertStoreSettings);
router.post('/publish', authMiddleware, requireRole('guide'), publishStore);
router.get('/bookings', authMiddleware, requireRole('guide'), getGuideBookings);
router.put('/bookings/:id/accept', authMiddleware, requireRole('guide'), acceptBooking);
router.put('/bookings/:id/decline', authMiddleware, requireRole('guide'), declineBooking);

export default router;

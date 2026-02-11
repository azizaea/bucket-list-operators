import { Router } from 'express';
import {
  registerGuide,
  loginGuide,
  refreshGuideToken,
  getGuideProfile,
  updateGuideProfile,
  uploadLicensePhoto,
  getGuideById,
  listGuides,
  getGuideAvailability,
  createItinerary,
  getGuideItineraries,
  updateItinerary,
  deleteItinerary,
} from '../controllers/guideController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// ============ PUBLIC (no auth) ============
router.post('/register', registerGuide);
router.post('/login', loginGuide);
router.post('/refresh', refreshGuideToken);

// ============ GUIDE PROTECTED (role: guide) ============
router.get('/profile', authMiddleware, requireRole('guide'), getGuideProfile);
router.put('/profile', authMiddleware, requireRole('guide'), updateGuideProfile);
router.post('/license-photo', authMiddleware, requireRole('guide'), uploadLicensePhoto);

// Itineraries (guide only)
router.post('/itineraries', authMiddleware, requireRole('guide'), createItinerary);
router.get('/itineraries', authMiddleware, requireRole('guide'), getGuideItineraries);
router.put('/itineraries/:id', authMiddleware, requireRole('guide'), updateItinerary);
router.delete('/itineraries/:id', authMiddleware, requireRole('guide'), deleteItinerary);

// ============ OPERATOR PROTECTED (role: admin, staff, agent) ============
router.get(
  '/',
  authMiddleware,
  requireRole('admin', 'staff', 'agent'),
  listGuides
);
router.get(
  '/:id',
  authMiddleware,
  requireRole('admin', 'staff', 'agent'),
  getGuideById
);
router.get(
  '/:id/availability',
  authMiddleware,
  requireRole('admin', 'staff', 'agent'),
  getGuideAvailability
);

export default router;

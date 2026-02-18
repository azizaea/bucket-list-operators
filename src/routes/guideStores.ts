import { Router } from 'express';
import {
  getStoreBySlug,
  getStoreToursBySlug,
  getMyStore,
  upsertStoreSettings,
  publishStore,
} from '../controllers/guideStoreController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes (no auth)
router.get('/public/:slug', getStoreBySlug);
router.get('/public/:slug/tours', getStoreToursBySlug);

// Guide-protected routes (auth + role: guide)
router.get('/settings', authMiddleware, requireRole('guide'), getMyStore);
router.put('/settings', authMiddleware, requireRole('guide'), upsertStoreSettings);
router.post('/publish', authMiddleware, requireRole('guide'), publishStore);

export default router;

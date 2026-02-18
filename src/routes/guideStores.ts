import { Router } from 'express';
import {
  getStoreBySlug,
  getMyStore,
  upsertStoreSettings,
  publishStore,
} from '../controllers/guideStoreController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Public route (no auth)
router.get('/public/:slug', getStoreBySlug);

// Guide-protected routes (auth + role: guide)
router.get('/settings', authMiddleware, requireRole('guide'), getMyStore);
router.put('/settings', authMiddleware, requireRole('guide'), upsertStoreSettings);
router.post('/publish', authMiddleware, requireRole('guide'), publishStore);

export default router;

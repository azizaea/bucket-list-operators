import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
// All dashboard routes require authentication
router.use(authMiddleware);
/**
 * GET /api/dashboard
 * Get operator dashboard statistics
 * Returns: key metrics, upcoming tours, recent bookings, top sellers, monthly trend
 */
router.get('/', getDashboardStats);
export default router;

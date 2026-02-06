import { Router } from 'express';
import { register, login, refreshToken, me } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register new operator account
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', login);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', refreshToken);

/**
 * GET /api/auth/me
 * Get current user info (protected route)
 */
router.get('/me', authMiddleware, me);

export default router;

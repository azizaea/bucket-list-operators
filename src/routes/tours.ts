import { Router } from 'express';
import {
  createTour,
  getTours,
  getTour,
  updateTour,
  deleteTour,
} from '../controllers/tourController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All tour routes require authentication
router.use(authMiddleware);

/**
 * POST /api/tours
 * Create a new tour
 */
router.post('/', createTour);

/**
 * GET /api/tours
 * Get all tours for current operator
 * Query params: page, limit, isActive, category
 */
router.get('/', getTours);

/**
 * GET /api/tours/:id
 * Get single tour by ID
 */
router.get('/:id', getTour);

/**
 * PUT /api/tours/:id
 * Update tour
 */
router.put('/:id', updateTour);

/**
 * DELETE /api/tours/:id
 * Archive tour (soft delete)
 */
router.delete('/:id', deleteTour);

export default router;

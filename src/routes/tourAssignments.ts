import { Router } from 'express';
import {
  createAssignment,
  getAssignments,
  acceptAssignment,
  declineAssignment,
  completeAssignment,
  cancelAssignment,
} from '../controllers/tourAssignmentController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// Operator: create assignment
router.post('/', requireRole('admin', 'staff', 'agent'), createAssignment);

// Both operator and guide: list assignments
router.get('/', getAssignments);

// Guide: accept/decline
router.put('/:id/accept', requireRole('guide'), acceptAssignment);
router.put('/:id/decline', requireRole('guide'), declineAssignment);

// Operator or guide: complete
router.put('/:id/complete', requireRole('admin', 'staff', 'agent', 'guide'), completeAssignment);

// Cancel (operator or guide, pending only)
router.delete('/:id', cancelAssignment);

export default router;

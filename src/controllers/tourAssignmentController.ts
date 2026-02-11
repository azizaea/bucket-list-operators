import { Response } from 'express';
import { PrismaClient, TourGuideAssignmentStatus } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

const VALID_STATUSES: TourGuideAssignmentStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED'];

/**
 * POST /api/tour-assignments - Operator requests guide for tour
 */
export async function createAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;
    if (!operatorId) {
      res.status(401).json({ success: false, error: 'Operator authentication required' });
      return;
    }

    const { tourId, guideId, tourDate, payRate, notes } = req.body;

    if (!tourId || !guideId || !tourDate) {
      res.status(400).json({
        success: false,
        error: 'tourId, guideId, and tourDate are required',
      });
      return;
    }

    const tour = await prisma.tour.findFirst({
      where: { id: tourId, operatorId },
    });
    if (!tour) {
      res.status(404).json({ success: false, error: 'Tour not found' });
      return;
    }

    const guide = await prisma.guide.findFirst({
      where: {
        id: guideId,
        isActive: true,
        OR: [{ operatorId }, { operatorId: null }],
      },
    });
    if (!guide) {
      res.status(404).json({ success: false, error: 'Guide not found' });
      return;
    }

    const assignment = await prisma.tourGuideAssignment.create({
      data: {
        tourId,
        guideId,
        operatorId,
        tourDate: new Date(tourDate),
        payRate: payRate != null ? payRate : null,
        notes: notes ?? null,
        status: 'PENDING',
      },
      include: {
        tour: true,
        guide: true,
      },
    });

    res.status(201).json({
      success: true,
      data: { assignment },
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
}

/**
 * GET /api/tour-assignments - Get assignments (filtered by guide or operator)
 */
export async function getAssignments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;
    const guideId = req.user?.guideId;

    const where: { operatorId?: string; guideId?: string; status?: TourGuideAssignmentStatus } = {};

    if (operatorId) {
      where.operatorId = operatorId;
    } else if (guideId) {
      where.guideId = guideId;
    } else {
      res.status(401).json({
        success: false,
        error: 'Operator or guide authentication required',
      });
      return;
    }

    const statusParam = req.query.status;
    const statusStr = Array.isArray(statusParam) ? statusParam[0] : statusParam;
    if (statusStr && VALID_STATUSES.includes(statusStr as TourGuideAssignmentStatus)) {
      where.status = statusStr as TourGuideAssignmentStatus;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      prisma.tourGuideAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { assignedAt: 'desc' },
        include: {
          tour: true,
          guide: true,
          operator: { select: { companyNameEn: true } },
        },
      }),
      prisma.tourGuideAssignment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ success: false, error: 'Failed to get assignments' });
  }
}

/**
 * PUT /api/tour-assignments/:id/accept - Guide accepts assignment
 */
export async function acceptAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const guideId = req.user?.guideId;
    if (!guideId) {
      res.status(401).json({ success: false, error: 'Guide authentication required' });
      return;
    }

    const assignmentId = String(req.params.id || '');

    const assignment = await prisma.tourGuideAssignment.findFirst({
      where: { id: assignmentId, guideId },
    });

    if (!assignment) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: 'Assignment can only be accepted when pending',
      });
      return;
    }

    const updated = await prisma.tourGuideAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
      include: { tour: true, guide: true },
    });

    res.json({
      success: true,
      data: { assignment: updated },
    });
  } catch (error) {
    console.error('Accept assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept assignment' });
  }
}

/**
 * PUT /api/tour-assignments/:id/decline - Guide declines assignment
 */
export async function declineAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const guideId = req.user?.guideId;
    if (!guideId) {
      res.status(401).json({ success: false, error: 'Guide authentication required' });
      return;
    }

    const assignmentId = String(req.params.id || '');

    const assignment = await prisma.tourGuideAssignment.findFirst({
      where: { id: assignmentId, guideId },
    });

    if (!assignment) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: 'Assignment can only be declined when pending',
      });
      return;
    }

    const updated = await prisma.tourGuideAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
      },
      include: { tour: true, guide: true },
    });

    res.json({
      success: true,
      data: { assignment: updated },
    });
  } catch (error) {
    console.error('Decline assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to decline assignment' });
  }
}

/**
 * PUT /api/tour-assignments/:id/complete - Mark tour completed (operator or guide)
 */
export async function completeAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;
    const guideId = req.user?.guideId;

    if (!operatorId && !guideId) {
      res.status(401).json({
        success: false,
        error: 'Operator or guide authentication required',
      });
      return;
    }

    const assignmentId = String(req.params.id || '');

    const whereClause: { id: string; operatorId?: string; guideId?: string } = { id: assignmentId };
    if (operatorId) whereClause.operatorId = operatorId;
    if (guideId) whereClause.guideId = guideId;

    const assignment = await prisma.tourGuideAssignment.findFirst({
      where: whereClause,
    });

    if (!assignment) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'ACCEPTED') {
      res.status(400).json({
        success: false,
        error: 'Assignment must be accepted before marking complete',
      });
      return;
    }

    const updated = await prisma.tourGuideAssignment.update({
      where: { id: assignmentId },
      data: { status: 'COMPLETED' },
      include: { tour: true, guide: true },
    });

    res.json({
      success: true,
      data: { assignment: updated },
    });
  } catch (error) {
    console.error('Complete assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete assignment' });
  }
}

/**
 * DELETE /api/tour-assignments/:id - Cancel assignment (operator only when pending; guide can decline via PUT)
 */
export async function cancelAssignment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;
    const guideId = req.user?.guideId;

    if (!operatorId && !guideId) {
      res.status(401).json({
        success: false,
        error: 'Operator or guide authentication required',
      });
      return;
    }

    const assignmentId = String(req.params.id || '');

    const whereClause: { id: string; operatorId?: string; guideId?: string } = { id: assignmentId };
    if (operatorId) whereClause.operatorId = operatorId;
    if (guideId) whereClause.guideId = guideId;

    const assignment = await prisma.tourGuideAssignment.findFirst({
      where: whereClause,
    });

    if (!assignment) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: 'Only pending assignments can be cancelled',
      });
      return;
    }

    await prisma.tourGuideAssignment.delete({
      where: { id: assignmentId },
    });

    res.json({
      success: true,
      message: 'Assignment cancelled',
    });
  } catch (error) {
    console.error('Cancel assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel assignment' });
  }
}

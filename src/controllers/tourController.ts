import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

/**
 * Create a new tour
 */
export async function createTour(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;

    if (!operatorId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const {
      titleEn,
      titleAr,
      descriptionEn,
      descriptionAr,
      durationHours,
      maxCapacity,
      basePriceSar,
      category,
    } = req.body;

    // Validate required fields
    if (!titleEn || !durationHours || !maxCapacity || !basePriceSar) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: titleEn, durationHours, maxCapacity, basePriceSar',
      });
      return;
    }

    // Create tour (Prisma uses camelCase; schema has no highlights/inclusions/exclusions)
    const tour = await prisma.tour.create({
      data: {
        operatorId,
        titleEn,
        titleAr: titleAr || titleEn,
        descriptionEn: descriptionEn ?? null,
        descriptionAr: descriptionAr ?? null,
        durationHours,
        maxCapacity,
        basePriceSar,
        category: category || 'cultural',
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: { tour },
    });
  } catch (error) {
    console.error('Create tour error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tour',
    });
  }
}

/**
 * Get all tours for current operator
 */
export async function getTours(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;

    if (!operatorId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const isActive = req.query.isActive === 'true' ? true :
                     req.query.isActive === 'false' ? false :
                     undefined;

    const category = req.query.category as string;

    // Build where clause
    const where: { operatorId: string; isActive?: boolean; category?: string } = {
      operatorId,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (category) {
      where.category = category;
    }

    // Get tours with pagination
    const [tours, total] = await Promise.all([
      prisma.tour.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.tour.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tours,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get tours error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tours',
    });
  }
}

/**
 * Get single tour by ID
 */
export async function getTour(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;
    const tourId = req.params.id;

    if (!operatorId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const tour = await prisma.tour.findFirst({
      where: {
        id: tourId,
        operatorId, // Security: only return if belongs to operator
      },
    });

    if (!tour) {
      res.status(404).json({
        success: false,
        error: 'Tour not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { tour },
    });
  } catch (error) {
    console.error('Get tour error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tour',
    });
  }
}

/**
 * Update tour
 */
export async function updateTour(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;
    const tourId = req.params.id;

    if (!operatorId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    // Check if tour exists and belongs to operator
    const existingTour = await prisma.tour.findFirst({
      where: {
        id: tourId,
        operatorId,
      },
    });

    if (!existingTour) {
      res.status(404).json({
        success: false,
        error: 'Tour not found',
      });
      return;
    }

    const {
      titleEn,
      titleAr,
      descriptionEn,
      descriptionAr,
      durationHours,
      maxCapacity,
      basePriceSar,
      category,
      isActive,
    } = req.body;

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};

    if (titleEn !== undefined) updateData.titleEn = titleEn;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (durationHours !== undefined) updateData.durationHours = durationHours;
    if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity;
    if (basePriceSar !== undefined) updateData.basePriceSar = basePriceSar;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update tour
    const tour = await prisma.tour.update({
      where: { id: tourId },
      data: updateData,
    });

    res.json({
      success: true,
      data: { tour },
    });
  } catch (error) {
    console.error('Update tour error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tour',
    });
  }
}

/**
 * Delete (archive) tour
 */
export async function deleteTour(req: AuthRequest, res: Response): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;
    const tourId = req.params.id;

    if (!operatorId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    // Check if tour exists and belongs to operator
    const existingTour = await prisma.tour.findFirst({
      where: {
        id: tourId,
        operatorId,
      },
    });

    if (!existingTour) {
      res.status(404).json({
        success: false,
        error: 'Tour not found',
      });
      return;
    }

    // Soft delete: just mark as inactive
    await prisma.tour.update({
      where: { id: tourId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Tour archived successfully',
    });
  } catch (error) {
    console.error('Delete tour error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tour',
    });
  }
}

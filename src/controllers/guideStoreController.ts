import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

/**
 * GET /api/guide-stores/public/:slug - PUBLIC, no auth required
 * Get store by slug for public storefront
 */
export async function getStoreBySlug(req: Request, res: Response): Promise<void> {
  try {
    const slug = req.params.slug as string;

    const guide = await prisma.guide.findFirst({
      where: { storeSlug: slug },
      select: {
        id: true,
        fullName: true,
        storeSlug: true,
        bio: true,
        languages: true,
        specialties: true,
        location: true,
        rating: true,
        profilePictureUrl: true,
        storeSettings: true,
      },
    });

    if (!guide) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }

    const { storeSettings, ...guideData } = guide;
    res.json({
      success: true,
      data: {
        guide: {
          ...guideData,
          rating: guideData.rating != null ? Number(guideData.rating) : null,
        },
        store: storeSettings,
      },
    });
  } catch (error) {
    console.error('Get store by slug error:', error);
    res.status(500).json({ success: false, error: 'Failed to get store' });
  }
}

/**
 * Get published tours for a guide (by guideId)
 * Used internally - e.g. for GET /public/:slug/tours
 */
export async function getStoreTours(guideId: string) {
  const itineraries = await prisma.guideItinerary.findMany({
    where: {
      guideId,
      isPublished: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      maxGuests: true,
      estimatedDuration: true,
      coverImage: true,
      itineraryDays: true,
      includes: true,
      excludes: true,
    },
  });

  return itineraries.map((it) => ({
    id: it.id,
    title: it.title,
    price: it.price != null ? Number(it.price) : null,
    currency: it.currency ?? null,
    maxGuests: it.maxGuests ?? null,
    duration: it.estimatedDuration ?? null,
    coverImage: it.coverImage ?? null,
    itineraryDays: it.itineraryDays ?? null,
    includes: it.includes ?? [],
    excludes: it.excludes ?? [],
  }));
}

/**
 * GET /api/guide-stores/public/:slug/tours - PUBLIC, no auth required
 * Get published tours for a store by slug
 */
export async function getStoreToursBySlug(req: Request, res: Response): Promise<void> {
  try {
    const slug = req.params.slug as string;

    const guide = await prisma.guide.findFirst({
      where: { storeSlug: slug },
      select: { id: true },
    });

    if (!guide) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }

    const tours = await getStoreTours(guide.id);

    res.json({
      success: true,
      data: { tours },
    });
  } catch (error) {
    console.error('Get store tours error:', error);
    res.status(500).json({ success: false, error: 'Failed to get store tours' });
  }
}

/**
 * GET /api/guide-stores/settings - AUTHENTICATED (guide only)
 * Get the authenticated guide's StoreSettings
 */
export async function getMyStore(req: AuthRequest, res: Response): Promise<void> {
  try {
    const guideId = req.user?.guideId;
    if (!guideId) {
      res.status(401).json({ success: false, error: 'Not authenticated as guide' });
      return;
    }

    const store = await prisma.storeSettings.findUnique({
      where: { guideId },
    });

    res.json({
      success: true,
      data: { store },
    });
  } catch (error) {
    console.error('Get my store error:', error);
    res.status(500).json({ success: false, error: 'Failed to get store settings' });
  }
}

/**
 * PUT /api/guide-stores/settings - AUTHENTICATED (guide only)
 * Upsert StoreSettings for the authenticated guide
 */
export async function upsertStoreSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const guideId = req.user?.guideId;
    if (!guideId) {
      res.status(401).json({ success: false, error: 'Not authenticated as guide' });
      return;
    }

    const {
      storeName,
      logoUrl,
      primaryColor,
      heroImageUrl,
      aboutText,
      tourSelection,
    } = req.body;

    const store = await prisma.storeSettings.upsert({
      where: { guideId },
      create: {
        guideId,
        storeName: storeName ?? null,
        logoUrl: logoUrl ?? null,
        primaryColor: primaryColor ?? null,
        heroImageUrl: heroImageUrl ?? null,
        aboutText: aboutText ?? null,
        tourSelection: tourSelection ?? 'ALL',
      },
      update: {
        ...(storeName !== undefined && { storeName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(heroImageUrl !== undefined && { heroImageUrl }),
        ...(aboutText !== undefined && { aboutText }),
        ...(tourSelection !== undefined && { tourSelection }),
      },
    });

    res.json({
      success: true,
      data: { store },
    });
  } catch (error) {
    console.error('Upsert store settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update store settings' });
  }
}

/**
 * POST /api/guide-stores/publish - AUTHENTICATED (guide only)
 * Toggle publishedAt: set to now if null, or null if already set
 */
export async function publishStore(req: AuthRequest, res: Response): Promise<void> {
  try {
    const guideId = req.user?.guideId;
    if (!guideId) {
      res.status(401).json({ success: false, error: 'Not authenticated as guide' });
      return;
    }

    const existing = await prisma.storeSettings.findUnique({
      where: { guideId },
    });

    const newPublishedAt = existing?.publishedAt ? null : new Date();

    const store = await prisma.storeSettings.upsert({
      where: { guideId },
      create: {
        guideId,
        publishedAt: newPublishedAt,
      },
      update: { publishedAt: newPublishedAt },
    });

    res.json({
      success: true,
      data: { store },
    });
  } catch (error) {
    console.error('Publish store error:', error);
    res.status(500).json({ success: false, error: 'Failed to publish store' });
  }
}

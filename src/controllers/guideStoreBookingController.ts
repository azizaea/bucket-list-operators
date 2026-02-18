import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { sendGuideStoreBookingNotification } from '../utils/smtpEmail.js';

const prisma = new PrismaClient();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/guide-stores/public/:slug/tours/:tourId/book - PUBLIC, no auth required
 * Create a guide store booking
 */
export async function createBooking(req: Request, res: Response): Promise<void> {
  try {
    const slug = req.params.slug as string;
    const tourId = req.params.tourId as string;
    const {
      fullName,
      email,
      phone,
      tourDate,
      guests,
      nationality,
      passportNumber,
      countryOfResidence,
      emergencyContactName,
      emergencyContactPhone,
      foodAllergies,
      medicalConditions,
    } = req.body;

    // Validate required fields
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      res.status(400).json({ success: false, error: 'fullName is required' });
      return;
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'email is required' });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ success: false, error: 'Invalid email format' });
      return;
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      res.status(400).json({ success: false, error: 'phone is required' });
      return;
    }
    if (!tourDate) {
      res.status(400).json({ success: false, error: 'tourDate is required' });
      return;
    }
    const parsedDate = new Date(tourDate);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid tourDate format' });
      return;
    }
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      res.status(400).json({ success: false, error: 'guests must be a positive integer' });
      return;
    }

    // Find guide by store slug
    const guide = await prisma.guide.findFirst({
      where: { storeSlug: slug },
      select: { id: true, email: true },
    });
    if (!guide) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }

    // Find tour and verify it belongs to guide
    const tour = await prisma.guideItinerary.findFirst({
      where: { id: tourId, guideId: guide.id, isPublished: true },
      select: { id: true, title: true, price: true, currency: true, maxGuests: true },
    });
    if (!tour) {
      res.status(404).json({ success: false, error: 'Tour not found or not available' });
      return;
    }

    if (tour.maxGuests != null && guestCount > tour.maxGuests) {
      res.status(400).json({
        success: false,
        error: `Maximum ${tour.maxGuests} guests allowed for this tour`,
      });
      return;
    }

    const price = tour.price != null ? Number(tour.price) : 0;
    const totalPrice = price * guestCount;
    const currency = tour.currency ?? 'SAR';

    const booking = await prisma.guideStoreBooking.create({
      data: {
        guideId: guide.id,
        tourId: tour.id,
        status: 'pending',
        tourDate: parsedDate,
        guests: guestCount,
        totalPrice: new Decimal(totalPrice),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        nationality: nationality?.trim() || null,
        passportNumber: passportNumber?.trim() || null,
        countryOfResidence: countryOfResidence?.trim() || null,
        emergencyContactName: emergencyContactName?.trim() || null,
        emergencyContactPhone: emergencyContactPhone?.trim() || null,
        foodAllergies: foodAllergies?.trim() || null,
        medicalConditions: medicalConditions?.trim() || null,
      },
      include: {
        tour: { select: { title: true } },
      },
    });

    // Send email notification to guide (non-blocking)
    sendGuideStoreBookingNotification({
      guideEmail: guide.email,
      tourName: tour.title,
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      tourDate: parsedDate,
      guests: guestCount,
      totalPrice,
      currency,
      foodAllergies: booking.foodAllergies,
      medicalConditions: booking.medicalConditions,
      nationality: booking.nationality,
      passportNumber: booking.passportNumber,
      countryOfResidence: booking.countryOfResidence,
      emergencyContactName: booking.emergencyContactName,
      emergencyContactPhone: booking.emergencyContactPhone,
    }).catch((err) => console.error('Guide notification email failed:', err));

    res.status(201).json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          status: booking.status,
          tourDate: booking.tourDate.toISOString(),
          guests: booking.guests,
          totalPrice: Number(booking.totalPrice),
          tour: { title: booking.tour.title },
        },
      },
    });
  } catch (error) {
    console.error('Create guide store booking error:', error);
    res.status(500).json({ success: false, error: 'Failed to create booking' });
  }
}

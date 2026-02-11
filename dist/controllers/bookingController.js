import { PrismaClient } from '@prisma/client';
import { sendBookingConfirmation, sendOperatorNotification } from '../utils/email.js';
const prisma = new PrismaClient();
/**
 * Create a tour schedule (departure time)
 */
export async function createSchedule(req, res) {
    try {
        const operatorId = req.user?.operatorId;
        const tourId = req.params.tourId;
        if (!operatorId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }
        // Verify tour belongs to operator
        const tour = await prisma.tour.findFirst({
            where: {
                id: tourId,
                operatorId,
            },
        });
        if (!tour) {
            res.status(404).json({
                success: false,
                error: 'Tour not found',
            });
            return;
        }
        const { departureDatetime, priceOverride } = req.body;
        if (!departureDatetime) {
            res.status(400).json({
                success: false,
                error: 'departureDatetime is required',
            });
            return;
        }
        // Create schedule with full capacity available (schema status: available, full, cancelled)
        const schedule = await prisma.tourSchedule.create({
            data: {
                tourId,
                departureDatetime: new Date(departureDatetime),
                availableSpots: tour.maxCapacity,
                priceOverride: priceOverride ?? null,
                status: 'available',
            },
        });
        res.status(201).json({
            success: true,
            data: { schedule },
        });
    }
    catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create schedule',
        });
    }
}
/**
 * Get schedules for a tour
 */
export async function getSchedules(req, res) {
    try {
        const operatorId = req.user?.operatorId;
        const tourId = req.params.tourId;
        if (!operatorId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }
        // Verify tour belongs to operator
        const tour = await prisma.tour.findFirst({
            where: {
                id: tourId,
                operatorId,
            },
        });
        if (!tour) {
            res.status(404).json({
                success: false,
                error: 'Tour not found',
            });
            return;
        }
        const schedules = await prisma.tourSchedule.findMany({
            where: {
                tourId,
            },
            orderBy: {
                departureDatetime: 'asc',
            },
        });
        res.json({
            success: true,
            data: { schedules },
        });
    }
    catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get schedules',
        });
    }
}
/**
 * Create a booking (with transaction to prevent double-booking)
 */
export async function createBooking(req, res) {
    try {
        const operatorId = req.user?.operatorId;
        const scheduleId = req.body.scheduleId;
        if (!operatorId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }
        const { customerName, customerEmail, customerPhone, numGuests, guests, bookingNotes, } = req.body;
        // Validate required fields
        if (!scheduleId || !customerName || !customerEmail || !numGuests) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: scheduleId, customerName, customerEmail, numGuests',
            });
            return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
            res.status(400).json({
                success: false,
                error: 'Invalid email format',
            });
            return;
        }
        // Use transaction to prevent race conditions
        const booking = await prisma.$transaction(async (tx) => {
            const schedule = await tx.tourSchedule.findUnique({
                where: { id: scheduleId },
                include: {
                    tour: {
                        include: {
                            operator: {
                                include: {
                                    users: {
                                        where: { role: 'admin' },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (!schedule) {
                throw new Error('Schedule not found');
            }
            // Verify schedule belongs to operator's tour
            if (schedule.tour.operatorId !== operatorId) {
                throw new Error('Unauthorized');
            }
            // Check availability
            if (schedule.availableSpots < numGuests) {
                throw new Error(`Only ${schedule.availableSpots} spots available`);
            }
            // Calculate total price
            const pricePerPerson = schedule.priceOverride ?? schedule.tour.basePriceSar;
            const totalPrice = Number(pricePerPerson) * numGuests;
            // Generate booking reference
            const bookingReference = `BKG-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
            // Create booking
            const newBooking = await tx.booking.create({
                data: {
                    scheduleId,
                    customerName,
                    customerEmail,
                    customerPhone: customerPhone ?? '',
                    numGuests,
                    totalPriceSar: totalPrice,
                    bookingStatus: 'pending',
                    paymentStatus: 'unpaid',
                    bookingReference,
                    bookingNotes: bookingNotes ?? null,
                },
            });
            // Create guest records if provided
            if (guests && Array.isArray(guests)) {
                await tx.bookingGuest.createMany({
                    data: guests.map((guest) => ({
                        bookingId: newBooking.id,
                        guestName: guest.name,
                        guestAge: guest.age ?? null,
                        guestNationality: guest.nationality ?? null,
                    })),
                });
            }
            // Update available spots
            await tx.tourSchedule.update({
                where: { id: scheduleId },
                data: {
                    availableSpots: schedule.availableSpots - numGuests,
                },
            });
            return { newBooking, schedule };
        });
        // Fetch complete booking with guests
        const completeBooking = await prisma.booking.findUnique({
            where: { id: booking.newBooking.id },
            include: {
                guests: true,
                schedule: {
                    include: {
                        tour: true,
                    },
                },
            },
        });
        // Send emails asynchronously (don't wait for them)
        Promise.all([
            sendBookingConfirmation({
                customerEmail,
                customerName,
                bookingReference: booking.newBooking.bookingReference,
                tourName: booking.schedule.tour.titleEn,
                tourNameAr: booking.schedule.tour.titleAr ?? '',
                departureDate: booking.schedule.departureDatetime,
                numGuests,
                totalPrice: Number(booking.newBooking.totalPriceSar),
                meetingPoint: booking.schedule.tour.meetingPoint ?? undefined,
                meetingPointInstructions: booking.schedule.tour.meetingPointInstructions ?? undefined,
            }),
            sendOperatorNotification({
                operatorEmail: booking.schedule.tour.operator.users[0]?.email ?? 'operator@bucketlist.sa',
                operatorName: booking.schedule.tour.operator.companyNameEn,
                bookingReference: booking.newBooking.bookingReference,
                tourName: booking.schedule.tour.titleEn,
                customerName,
                customerEmail,
                customerPhone: customerPhone ?? 'Not provided',
                departureDate: booking.schedule.departureDatetime,
                numGuests,
                totalPrice: Number(booking.newBooking.totalPriceSar),
            }),
        ]).catch((err) => {
            console.error('Failed to send booking emails:', err);
        });
        res.status(201).json({
            success: true,
            data: { booking: completeBooking },
        });
    }
    catch (error) {
        console.error('Create booking error:', error);
        if (error instanceof Error) {
            if (error.message.includes('spots available')) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            if (error.message === 'Unauthorized') {
                res.status(403).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            if (error.message === 'Schedule not found') {
                res.status(404).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            if (error.message === 'Invalid email format') {
                res.status(400).json({
                    success: false,
                    error: 'Invalid email format',
                });
                return;
            }
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create booking',
        });
    }
}
/**
 * Get all bookings for operator
 */
export async function getBookings(req, res) {
    try {
        const operatorId = req.user?.operatorId;
        if (!operatorId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const bookingStatus = req.query.bookingStatus;
        const paymentStatus = req.query.paymentStatus;
        const where = {
            schedule: {
                tour: {
                    operatorId,
                },
            },
        };
        if (bookingStatus)
            where.bookingStatus = bookingStatus;
        if (paymentStatus)
            where.paymentStatus = paymentStatus;
        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    schedule: {
                        include: {
                            tour: true,
                        },
                    },
                    guests: true,
                },
            }),
            prisma.booking.count({ where }),
        ]);
        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    }
    catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get bookings',
        });
    }
}
/**
 * Get single booking details
 */
export async function getBooking(req, res) {
    try {
        const operatorId = req.user?.operatorId;
        const bookingId = req.params.id;
        if (!operatorId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }
        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                schedule: {
                    tour: {
                        operatorId,
                    },
                },
            },
            include: {
                schedule: {
                    include: {
                        tour: true,
                    },
                },
                guests: true,
                payment: true,
            },
        });
        if (!booking) {
            res.status(404).json({
                success: false,
                error: 'Booking not found',
            });
            return;
        }
        res.json({
            success: true,
            data: { booking },
        });
    }
    catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get booking',
        });
    }
}

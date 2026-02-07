import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

/**
 * Get operator dashboard statistics
 */
export async function getDashboardStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;

    if (!operatorId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const allBookings = await prisma.booking.findMany({
      where: {
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
      },
    });

    const thisMonthBookings = allBookings.filter(
      (b) =>
        b.createdAt >= startOfMonth &&
        b.createdAt <= endOfMonth
    );

    const totalBookings = allBookings.length;
    const totalBookingsThisMonth = thisMonthBookings.length;
    const totalGuests = allBookings.reduce((sum, b) => sum + b.numGuests, 0);
    const totalGuestsThisMonth = thisMonthBookings.reduce(
      (sum, b) => sum + b.numGuests,
      0
    );

    const totalRevenue = allBookings.reduce(
      (sum, b) => sum + Number(b.totalPriceSar),
      0
    );
    const totalRevenueThisMonth = thisMonthBookings.reduce(
      (sum, b) => sum + Number(b.totalPriceSar),
      0
    );

    const paidRevenue = allBookings
      .filter((b) => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + Number(b.totalPriceSar), 0);

    const unpaidRevenue = allBookings
      .filter((b) => b.paymentStatus === 'unpaid')
      .reduce((sum, b) => sum + Number(b.totalPriceSar), 0);

    const confirmedBookings = allBookings.filter(
      (b) => b.bookingStatus === 'confirmed'
    ).length;

    const pendingBookings = allBookings.filter(
      (b) => b.bookingStatus === 'pending'
    ).length;

    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + 7);

    // Schema status: available, full, cancelled (no "scheduled")
    const upcomingSchedules = await prisma.tourSchedule.findMany({
      where: {
        tour: {
          operatorId,
        },
        departureDatetime: {
          gte: new Date(),
          lte: upcomingDate,
        },
        status: {
          in: ['available', 'full'],
        },
      },
      include: {
        tour: true,
        bookings: true,
      },
      orderBy: {
        departureDatetime: 'asc',
      },
      take: 10,
    });

    const upcomingTours = upcomingSchedules.map((schedule) => ({
      scheduleId: schedule.id,
      tourName: schedule.tour.titleEn,
      tourNameAr: schedule.tour.titleAr,
      departureDate: schedule.departureDatetime,
      availableSpots: schedule.availableSpots,
      totalBookings: schedule.bookings.length,
      totalGuests: schedule.bookings.reduce((sum, b) => sum + b.numGuests, 0),
    }));

    const recentBookings = await prisma.booking.findMany({
      where: {
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const recentBookingsData = recentBookings.map((booking) => ({
      id: booking.id,
      bookingReference: booking.bookingReference,
      customerName: booking.customerName,
      tourName: booking.schedule.tour.titleEn,
      numGuests: booking.numGuests,
      totalPrice: Number(booking.totalPriceSar),
      status: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      departureDate: booking.schedule.departureDatetime,
    }));

    interface TourStats {
      tourId: string;
      tourName: string;
      tourNameAr: string;
      bookings: number;
      guests: number;
      revenue: number;
    }

    const tourBookingCounts: Record<string, TourStats> = {};
    allBookings.forEach((booking) => {
      const tourId = booking.schedule.tourId;
      if (!tourBookingCounts[tourId]) {
        tourBookingCounts[tourId] = {
          tourId,
          tourName: booking.schedule.tour.titleEn,
          tourNameAr: booking.schedule.tour.titleAr,
          bookings: 0,
          guests: 0,
          revenue: 0,
        };
      }
      tourBookingCounts[tourId].bookings += 1;
      tourBookingCounts[tourId].guests += booking.numGuests;
      tourBookingCounts[tourId].revenue += Number(booking.totalPriceSar);
    });

    const topSellingTours = Object.values(tourBookingCounts)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const monthBookings = allBookings.filter(
        (b) => b.createdAt >= monthStart && b.createdAt <= monthEnd
      );

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        bookings: monthBookings.length,
        guests: monthBookings.reduce((sum, b) => sum + b.numGuests, 0),
        revenue: monthBookings.reduce(
          (sum, b) => sum + Number(b.totalPriceSar),
          0
        ),
      });
    }

    res.json({
      success: true,
      data: {
        metrics: {
          totalBookings,
          totalBookingsThisMonth,
          totalGuests,
          totalGuestsThisMonth,
          totalRevenue,
          totalRevenueThisMonth,
          paidRevenue,
          unpaidRevenue,
          confirmedBookings,
          pendingBookings,
        },
        upcomingTours,
        recentBookings: recentBookingsData,
        topSellingTours,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard stats',
    });
  }
}

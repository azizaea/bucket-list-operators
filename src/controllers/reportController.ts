import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

/**
 * Generate monthly bookings report
 */
export async function generateMonthlyBookingsReport(
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

    const { year, month } = req.query;

    if (!year || !month) {
      res.status(400).json({
        success: false,
        error: 'Year and month are required (e.g., ?year=2026&month=3)',
      });
      return;
    }

    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

    const bookings = await prisma.booking.findMany({
      where: {
        schedule: {
          tour: {
            operatorId,
          },
          departureDatetime: {
            gte: startDate,
            lte: endDate,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const reportData = bookings.map((booking) => ({
      bookingReference: booking.bookingReference,
      tourName: booking.schedule.tour.titleEn,
      tourNameAr: booking.schedule.tour.titleAr,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      numGuests: booking.numGuests,
      totalPriceSar: Number(booking.totalPriceSar),
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      departureDate: booking.schedule.departureDatetime,
      createdAt: booking.createdAt,
      guests: booking.guests.map((g) => ({
        name: g.guestName,
        age: g.guestAge,
        nationality: g.guestNationality,
      })),
    }));

    const summary = {
      totalBookings: bookings.length,
      totalGuests: bookings.reduce((sum, b) => sum + b.numGuests, 0),
      totalRevenue: bookings.reduce((sum, b) => sum + Number(b.totalPriceSar), 0),
      paidRevenue: bookings
        .filter((b) => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + Number(b.totalPriceSar), 0),
      confirmedBookings: bookings.filter((b) => b.bookingStatus === 'confirmed').length,
      pendingBookings: bookings.filter((b) => b.bookingStatus === 'pending').length,
    };

    res.json({
      success: true,
      data: {
        period: {
          year: parseInt(year as string),
          month: parseInt(month as string),
          startDate,
          endDate,
        },
        summary,
        bookings: reportData,
      },
    });
  } catch (error) {
    console.error('Generate monthly report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
    });
  }
}

/**
 * Generate revenue report
 */
export async function generateRevenueReport(
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

    const { year, month } = req.query;

    if (!year || !month) {
      res.status(400).json({
        success: false,
        error: 'Year and month are required',
      });
      return;
    }

    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

    const bookings = await prisma.booking.findMany({
      where: {
        schedule: {
          tour: {
            operatorId,
          },
          departureDatetime: {
            gte: startDate,
            lte: endDate,
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

    interface TourRevenue {
      tourId: string;
      tourName: string;
      bookings: number;
      guests: number;
      revenue: number;
      paidRevenue: number;
    }

    const revenueByTour: Record<string, TourRevenue> = {};
    bookings.forEach((booking) => {
      const tourId = booking.schedule.tourId;
      const tourName = booking.schedule.tour.titleEn;

      if (!revenueByTour[tourId]) {
        revenueByTour[tourId] = {
          tourId,
          tourName,
          bookings: 0,
          guests: 0,
          revenue: 0,
          paidRevenue: 0,
        };
      }

      revenueByTour[tourId].bookings += 1;
      revenueByTour[tourId].guests += booking.numGuests;
      revenueByTour[tourId].revenue += Number(booking.totalPriceSar);

      if (booking.paymentStatus === 'paid') {
        revenueByTour[tourId].paidRevenue += Number(booking.totalPriceSar);
      }
    });

    const tourBreakdown = Object.values(revenueByTour);

    const summary = {
      totalBookings: bookings.length,
      totalGuests: bookings.reduce((sum, b) => sum + b.numGuests, 0),
      totalRevenue: bookings.reduce((sum, b) => sum + Number(b.totalPriceSar), 0),
      paidRevenue: bookings
        .filter((b) => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + Number(b.totalPriceSar), 0),
      unpaidRevenue: bookings
        .filter((b) => b.paymentStatus === 'unpaid')
        .reduce((sum, b) => sum + Number(b.totalPriceSar), 0),
    };

    res.json({
      success: true,
      data: {
        period: {
          year: parseInt(year as string),
          month: parseInt(month as string),
        },
        summary,
        tourBreakdown,
      },
    });
  } catch (error) {
    console.error('Generate revenue report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
    });
  }
}

/**
 * Generate guest demographics report
 */
export async function generateDemographicsReport(
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

    const { year, month } = req.query;

    if (!year || !month) {
      res.status(400).json({
        success: false,
        error: 'Year and month are required',
      });
      return;
    }

    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

    const guests = await prisma.bookingGuest.findMany({
      where: {
        booking: {
          schedule: {
            tour: {
              operatorId,
            },
            departureDatetime: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    const totalGuests = guests.length;

    const nationalityCounts: Record<string, number> = {};
    guests.forEach((guest) => {
      const nationality = guest.guestNationality || 'Unknown';
      nationalityCounts[nationality] = (nationalityCounts[nationality] || 0) + 1;
    });

    const nationalityBreakdown = Object.entries(nationalityCounts)
      .map(([nationality, count]) => ({
        nationality,
        count,
        percentage: totalGuests > 0 ? ((count / totalGuests) * 100).toFixed(2) : '0.00',
      }))
      .sort((a, b) => b.count - a.count);

    const ageRanges: Record<string, number> = {
      '0-12': 0,
      '13-17': 0,
      '18-30': 0,
      '31-50': 0,
      '51+': 0,
      Unknown: 0,
    };

    guests.forEach((guest) => {
      const age = guest.guestAge;
      if (age == null) {
        ageRanges['Unknown'] += 1;
      } else if (age <= 12) {
        ageRanges['0-12'] += 1;
      } else if (age <= 17) {
        ageRanges['13-17'] += 1;
      } else if (age <= 30) {
        ageRanges['18-30'] += 1;
      } else if (age <= 50) {
        ageRanges['31-50'] += 1;
      } else {
        ageRanges['51+'] += 1;
      }
    });

    const ageBreakdown = Object.entries(ageRanges).map(([range, count]) => ({
      ageRange: range,
      count,
      percentage: totalGuests > 0 ? ((count / totalGuests) * 100).toFixed(2) : '0.00',
    }));

    res.json({
      success: true,
      data: {
        period: {
          year: parseInt(year as string),
          month: parseInt(month as string),
        },
        summary: {
          totalGuests,
        },
        nationalityBreakdown,
        ageBreakdown,
      },
    });
  } catch (error) {
    console.error('Generate demographics report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
    });
  }
}

/**
 * Export report as CSV
 */
export async function exportReportCSV(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const operatorId = req.user?.operatorId;
    const { reportType, year, month } = req.query;

    if (!operatorId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (!reportType || !year || !month) {
      res.status(400).json({
        success: false,
        error: 'reportType, year, and month are required',
      });
      return;
    }

    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

    let csvContent = '';

    if (reportType === 'bookings') {
      const bookings = await prisma.booking.findMany({
        where: {
          schedule: {
            tour: {
              operatorId,
            },
            departureDatetime: {
              gte: startDate,
              lte: endDate,
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

      csvContent = 'Booking Reference,Tour Name,Customer Name,Email,Phone,Guests,Total (SAR),Status,Payment Status,Departure Date\n';

      bookings.forEach((booking) => {
        const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
        csvContent += `${booking.bookingReference},${booking.schedule.tour.titleEn},${escapeCsv(booking.customerName)},${booking.customerEmail},${booking.customerPhone},${booking.numGuests},${booking.totalPriceSar},${booking.bookingStatus},${booking.paymentStatus},${booking.schedule.departureDatetime.toISOString()}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ministry-report-${reportType}-${year}-${month}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export report',
    });
  }
}

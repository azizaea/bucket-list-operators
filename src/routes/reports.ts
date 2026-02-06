import { Router } from 'express';
import {
  generateMonthlyBookingsReport,
  generateRevenueReport,
  generateDemographicsReport,
  exportReportCSV,
} from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All report routes require authentication
router.use(authMiddleware);

/**
 * GET /api/reports/monthly-bookings
 * Generate monthly bookings report
 * Query params: year, month (e.g., ?year=2026&month=3)
 */
router.get('/monthly-bookings', generateMonthlyBookingsReport);

/**
 * GET /api/reports/revenue
 * Generate revenue report
 * Query params: year, month
 */
router.get('/revenue', generateRevenueReport);

/**
 * GET /api/reports/demographics
 * Generate guest demographics report
 * Query params: year, month
 */
router.get('/demographics', generateDemographicsReport);

/**
 * GET /api/reports/export-csv
 * Export report as CSV file
 * Query params: reportType (bookings/revenue/demographics), year, month
 */
router.get('/export-csv', exportReportCSV);

export default router;

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import tourRoutes from './routes/tours.js';
import bookingRoutes from './routes/bookings.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// API Info Route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Bucket List - Operators API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      tours: '/api/tours',
      bookings: '/api/bookings',
      reports: '/api/reports',
      dashboard: '/api/dashboard',
    },
  });
});

// Health Check Route
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Bucket List - Operators API running on http://localhost:${PORT}`);
  console.log(`📊 Database: Connected to PostgreSQL`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📍 Available Endpoints:`);
  console.log(`\n   AUTH:`);
  console.log(`   - POST   /api/auth/register`);
  console.log(`   - POST   /api/auth/login`);
  console.log(`   - POST   /api/auth/refresh`);
  console.log(`   - GET    /api/auth/me`);
  console.log(`\n   TOURS:`);
  console.log(`   - POST   /api/tours`);
  console.log(`   - GET    /api/tours`);
  console.log(`   - GET    /api/tours/:id`);
  console.log(`   - PUT    /api/tours/:id`);
  console.log(`   - DELETE /api/tours/:id`);
  console.log(`\n   BOOKINGS:`);
  console.log(`   - POST   /api/bookings/schedules/:tourId`);
  console.log(`   - GET    /api/bookings/schedules/:tourId`);
  console.log(`   - POST   /api/bookings`);
  console.log(`   - GET    /api/bookings`);
  console.log(`   - GET    /api/bookings/:id`);
  console.log(`\n   MINISTRY REPORTS:`);
  console.log(`   - GET    /api/reports/monthly-bookings?year=2026&month=3`);
  console.log(`   - GET    /api/reports/revenue?year=2026&month=3`);
  console.log(`   - GET    /api/reports/demographics?year=2026&month=3`);
  console.log(`   - GET    /api/reports/export-csv?reportType=bookings&year=2026&month=3`);
  console.log(`\n   DASHBOARD:`);
  console.log(`   - GET    /api/dashboard\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

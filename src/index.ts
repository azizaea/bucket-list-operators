import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Bucket List - Operators API',
    status: 'running',
    version: '1.0.0'
  });
});

// Health check route (test database connection)
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bucket List - Operators API running on http://localhost:${PORT}`);
  console.log(`📊 Database: Connected to PostgreSQL`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

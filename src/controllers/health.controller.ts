import { Request, Response } from 'express';
import prisma from '../config/prisma.config';

const startTime = Date.now();

export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    const uptime = Date.now() - startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Application is healthy',
      uptime: {
        milliseconds: uptime,
        seconds: uptimeSeconds,
        minutes: uptimeMinutes,
        hours: uptimeHours,
        formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
      },
      database: {
        status: 'connected',
        type: 'PostgreSQL'
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp_unix: Math.floor(Date.now() / 1000)
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Application health check failed',
      error: error.message,
      database: {
        status: 'disconnected',
        type: 'PostgreSQL'
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp_unix: Math.floor(Date.now() / 1000)
    });
  }
};

export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Check if application is ready to accept requests
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Application is ready to accept requests',
      checks: {
        database: 'ok',
        api: 'ok'
      }
    });
  } catch (error: any) {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      message: 'Application is not ready',
      error: error.message,
      checks: {
        database: 'failed',
        api: 'ok'
      }
    });
  }
};

export const livenessCheck = async (req: Request, res: Response) => {
  // Simple liveness check - just return 200 if server is running
  return res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    message: 'Application process is alive',
    pid: process.pid
  });
};

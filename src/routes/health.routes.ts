import { Router, Request, Response } from 'express';

export function createHealthRoutes(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  return router;
}
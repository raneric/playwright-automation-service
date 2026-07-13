import { Router, Request, Response } from "express";
import { logger } from "../utils/logger";

/**
 * Create a simple POST route that:
 * 1. Reads `req.body.data`
 * 2. Calls `handler(data)`
 * 3. Returns `{ success: true, data: result }` on 201, or an error on 500
 */
export function createPostRoute<T>(
  label: string,
  handler: (data: T) => Promise<unknown>,
): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    try {
      const data = req.body.data as T;
      logger.info(`Received ${label} request`);

      const result = await handler(data);

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      logger.error(`Failed to process ${label}`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}

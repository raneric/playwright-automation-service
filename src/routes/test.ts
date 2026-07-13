import { Router, Request, Response } from "express";
import { logger } from "../utils/logger";

export const testRouter = Router();

testRouter.get("/", (_req: Request, res: Response) => {
  logger.info("called get");
  res.json({ message: "called get" });
});

testRouter.post("/", async (_req: Request, res: Response) => {
  logger.info("called post");
  const result = await _req.body.data;
  console.log(result);
  res.json({ message: "called post" });
});

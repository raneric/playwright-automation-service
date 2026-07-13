import express from "express";
import { claimRouter } from "./routes/claim";
import { orderRouter } from "./routes/order";
import { testRouter } from "./routes/test";
import { logger } from "./utils/logger";
import { searchRouter } from "./routes/search";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use("/api/claim", claimRouter);
app.use("/api/order", orderRouter);
app.use("/api/search", searchRouter);
app.use("/api/test", testRouter);

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

export default app;

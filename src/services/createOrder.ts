import { login, LoginCredentials } from "./login";
import { closeBrowser, gotoWithRetry } from "./browser";
import { FormFiller } from "./FormFiller";
import { purchaseOrderConfig } from "../config/purchaseOrder";
import { Order } from "../models/order";
import { logger } from "../utils/logger";
import { FAKE_UI_BASE_URL, PagePath } from "../utils/const";

const filler = new FormFiller(purchaseOrderConfig);

export async function createOrder(
  order: Order,
  credentials: LoginCredentials,
): Promise<{ orderId: string }> {
  const { context, page } = await login(credentials);

  try {
    logger.info("Navigating to purchase order form...");
    await gotoWithRetry(page, `${FAKE_UI_BASE_URL}${PagePath.purchaseOrder}`);

    // Wait for the form to render
    await page.waitForSelector('[data-testid="po-form"]', { timeout: 10000 });

    logger.info("Filling purchase order form...");
    await filler.fill(page, order as unknown as Record<string, unknown>);

    const orderId = await filler.submit(page);

    logger.info(`Order created successfully: ${orderId}`);
    return { orderId };
  } finally {
    await context.close();
    await closeBrowser();
  }
}
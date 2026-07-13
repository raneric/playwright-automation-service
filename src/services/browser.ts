import { chromium, Browser, BrowserContext, Page } from "playwright";
import { logger } from "../utils/logger";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    logger.info("Launching browser...");
    browser = await chromium.launch({
      headless: false,
    });
  }
  return browser;
}

export async function newContext(): Promise<BrowserContext> {
  const b = await getBrowser();
  return b.newContext();
}

export async function newPage(context: BrowserContext): Promise<Page> {
  return context.newPage();
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    logger.info("Closing browser...");
    await browser.close();
    browser = null;
  }
}

/**
 * Navigate to a URL with retry logic.
 * Retries up to `maxRetries` times if the page is not reachable,
 * then closes the browser and throws on final failure.
 */
export async function gotoWithRetry(
  page: Page,
  url: string,
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(
        `Navigating to ${url} (attempt ${attempt}/${maxRetries})...`,
      );
      await page.goto(url, { timeout: 15000, waitUntil: "domcontentloaded" });
      return; // success
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Navigation attempt ${attempt} failed: ${message}`);

      if (attempt === maxRetries) {
        logger.error(
          `All ${maxRetries} navigation attempts to ${url} failed. Closing browser.`,
        );
        await closeBrowser();
        throw new Error(
          `Failed to reach ${url} after ${maxRetries} attempts: ${message}`,
        );
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
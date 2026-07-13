import { BrowserContext, Page } from "playwright";
import { newContext, newPage, closeBrowser, gotoWithRetry } from "./browser";
import { logger } from "../utils/logger";

export interface LoginCredentials {
  username: string;
  password: string;
  loginUrl: string;
}

export async function login(
  credentials: LoginCredentials,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await newContext();
  const page = await newPage(context);

  logger.info(`Navigating to login page: ${credentials.loginUrl}`);
  await gotoWithRetry(page, credentials.loginUrl);

  await page.fill('[data-testid="login-username"]', credentials.username);
  await page.fill('[data-testid="login-password"]', credentials.password);
  await page.click('[data-testid="login-submit-btn"]');

  // Wait for either the error element to appear (login failed) or the
  // page to navigate away (login succeeded). Using waitForSelector
  // avoids the race between networkidle and React re-renders.
  try {
    await page.waitForSelector('[data-testid="login-error"]', {
      timeout: 5000,
    });
    const errorMsg = await page.textContent('[data-testid="login-error"]');
    throw new Error(
      `Login failed: ${errorMsg?.trim() || "Invalid credentials"}`,
    );
  } catch (err) {
    // Re-throw our own login-failure error
    if (err instanceof Error && err.message.startsWith("Login failed")) {
      await context.close();
      await closeBrowser();
      throw err;
    }
    // Timeout means no error appeared → login succeeded
  }

  await page.waitForLoadState("networkidle");
  logger.info("Login successful");

  return { context, page };
}

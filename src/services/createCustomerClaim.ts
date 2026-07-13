import { login, LoginCredentials } from "./login";
import { closeBrowser, gotoWithRetry } from "./browser";
import { FormFiller } from "./FormFiller";
import { customerClaimConfig } from "../config/customerClaim";
import { CustomerClaim } from "../models/customerClaim";
import { logger } from "../utils/logger";
import { FAKE_UI_BASE_URL, PagePath } from "../utils/const";

const filler = new FormFiller(customerClaimConfig);

export async function createCustomerClaim(
  claim: CustomerClaim,
  credentials: LoginCredentials,
): Promise<{ claimId: string }> {
  const { context, page } = await login(credentials);

  try {
    logger.info("Navigating to customer claim form...");
    await gotoWithRetry(page, `${FAKE_UI_BASE_URL}${PagePath.customerClaim}`);

    // Wait for the form to render
    await page.waitForSelector('[data-testid="cc-form"]', { timeout: 10000 });

    logger.info("Filling customer claim form...");
    await filler.fill(page, claim as unknown as Record<string, unknown>);
    await filler.fillItems(
      page,
      claim.items as unknown as Record<string, unknown>[],
    );

    const claimId = await filler.submit(page);

    logger.info(`Customer claim created successfully: ${claimId}`);
    return { claimId };
  } finally {
    await context.close();
    await closeBrowser();
  }
}
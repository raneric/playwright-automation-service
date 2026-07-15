import { Page } from 'playwright';
import { Logger } from '../../shared/logger';
import { PlatformConfig } from '../config';
import { LoginPage } from './pages/LoginPage';
import { FormPage } from './pages/FormPage';
import { OrderListPage } from './pages/OrderListPage';
import { customerClaimConfig, purchaseOrderConfig } from '../config/form';
import { gotoWithRetry } from './utils/retry';
import { PagePath } from '../../shared/constants';
import { Result } from '../../shared/Result';
import {
  IClaimAutomationPort,
  IOrderAutomationPort,
  ISearchAutomationPort,
} from '../../core/ports';
import { ProductResult } from '../../core/domain/entities';

/**
 * Playwright adapter implementing the Claim automation port.
 */
export class PlaywrightClaimAutomation implements IClaimAutomationPort {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger
  ) {}

  async createClaim(
    page: Page,
    claimData: Record<string, unknown>
  ): Promise<Result<string>> {
    try {
      const formPage = new FormPage(page, this.logger, customerClaimConfig);

      await gotoWithRetry(
        page,
        `${this.platform.baseUrl}${PagePath.customerClaim}`,
        this.logger
      );
      await formPage.waitForForm();

      this.logger.info('Filling customer claim form');
      await formPage.fillFields(claimData);

      if (claimData.items && Array.isArray(claimData.items)) {
        await formPage.fillItems(claimData.items as Record<string, unknown>[]);
      }

      const claimId = await formPage.submit();
      this.logger.info({ claimId }, 'Claim created successfully');

      return Result.ok(claimId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Result.fail(new Error(message));
    }
  }
}

/**
 * Playwright adapter implementing the Order automation port.
 */
export class PlaywrightOrderAutomation implements IOrderAutomationPort {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger
  ) {}

  async createOrder(
    page: Page,
    orderData: Record<string, unknown>
  ): Promise<Result<string>> {
    try {
      const formPage = new FormPage(page, this.logger, purchaseOrderConfig);

      await gotoWithRetry(
        page,
        `${this.platform.baseUrl}${PagePath.purchaseOrder}`,
        this.logger
      );
      await formPage.waitForForm();

      this.logger.info('Filling purchase order form');
      await formPage.fillFields(orderData);

      const orderId = await formPage.submit();
      this.logger.info({ orderId }, 'Order created successfully');

      return Result.ok(orderId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Result.fail(new Error(message));
    }
  }
}

/**
 * Playwright adapter implementing the Search automation port.
 */
export class PlaywrightSearchAutomation implements ISearchAutomationPort {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger
  ) {}

  async searchProducts(
    page: Page,
    customer: string,
    productNames: string[]
  ): Promise<Result<ProductResult[]>> {
    try {
      const listPage = new OrderListPage(page, this.logger);

      await gotoWithRetry(
        page,
        `${this.platform.baseUrl}${PagePath.purchaseOrderList}`,
        this.logger
      );
      await listPage.waitForTable();

      const allResults: ProductResult[] = [];

      for (const term of productNames) {
        this.logger.info({ term }, 'Searching');
        await listPage.clearSearch();
        await listPage.search(term);

        if (await listPage.hasNoResults()) {
          this.logger.info({ term }, 'No results');
          continue;
        }

        // Extract results from the current page and all subsequent pages
        let pageNum = 1;
        do {
          this.logger.info({ term, page: pageNum }, 'Extracting products');
          const products = await listPage.extractProducts();
          allResults.push(...products);

          if (await listPage.hasNextPage()) {
            await listPage.clickNext();
            pageNum++;
          } else {
            break;
          }
        } while (true);
      }

      this.logger.info({ count: allResults.length }, 'Search complete');
      return Result.ok(allResults);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Result.fail(new Error(message));
    }
  }
}

/**
 * Login workflow using the LoginPage POM.
 * Called by the BrowserManager or a dedicated login use case.
 */
export class PlaywrightLoginWorkflow {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger
  ) {}

  async login(page: Page): Promise<void> {
    const loginPage = new LoginPage(page, this.logger);

    await gotoWithRetry(page, this.platform.loginUrl, this.logger);

    await loginPage.login(this.platform.username, this.platform.password);
  }
}

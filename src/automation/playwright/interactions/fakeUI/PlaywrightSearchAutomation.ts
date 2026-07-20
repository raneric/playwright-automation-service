import { Page } from 'playwright';
import { ISearchAutomationPort } from '../../../../core/ports';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { Result } from '../../../../shared/Result';
import { ProductResult } from '../../../../core/domain/entities';
import { OrderListPage } from '../../pages';
import { gotoWithRetry } from '../../utils';
import { PagePath } from '../../../../shared/constants';

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
    values: string[]
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

      for (const term of values) {
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

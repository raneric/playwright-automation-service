import {
  IAutomationContext,
  ISearchAutomationPort,
} from '../../../../core/ports';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { TableConfig } from '../../../config/table/types';
import { Result } from '../../../../shared/Result';
import { ProductResult } from '../../../../core/domain/entities';
import { TablePage } from '../../pages';
import { PlaywrightAutomationContext } from '../../PlaywrightAutomationContext';
import { gotoWithRetry } from '../../utils';

/**
 * Playwright adapter implementing the Search automation port.
 *
 * Uses the generic TablePage with an injected TableConfig — no hardcoded
 * selectors or field names. Different SaaS platforms can provide different
 * table configs without code changes.
 */
export class PlaywrightSearchAutomation implements ISearchAutomationPort {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly tableConfig: TableConfig,
    private readonly logger: Logger
  ) {}

  async searchProducts(
    ctx: IAutomationContext,
    customer: string,
    productNames: string[]
  ): Promise<Result<ProductResult[]>> {
    try {
      const page = (ctx as PlaywrightAutomationContext).getPage();
      const tablePage = new TablePage(page, this.logger, this.tableConfig);

      await gotoWithRetry(
        page,
        `${this.platform.baseUrl}${this.platform.pages.purchaseOrderList}`,
        this.logger
      );
      await tablePage.waitForTable();

      const allResults: ProductResult[] = [];

      for (const term of productNames) {
        this.logger.info({ term }, 'Searching');
        await tablePage.clearSearch();
        await tablePage.search(term);

        if (await tablePage.hasNoResults()) {
          this.logger.info({ term }, 'No results');
          continue;
        }

        // Extract results from the current page and all subsequent pages
        let pageNum = 1;
        do {
          this.logger.info({ term, page: pageNum }, 'Extracting products');
          const rows = await tablePage.extractRows();
          const products = rows.map(mapRowToProductResult);
          allResults.push(...products);

          if (await tablePage.hasNextPage()) {
            await tablePage.clickNext();
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
 * Map a generic table row (Record<string, string>) to a ProductResult entity.
 * The keys come from the TableConfig.columns definition.
 */
function mapRowToProductResult(row: Record<string, string>): ProductResult {
  return {
    itemCode: row.itemCode ?? '',
    productName: row.productName ?? '',
    vendor: row.vendor ?? '',
    customerName: row.customerName ?? '',
    orderCode: row.orderCode ?? '',
    orderDate: row.orderDate ?? '',
    existsInSystem: true,
  };
}

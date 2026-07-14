import { Page } from 'playwright';
import { Logger } from '../../logger';
import { BasePage } from './BasePage';
import { ProductResult } from '../../../domain/entities';
import { DEFAULT_TIMEOUTS } from '../../../shared/constants';

/**
 * Page Object for the Purchase Order List page.
 * Encapsulates search and data extraction from the order table.
 */
export class OrderListPage extends BasePage {
  constructor(page: Page, logger: Logger) {
    super(page, logger);
  }

  async waitForTable(): Promise<void> {
    await this.waitForReady('[data-testid="po-list-table"]');
  }

  /**
   * Clear a previous search result.
   * Waits for the table to settle rather than using a fixed timeout.
   */
  async clearSearch(): Promise<void> {
    const clearBtn = await this.page.$('[data-testid="po-list-search-clear"]');
    if (clearBtn) {
      await clearBtn.click();
      // Wait for the table to re-render in its cleared state
      await this.page.waitForSelector('[data-testid="po-list-table"]', {
        state: 'visible',
        timeout: DEFAULT_TIMEOUTS.selector,
      });
    }
  }

  /**
   * Type a search term and wait for the table to finish updating.
   * Avoids fixed timeouts by watching for the loading indicator to appear
   * then disappear, falling back to a stable table re-render.
   */
  async search(term: string): Promise<void> {
    await this.page.fill('[data-testid="po-list-search"]', term);
    // Use data-testid selector — consistent with the rest of the codebase
    await this.clickByTestId('po-list-search-btn');

    // Wait for loading to start (may be brief or absent on fast connections)
    const loadingStarted = await this.page
      .waitForSelector('[data-testid="po-list-loading"]', {
        state: 'visible',
        timeout: 500,
      })
      .then(() => true)
      .catch(() => false);

    if (loadingStarted) {
      // Wait for loading to finish
      await this.page.waitForSelector('[data-testid="po-list-loading"]', {
        state: 'hidden',
        timeout: DEFAULT_TIMEOUTS.selector,
      });
    } else {
      // No loading indicator — wait for the table to be visible and stable
      await this.page.waitForSelector('[data-testid="po-list-table"]', {
        state: 'visible',
        timeout: DEFAULT_TIMEOUTS.selector,
      });
    }
  }

  /** Check if the "no results" indicator is visible */
  async hasNoResults(): Promise<boolean> {
    return (await this.page.$('[data-testid="po-list-empty"]')) !== null;
  }

  /**
   * Extract all visible product rows from the table in a single browser
   * evaluation — avoids N+1 round-trips for large tables.
   */
  async extractProducts(): Promise<ProductResult[]> {
    return this.page.$$eval('tr[data-testid^="po-list-row-"]', (rows) =>
      rows
        .map((row) => {
          const testId = row.getAttribute('data-testid') ?? '';
          const index = testId.replace('po-list-row-', '');
          const get = (field: string): string =>
            row
              .querySelector(`[data-testid="po-list-row-${index}-${field}"]`)
              ?.textContent?.trim() ?? '';

          return {
            itemCode: get('item-code'),
            productName: get('product'),
            vendor: get('vendor'),
            customerName: get('customer'),
            orderCode: get('order-code'),
            existsInSystem: true,
          };
        })
        .filter((r) => r.itemCode !== '' || r.productName !== ''),
    );
  }
}

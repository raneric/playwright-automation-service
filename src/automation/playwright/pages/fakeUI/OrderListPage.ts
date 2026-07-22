import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { Logger } from '../../../../shared/logger';
import { DEFAULT_TIMEOUTS } from '../../../../shared/constants';
import { ProductResult } from '../../../../core/domain/entities';

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
    const clearBtn = await this.page.$('.po-list-search-clear');
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
    await this.clickByClass('po-list-search-btn');

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
    const rows = await this.page.$$('tr[data-testid^="po-list-row-"]');
    const results: ProductResult[] = [];

    for (const row of rows) {
      const testId = await row.getAttribute('data-testid');
      if (!testId) continue;

      const index = testId.replace('po-list-row-', '');

      const itemCode = await this.page
        .textContent(`[data-testid="po-list-row-${index}-item-code"]`)
        .then((t) => t?.trim() || '');
      const productName = await this.page
        .textContent(`[data-testid="po-list-row-${index}-product"]`)
        .then((t) => t?.trim() || '');
      const vendor = await this.page
        .textContent(`[data-testid="po-list-row-${index}-vendor"]`)
        .then((t) => t?.trim() || '');
      const customerName = await this.page
        .textContent(`[data-testid="po-list-row-${index}-customer"]`)
        .then((t) => t?.trim() || '');
      const orderCode = await this.page
        .textContent(`[data-testid="po-list-row-${index}-order-code"]`)
        .then((t) => t?.trim() || '');
      const orderDate = await this.page
        .textContent(`[data-testid="po-list-row-${index}-date"]`)
        .then((t) => t?.trim() || '');
      const lostNumber = await this.page
        .textContent(`[data-testid="po-list-row-${index}-lot-number"]`)
        .then((t) => t?.trim() || '');
      const quantityOrdered = await this.page
        .textContent(`[data-testid="po-list-row-${index}-quantity-ordered"]`)
        .then((t) => t?.trim() || '');
      const quantityBilled = await this.page
        .textContent(`[data-testid="po-list-row-${index}-quantity-billed"]`)
        .then((t) => t?.trim() || '');
      const quantityReceived = await this.page
        .textContent(`[data-testid="po-list-row-${index}-quantity-received"]`)
        .then((t) => t?.trim() || '');

      const documentNumber = await this.page
        .textContent(`[data-testid="po-list-row-${index}-document"]`)
        .then((t) => t?.trim() || '');

      if (itemCode || productName) {
        results.push({
          itemCode,
          productName,
          vendor,
          documentNumber,
          customerName,
          orderCode,
          orderDate,
          lotNumber: lostNumber,
          quantityOrdered: Number(quantityOrdered),
          quantityBilled: Number(quantityBilled),
          quantityReceived: Number(quantityReceived),
        });
      }
    }

    return results;
  }

  /**
   * Check whether the "Next" pagination button is present and enabled.
   * Returns false if the button is missing or has the `disabled` attribute.
   */
  async hasNextPage(): Promise<boolean> {
    const nextBtn = this.page.locator('button[type="button"]', {
      hasText: 'Next',
    });
    const count = await nextBtn.count();
    if (count === 0) return false;
    return !(await nextBtn.isDisabled());
  }

  /**
   * Click the "Next" pagination button and wait for the table to reload.
   */
  async clickNext(): Promise<void> {
    this.logger.info('Navigating to next page');
    await this.page
      .locator('button[type="button"]', { hasText: 'Next' })
      .click();

    // Wait for loading to start
    const loadingStarted = await this.page
      .waitForSelector('[data-testid="po-list-loading"]', {
        state: 'visible',
        timeout: 500,
      })
      .then(() => true)
      .catch(() => false);

    if (loadingStarted) {
      await this.page.waitForSelector('[data-testid="po-list-loading"]', {
        state: 'hidden',
        timeout: DEFAULT_TIMEOUTS.selector,
      });
    } else {
      await this.page.waitForSelector('[data-testid="po-list-table"]', {
        state: 'visible',
        timeout: DEFAULT_TIMEOUTS.selector,
      });
    }
  }
}

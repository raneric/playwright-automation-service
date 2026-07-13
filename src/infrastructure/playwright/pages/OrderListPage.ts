import { Page } from 'playwright';
import { Logger } from '../../logger';
import { BasePage } from './BasePage';
import { ProductResult } from '../../../domain/entities';

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

  /** Clear the search input */
  async clearSearch(): Promise<void> {
    const clearBtn = await this.page.$('[data-testid="po-list-search-clear"]');
    if (clearBtn) {
      await clearBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  /** Type a search term and click the search button */
  async search(term: string): Promise<void> {
    await this.page.fill('[data-testid="po-list-search"]', term);
    await this.page.click('.po-list-search-btn');
    await this.page.waitForTimeout(800);
  }

  /** Check if the "no results" or "loading" indicator is visible */
  async hasNoResults(): Promise<boolean> {
    const empty = await this.page.$('[data-testid="po-list-empty"]');
    const loading = await this.page.$('[data-testid="po-list-loading"]');
    return empty !== null || loading !== null;
  }

  /** Extract all visible product rows from the table */
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

      if (itemCode || productName) {
        results.push({
          itemCode,
          productName,
          vendor,
          customerName,
          orderCode,
          existsInSystem: true,
        });
      }
    }

    return results;
  }
}
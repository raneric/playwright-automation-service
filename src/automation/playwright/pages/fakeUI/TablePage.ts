import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { Logger } from '../../../../shared/logger';
import { DEFAULT_TIMEOUTS } from '../../../../shared/constants';
import { TableConfig } from '../../../config/table/types';

/**
 * Generic Page Object for any table/list page.
 *
 * Uses a declarative TableConfig to perform search, pagination, and data
 * extraction — no hardcoded selectors or field names.
 *
 * This is the table equivalent of FormPage: configuration-driven,
 * SaaS-agnostic, and reusable across platforms.
 */
export class TablePage extends BasePage {
  private readonly config: TableConfig;

  constructor(page: Page, logger: Logger, config: TableConfig) {
    super(page, logger);
    this.config = config;
  }

  /** Wait for the table container to be visible */
  async waitForTable(): Promise<void> {
    await this.waitForReady(`[data-testid="${this.config.tableTestId}"]`);
  }

  /**
   * Clear a previous search result if a clear button exists.
   */
  async clearSearch(): Promise<void> {
    if (!this.config.clearSearchTestId) return;

    const clearBtn = await this.page.$(
      `[data-testid="${this.config.clearSearchTestId}"]`
    );
    if (clearBtn) {
      await clearBtn.click();
      await this.waitForTableStable();
    }
  }

  /**
   * Type a search term and wait for the table to finish updating.
   */
  async search(term: string): Promise<void> {
    await this.page.fill(
      `[data-testid="${this.config.searchInputTestId}"]`,
      term
    );

    if (this.config.searchButtonTestId) {
      await this.clickByTestId(this.config.searchButtonTestId);
    } else {
      // Press Enter if no explicit search button
      await this.page.press(
        `[data-testid="${this.config.searchInputTestId}"]`,
        'Enter'
      );
    }

    await this.waitForLoadComplete();
  }

  /** Check if the "no results" indicator is visible */
  async hasNoResults(): Promise<boolean> {
    if (!this.config.emptyStateTestId) return false;
    return (
      (await this.page.$(`[data-testid="${this.config.emptyStateTestId}"]`)) !==
      null
    );
  }

  /**
   * Extract all visible rows from the table.
   * Returns an array of records keyed by the column names defined in TableConfig.
   */
  async extractRows(): Promise<Record<string, string>[]> {
    const rows = await this.page.$$(this.config.rowSelector);
    const results: Record<string, string>[] = [];

    for (const row of rows) {
      const testId = await row.getAttribute('data-testid');
      if (!testId) continue;

      // Extract the row index from the testId (e.g., "po-list-row-3" → "3")
      const index = testId.replace(`${this.config.prefix}-row-`, '');

      const record: Record<string, string> = {};

      for (const [fieldName, selectorSuffix] of Object.entries(
        this.config.columns
      )) {
        const cellSelector = `[data-testid="${this.config.prefix}-row-${index}-${selectorSuffix}"]`;
        const text = await this.page
          .textContent(cellSelector)
          .then((t) => t?.trim() || '');
        record[fieldName] = text;
      }

      // Only include rows that have at least some data
      if (Object.values(record).some((v) => v.length > 0)) {
        results.push(record);
      }
    }

    return results;
  }

  /**
   * Check whether the "Next" pagination button is present and enabled.
   */
  async hasNextPage(): Promise<boolean> {
    if (!this.config.pagination) return false;

    const nextBtn = this.page.locator(
      this.config.pagination.nextButtonSelector,
      { hasText: 'Next' }
    );
    const count = await nextBtn.count();
    if (count === 0) return false;

    if (this.config.pagination.disabledCheck === 'attribute') {
      return !(await nextBtn.isDisabled());
    }

    return true;
  }

  /**
   * Click the "Next" pagination button and wait for the table to reload.
   */
  async clickNext(): Promise<void> {
    if (!this.config.pagination) return;

    this.logger.info('Navigating to next page');
    await this.page
      .locator(this.config.pagination.nextButtonSelector, {
        hasText: 'Next',
      })
      .click();

    await this.waitForLoadComplete();
  }

  // ── Private helpers ──────────────────────────────────────────

  private async waitForTableStable(): Promise<void> {
    await this.page.waitForSelector(
      `[data-testid="${this.config.tableTestId}"]`,
      { state: 'visible', timeout: DEFAULT_TIMEOUTS.selector }
    );
  }

  private async waitForLoadComplete(): Promise<void> {
    if (!this.config.loadingIndicatorTestId) {
      await this.waitForTableStable();
      return;
    }

    // Wait for loading to start (may be brief or absent)
    const loadingStarted = await this.page
      .waitForSelector(
        `[data-testid="${this.config.loadingIndicatorTestId}"]`,
        { state: 'visible', timeout: 500 }
      )
      .then(() => true)
      .catch(() => false);

    if (loadingStarted) {
      await this.page.waitForSelector(
        `[data-testid="${this.config.loadingIndicatorTestId}"]`,
        { state: 'hidden', timeout: DEFAULT_TIMEOUTS.selector }
      );
    } else {
      await this.waitForTableStable();
    }
  }
}

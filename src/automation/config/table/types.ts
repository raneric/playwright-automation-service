/**
 * Configuration for a data table / list page.
 *
 * Mirrors the FormConfig pattern: a declarative description of a table
 * that the generic TablePage can render and extract without hardcoded
 * selectors or field names.
 */
export interface TableConfig {
  /** data-testid prefix for all elements on this table page */
  prefix: string;

  /** Selector for the table container element */
  tableTestId: string;

  /** Selector for the search input */
  searchInputTestId: string;

  /** Selector for the search button (optional — may use Enter key) */
  searchButtonTestId?: string;

  /** Selector for the loading indicator */
  loadingIndicatorTestId?: string;

  /** Selector for the empty-state / no-results indicator */
  emptyStateTestId?: string;

  /** Selector for the "clear search" button (optional) */
  clearSearchTestId?: string;

  /** Selector for individual data rows */
  rowSelector: string;

  /**
   * Column definitions.
   * Keys are the output field names; values are the data-testid segments
   * that follow the row prefix.
   *
   * Example:
   *   columns: { itemCode: 'item-code', productName: 'product' }
   *   → reads [data-testid="po-list-row-0-item-code"]
   */
  columns: Record<string, string>;

  /** Pagination configuration */
  pagination?: {
    /** Selector for the "Next" button */
    nextButtonSelector: string;
    /** How to detect if the button is disabled */
    disabledCheck?: 'attribute' | 'class';
  };
}

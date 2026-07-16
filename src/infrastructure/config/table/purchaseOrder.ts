import { TableConfig } from './types';

/**
 * Default purchase order list table configuration.
 *
 * When the plugin architecture is implemented, each SaaS plugin will
 * provide its own table configs. For now, this serves as the default.
 */
export const purchaseOrderTableConfig: TableConfig = {
  prefix: 'po-list',
  tableTestId: 'po-list-table',
  searchInputTestId: 'po-list-search',
  searchButtonTestId: 'po-list-search-btn',
  loadingIndicatorTestId: 'po-list-loading',
  emptyStateTestId: 'po-list-empty',
  clearSearchTestId: 'po-list-search-clear',
  rowSelector: 'tr[data-testid^="po-list-row-"]',
  columns: {
    itemCode: 'item-code',
    productName: 'product',
    vendor: 'vendor',
    customerName: 'customer',
    orderCode: 'order-code',
    orderDate: 'date',
  },
  pagination: {
    nextButtonSelector: 'button[type="button"]',
    disabledCheck: 'attribute',
  },
};

/**
 * Centralized selectors for the Purchase Order List page.
 */
export const OrderListSelectors = {
  table: 'po-list-table',
  search: 'po-list-search',
  searchBtn: 'po-list-search-btn',
  searchClear: 'po-list-search-clear',
  loading: 'po-list-loading',
  empty: 'po-list-empty',
  row: 'po-list-row',
  /** Field suffixes for each column in the table */
  fields: {
    itemCode: 'item-code',
    productName: 'product',
    vendor: 'vendor',
    customerName: 'customer',
    orderCode: 'order-code',
    orderDate: 'date',
    lotNumber: 'lot-number',
    quantityOrdered: 'quantity-ordered',
    quantityBilled: 'quantity-billed',
    quantityReceived: 'quantity-received',
    documentNumber: 'document',
  } as const,
} as const;

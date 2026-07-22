/** A product search result from the order list page */
export interface ProductResult {
  itemCode: string;
  documentNumber: string;
  productName: string;
  vendor: string;
  customerName: string;
  orderCode: string;
  orderDate: string;
  lotNumber: string;
  quantityOrdered: number;
  quantityBilled: number;
  quantityReceived: number;
}

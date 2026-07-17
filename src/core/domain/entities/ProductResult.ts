/** A product search result from the order list page */
export interface ProductResult {
  itemCode: string;
  productName: string;
  vendor: string;
  customerName: string;
  orderCode: string;
  orderDate: string;
  lostNumber: string;
  existsInSystem: boolean;
}

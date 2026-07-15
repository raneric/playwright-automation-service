/** A single line item within a claim */
export interface ClaimLineItem {
  itemCode: string;
  quantity: number;
  productName: string;
  orderCode: string;
  lotNumber: string;
  vendorName: string;
  orderDate: string;
}
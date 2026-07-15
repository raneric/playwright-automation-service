/** Domain entity representing a purchase order */
export interface PurchaseOrder {
  documentNumber: string;
  orderCode: string;
  date: string;
  status: string;
  vendorId: number;
  vendorName: string;
  vendorEntityId: number;
  customerId: number;
  customerName: string;
  productName: string;
  itemCode: string;
  lotNumber: string;
  quantityOrdered: number;
  quantityBilled: number;
  quantityReceived: number;
}
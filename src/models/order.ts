import { Vendor, CustomerInfo, RequestInfo } from "./common";

export interface Order {
  document_number: string;
  order_code: string;
  date: string;
  status: string;
  vendor_id: number;
  vendor_name: string;
  vendor_entity_id: number;
  customer_id: number;
  customer_name: string;
  product_name: string;
  item_code: string;
  lot_number: string;
  quantity_ordered: number;
  quantity_billed: number;
  quantity_received: number;
}
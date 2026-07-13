// ── Shared model types used across forms ──

export interface Vendor {
  id: number;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface CustomerInfo {
  id: number;
  organization: string;
  department: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface ClaimLineItem {
  item_code: string;
  quantity: number | string;
  product_name: string;
  order_code: string;
  lot_number: string;
  vendor_name: string;
  order_date: string;
}

export interface RequestInfo {
  date_of_request: string;
  requestor: string;
}
import { Vendor, CustomerInfo, ClaimLineItem, RequestInfo } from "./common";

/** Form-compatible model used by FormFiller */
export interface CustomerClaim {
  request: RequestInfo;
  vendor: Vendor;
  customer: CustomerInfo;
  issues: string;
  items: ClaimLineItem[];
}

// ── API input types ──

export interface ClaimInputAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface ClaimInputCustomer {
  name: string;
  organization: string;
  department: string;
  address: ClaimInputAddress;
  phone: string;
  email: string;
}

export interface ClaimInputVendor {
  name: string;
  id: number;
}

export interface ClaimInputProductLine {
  lineNumber: number;
  documentNumber: string;
  productName: string;
  itemCode: string;
  lotNumber: string;
  quantityOrdered: number;
  quantityBilled: number;
  quantityReceived: number;
  vendor: ClaimInputVendor;
  status: string;
}

export interface ClaimInputRequestInfo {
  date_of_request: string;
  requestor: string;
}

export interface ClaimInput {
  requestInfo: ClaimInputRequestInfo;
  orderCode: string;
  orderDate: string;
  customer: ClaimInputCustomer;
  issues:string,
  productLines: ClaimInputProductLine[];
}

/** Wrapper as received from the API: { claim: ClaimInput } */
export interface ClaimInputWrapper {
  claim: ClaimInput;
}

/**
 * Transform the API input format into the form-compatible CustomerClaim.
 */
export function transformClaimInput(input: ClaimInput): CustomerClaim {
  const firstVendor = input.productLines[0]?.vendor;

  return {
    request: {
      date_of_request: input.requestInfo.date_of_request,
      requestor: input.requestInfo.requestor,
    },
    vendor: {
      id: firstVendor?.id ?? 0,
      name: firstVendor?.name ?? "",
      email: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zip: "",
    },
    customer: {
      id: 0,
      name: input.customer.name,
      organization: input.customer.organization,
      department: input.customer.department,
      email: input.customer.email,
      phone: input.customer.phone,
      street: input.customer.address.street,
      city: input.customer.address.city,
      state: input.customer.address.state,
      zip: input.customer.address.postalCode,
    },
    issues: input.issues,
    items: input.productLines.map((pl) => ({
      item_code: pl.itemCode,
      quantity: pl.quantityOrdered,
      product_name: pl.productName,
      order_code: input.orderCode,
      lot_number: pl.lotNumber,
      vendor_name: pl.vendor.name,
      order_date: input.orderDate,
    })),
  };
}

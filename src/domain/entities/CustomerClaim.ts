import { ClaimLineItem } from './ClaimLineItem';

/**
 * Domain entity representing a customer claim.
 * This is the internal domain model — distinct from API DTOs and form data.
 */
export interface CustomerClaim {
  request: {
    dateOfRequest: string;
    requestor: string;
  };
  vendor: {
    id: number;
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  customer: {
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
  };
  issues: string;
  items: ClaimLineItem[];
}
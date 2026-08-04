import { ProductDTO } from '../../app/dto/ClaimDTO';

export type TicketSubmissionResult = {
  ticketCreated: boolean;
  ticketId?: number;
  error?: string | null;
};

type Claim = {
  id: number;
  created_at: string;
  updated_at: string;
};

export type TicketCreationOutput = {
  success: boolean;
  data: Claim;
};

export type SearchTerm = {
  type: 'orderCode' | 'lotNumber' | 'itemCode' | 'productName';
  value: string;
};

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

export interface ProductSearchOutput {
  allProductsFromSearch: ProductResult[];
  unmatchedProducts: ProductDTO[];
  matchedProducts: ProductDTO[];
  reconciliationResult: {
    totalProduct: number;
    totalReconciledProduct: number;
    success: boolean;
  };
}

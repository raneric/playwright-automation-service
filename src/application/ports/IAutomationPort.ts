import { Page } from 'playwright';
import { Result } from '../../shared/Result';

/**
 * Application-layer port for claim automation.
 * Implemented by the infrastructure layer (Playwright adapters).
 */
export interface IClaimAutomationPort {
  createClaim(page: Page, claimData: Record<string, unknown>): Promise<Result<string>>;
}

export interface IOrderAutomationPort {
  createOrder(page: Page, orderData: Record<string, unknown>): Promise<Result<string>>;
}

export interface ISearchAutomationPort {
  searchProducts(
    page: Page,
    customer: string,
    productNames: string[],
  ): Promise<Result<Array<{
    itemCode: string;
    productName: string;
    vendor: string;
    customerName: string;
    orderCode: string;
    existsInSystem: boolean;
  }>>>;
}
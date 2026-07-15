import { Page } from 'playwright';
import { Result } from '../../shared/Result';
import { ProductResult } from '../domain/entities';

export interface IClaimAutomationPort {
  createClaim(
    page: Page,
    claimData: Record<string, unknown>
  ): Promise<Result<string>>;
}

export interface IOrderAutomationPort {
  createOrder(
    page: Page,
    orderData: Record<string, unknown>
  ): Promise<Result<string>>;
}

export interface ISearchAutomationPort {
  searchProducts(
    page: Page,
    customer: string,
    productNames: string[]
  ): Promise<Result<ProductResult[]>>;
}

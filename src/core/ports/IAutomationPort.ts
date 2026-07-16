import { IAutomationContext } from './IAutomationContext';
import { Result } from '../../shared/Result';
import { ProductResult } from '../domain/entities';

/**
 * Port for claim creation automation.
 * Implementations drive a browser to fill and submit a claim form.
 */
export interface IClaimAutomationPort {
  createClaim(
    ctx: IAutomationContext,
    claimData: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>>;
}

/**
 * Port for product search automation.
 * Implementations drive a browser to search and extract product data.
 */
export interface ISearchAutomationPort {
  searchProducts(
    ctx: IAutomationContext,
    customer: string,
    productNames: string[]
  ): Promise<Result<ProductResult[]>>;
}

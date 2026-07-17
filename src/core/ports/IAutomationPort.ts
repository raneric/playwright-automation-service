import { Page } from 'playwright';
import { Result } from '../../shared/Result';
import { ProductResult } from '../domain/entities';

export interface IClaimAutomationPort {
  createClaim(
    page: Page,
    claimData: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>>;
}

export interface ISearchAutomationPort {
  searchProducts(
    page: Page,
    values: string[]
  ): Promise<Result<ProductResult[]>>;
}

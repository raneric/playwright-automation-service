import { Page } from 'playwright';
import { Result } from '../types/Result';
import { ClaimInputDTO } from '../../app/dto';
import { ProductSearchOutput } from '../types/FakeUISaas';

export interface IClaimAutomationPort {
  createClaim(
    page: Page,
    claimData: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>>;
}

export interface ISearchAutomationPort {
  searchProducts(
    page: Page,
    claim: ClaimInputDTO
  ): Promise<Result<ProductSearchOutput>>;
}

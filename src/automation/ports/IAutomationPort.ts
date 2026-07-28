import { Page } from 'playwright';
import { Result } from '../../shared/Result';
import { ProductSearchOutput } from '../../app/usecases/SearchProductsUseCase';
import { ClaimInputDTO } from '../../app/dto';

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

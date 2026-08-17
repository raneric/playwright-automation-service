import { Result } from '../types/Result';
import { ClaimInputDTO } from '../../app/dto';
import { ProductSearchOutput } from '../types/FakeUISaas';

export interface IClaimAutomationPort {
  createClaim(
    claimData: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>>;
}

export interface ISearchAutomationPort {
  searchProducts(claim: ClaimInputDTO): Promise<Result<ProductSearchOutput>>;
}

import { Page } from 'playwright';
import { Result } from '../../shared/Result';
import { ProductResult } from '../domain/entities';
import { ClaimInputDTO } from '../dto';
import { ProductDTO } from '../dto/ClaimDTO';

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
  ): Promise<Result<ProductDTO[]>>;
}

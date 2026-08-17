import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../config';
import { Result } from '../../../../shared/types/Result';
import { OrderListPage } from '../../pages';
import { gotoWithRetry } from '../../utils';
import { PagePath } from '../../../../shared/constants';
import { ClaimInputDTO } from '../../../../app/dto';
import { ProductDTO } from '../../../../app/dto/ClaimDTO';
import {
  ProductResult,
  ProductSearchOutput,
} from '../../../../shared/types/FakeUISaas';
import {
  IBrowserSession,
  ISearchAutomationPort,
} from '../../../../shared/ports';
import { extractTerm } from '../../../../shared/helperFunctions/searchHelpts';
import {
  classifyProductResult,
  findMatchedProduct,
  buildProductSearchOutput,
} from '../../../../shared/helperFunctions/searchMatcher';

/**
 * Playwright adapter implementing the Search automation port.
 */
export class PlaywrightSearchAutomation implements ISearchAutomationPort {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger,
    private readonly browserManager: IBrowserSession
  ) {}

  async searchProducts(
    claim: ClaimInputDTO
  ): Promise<Result<ProductSearchOutput>> {
    try {
      const { page } = await this.browserManager.createAuthenticatedSession(
        this.platform.name
      );
      const listPage = new OrderListPage(page, this.logger);

      await gotoWithRetry(
        page,
        `${this.platform.baseUrl}${PagePath.purchaseOrderList}`,
        this.logger
      );
      await listPage.waitForTable();

      const allMatchedResults: ProductDTO[] = [];
      const unmatchedResults: ProductDTO[] = [];
      const allSearchResult: ProductResult[] = [];

      const searchedTerms = new Set<string>();

      for (const productFromClaim of claim.products) {
        const term = extractTerm(productFromClaim);

        // Cache hit: term already searched — reuse existing results
        if (searchedTerms.has(term.value)) {
          classifyProductResult(
            allSearchResult,
            productFromClaim,
            claim.customer.organization,
            allMatchedResults,
            unmatchedResults
          );
          continue;
        }

        searchedTerms.add(term.value);

        this.logger.info({ term }, 'Searching');
        await listPage.clearSearch();
        await listPage.search(term.value);

        if (await listPage.hasNoResults()) {
          this.logger.info({ term }, 'No results');
          unmatchedResults.push(productFromClaim);
          continue;
        }

        // Paginate through results, stopping early when a match is found
        let matchFound = false;
        let pageNum = 1;

        do {
          this.logger.info({ term, page: pageNum }, 'Extracting products');
          const productsFromSearch = await listPage.extractProducts();
          allSearchResult.push(...productsFromSearch);

          if (!matchFound) {
            const matchResult = findMatchedProduct(
              productsFromSearch,
              productFromClaim,
              claim.customer.organization
            );

            if (matchResult.found && matchResult.product) {
              allMatchedResults.push(matchResult.product);
              matchFound = true;
            }
          }

          if (await listPage.hasNextPage()) {
            await listPage.clickNext();
            pageNum++;
          } else {
            break;
          }
        } while (!matchFound);

        if (!matchFound) {
          const unmatched = {
            ...productFromClaim,
            verifiedFromTheSystem: false,
          };
          unmatchedResults.push(unmatched);
        }
      }

      this.logger.info({ count: allMatchedResults.length }, 'Search complete');
      return Result.ok(
        buildProductSearchOutput(
          allSearchResult,
          allMatchedResults,
          unmatchedResults,
          claim.products.length
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Result.fail(new Error(message));
    }
  }
}

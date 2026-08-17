import { Page } from 'playwright';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { Result } from '../../../../shared/types/Result';
import { OrderListPage } from '../../pages';
import { gotoWithRetry } from '../../utils';
import { PagePath } from '../../../../shared/constants';
import { ClaimInputDTO } from '../../../../app/dto';
import { ProductDTO } from '../../../../app/dto/ClaimDTO';
import { stringValueProvided } from '../../utils/valueCheck';
import {
  ProductResult,
  ProductSearchOutput,
  SearchTerm,
} from '../../../../shared/types/FakeUISaas';
import { ISearchAutomationPort } from '../../../../shared/ports';

/**
 * Playwright adapter implementing the Search automation port.
 */
export class PlaywrightSearchAutomation implements ISearchAutomationPort {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger
  ) {}

  async searchProducts(
    page: Page,
    claim: ClaimInputDTO
  ): Promise<Result<ProductSearchOutput>> {
    try {
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
        const term = this.extractTerm(productFromClaim);

        // Cache hit: term already searched — reuse existing results
        if (searchedTerms.has(term.value)) {
          this.classifyResult(
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
            const matchResult = this.getMatchedProduct(
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
      return Result.ok({
        allProductsFromSearch: allSearchResult,
        matchedProducts: allMatchedResults,
        unmatchedProducts: unmatchedResults,
        reconciliationResult: {
          totalProduct: claim.products.length,
          totalReconciledProduct: allMatchedResults.length,
          success: allMatchedResults.length === claim.products.length,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Result.fail(new Error(message));
    }
  }

  private extractTerm(product: ProductDTO): SearchTerm {
    if (stringValueProvided(product.orderCode)) {
      return {
        type: 'orderCode',
        value: product.orderCode,
      };
    }

    if (stringValueProvided(product.lotNumber)) {
      return {
        type: 'lotNumber',
        value: product.lotNumber,
      };
    }

    if (stringValueProvided(product.itemCode)) {
      return {
        type: 'itemCode',
        value: product.itemCode,
      };
    }

    return {
      type: 'productName',
      value: product.productName,
    };
  }

  /**
   * Classify a single product as matched or unmatched and push to the
   * appropriate array. Extracted to eliminate duplicated logic between
   * the cache-hit path and the fresh-search path.
   */
  private classifyResult(
    results: ProductResult[],
    product: ProductDTO,
    customerName: string,
    matched: ProductDTO[],
    unmatched: ProductDTO[]
  ): void {
    const matchResult = this.getMatchedProduct(results, product, customerName);

    if (matchResult.found && matchResult.product) {
      matched.push(matchResult.product);
    } else {
      unmatched.push(product);
    }
  }

  private getMatchedProduct(
    products: ProductResult[],
    product: ProductDTO,
    customername: string
  ): { found: boolean; product?: ProductDTO } {
    const matchedProduct = products.find((p) => {
      return (
        p.itemCode === product.itemCode &&
        p.vendor === product.vendor &&
        p.customerName === customername &&
        p.orderCode === product.orderCode
      );
    });

    const mergedProduct = this.mergeMatchedAndProduct(matchedProduct, product);

    return {
      found: !!matchedProduct,
      product: mergedProduct,
    };
  }

  private mergeMatchedAndProduct(
    matched?: ProductResult,
    product?: ProductDTO
  ): ProductDTO | undefined {
    if (!product) return undefined;

    return {
      // fields that exist on ProductDTO but may be overridden by matched values
      lineNumber: product.lineNumber,
      documentNumber: matched?.documentNumber ?? product.documentNumber,
      productName: matched?.productName ?? product.productName,
      itemCode: matched?.itemCode ?? product.itemCode,
      lotNumber: matched?.lotNumber ?? product.lotNumber,
      quantityOrdered: matched?.quantityOrdered ?? product.quantityOrdered,
      quantityBilled: matched?.quantityBilled ?? product.quantityBilled,
      quantityReceived: matched?.quantityReceived ?? product.quantityReceived,
      orderCode: matched?.orderCode ?? product.orderCode,
      orderDate: matched?.orderDate ?? product.orderDate,
      vendor: matched?.vendor ?? product.vendor,
      status: product.status,
      comments: product.comments ?? '',
      verifiedFromTheSystem: true,
      verifiedFromAttachment: product.verifiedFromAttachment,
    };
  }
}

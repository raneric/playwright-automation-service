import { Page } from 'playwright';
import { ISearchAutomationPort } from '../../../../core/ports';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { Result } from '../../../../shared/Result';
import { ProductResult } from '../../../../core/domain/entities';
import { OrderListPage } from '../../pages';
import { gotoWithRetry } from '../../utils';
import { PagePath } from '../../../../shared/constants';
import { ClaimInputDTO } from '../../../../core/dto';
import { ProductDTO } from '../../../../core/dto/ClaimDTO';
import { stringValueProvided } from '../../utils/valueCheck';
import { SearchTerm } from '../../../../shared/types/FakeUISaas';
import { ProductSearchOutput } from '../../../../core/usecases/SearchProductsUseCase';

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
      const allSearchResult: ProductResult[] = [];

      for (const product of claim.products) {
        const term = this.extractTerm(product);
        this.logger.info({ term }, 'Searching');
        await listPage.clearSearch();
        await listPage.search(term.value);

        if (await listPage.hasNoResults()) {
          this.logger.info({ term }, 'No results');
          continue;
        }

        // Extract results from the current page and all subsequent pages
        let pageNum = 1;
        do {
          this.logger.info({ term, page: pageNum }, 'Extracting products');
          const products = await listPage.extractProducts();

          /**
           * TODO:
           * Strore umatched products in a separate array.
           * Return both matched and unmatched products in the final result.
           */

          const matchResult = this.getMatchedProduct(
            products,
            product,
            claim.customer.organization
          );

          if (matchResult.found && matchResult.product) {
            allMatchedResults.push(matchResult.product);
          }

          allSearchResult.push(...products);

          if (await listPage.hasNextPage()) {
            await listPage.clickNext();
            pageNum++;
          } else {
            break;
          }
        } while (true);
      }

      this.logger.info({ count: allMatchedResults.length }, 'Search complete');
      return Result.ok({
        unmatchedProducts: allSearchResult,
        matchedProducts: allMatchedResults,
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

  private getMatchedProduct(
    products: ProductResult[],
    product: ProductDTO,
    customername: string
  ): { found: boolean; product?: ProductDTO } {
    const matchedProduct = products.find((p) => {
      return (
        p.itemCode === product.itemCode &&
        p.productName === product.productName &&
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
      existsInSystem: true,
      verifiedFromAttachment: product.verifiedFromAttachment,
    };
  }
}

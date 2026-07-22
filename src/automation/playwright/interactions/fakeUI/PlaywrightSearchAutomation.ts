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
  ): Promise<Result<ProductDTO[]>> {
    try {
      const listPage = new OrderListPage(page, this.logger);
      const values: string[] = [];

      await gotoWithRetry(
        page,
        `${this.platform.baseUrl}${PagePath.purchaseOrderList}`,
        this.logger
      );
      await listPage.waitForTable();

      const allResults: ProductDTO[] = [];

      for (const product of claim.products) {
        const term = this.extractTerm(product);
        this.logger.info({ term }, 'Searching');
        await listPage.clearSearch();
        await listPage.search(term);

        if (await listPage.hasNoResults()) {
          this.logger.info({ term }, 'No results');
          continue;
        }

        // Extract results from the current page and all subsequent pages
        let pageNum = 1;
        do {
          this.logger.info({ term, page: pageNum }, 'Extracting products');
          const products = await listPage.extractProducts();
          const matchResult = this.getMatchedProduct(
            products,
            product,
            claim.customer.organization
          );

          if (matchResult.found && matchResult.product) {
            allResults.push(matchResult.product);
          }

          if (await listPage.hasNextPage()) {
            await listPage.clickNext();
            pageNum++;
          } else {
            break;
          }
        } while (true);
      }

      this.logger.info({ count: allResults.length }, 'Search complete');
      return Result.ok(allResults);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Result.fail(new Error(message));
    }
  }

  private extractTerm(product: ProductDTO): string {
    if (stringValueProvided(product.orderCode)) {
      return product.orderCode;
    }

    if (stringValueProvided(product.lotNumber)) {
      return product.lotNumber;
    }

    if (stringValueProvided(product.itemCode)) {
      return product.itemCode;
    }

    return product.productName;
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
        p.vendor === product.vendor.name &&
        p.customerName === customername &&
        p.orderCode === product.orderCode
      );
    });

    const mergedProduct: ProductDTO = {
      ...matchedProduct,
      lineNumber: product.lineNumber,
      documentNumber: matchedProduct?.documentNumber || '',
      vendor: product.vendor,
    };

    return {
      found: !!matchedProduct,
      product: {
        ...mergedProduct,
      },
    };
  }
}

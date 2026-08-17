import { Op } from 'sequelize';
import { ClaimInputDTO } from '../../app/dto';
import { ProductDTO } from '../../app/dto/ClaimDTO';
import { extractTerm } from '../../shared/helperFunctions/searchHelpts';
import { ISearchAutomationPort } from '../../shared/ports';
import {
  ProductResult,
  ProductSearchOutput,
} from '../../shared/types/FakeUISaas';
import { Result } from '../../shared/types/Result';
import {
  classifyProductResult,
  findMatchedProduct,
  buildProductSearchOutput,
} from '../../shared/helperFunctions/searchMatcher';
import { purchaseOrderRepository } from './repositories/PurchaseOrderRepository';
import { PurchaseOrder } from './models';

/**
 * Database-backed implementation of the Search automation port.
 *
 * Instead of driving a browser to scrape the order list page, this adapter
 * queries the PostgreSQL database directly via Sequelize. It returns the
 * same {@link ProductSearchOutput} shape as the Playwright adapter so that
 * callers (use cases, controllers) are completely agnostic to the data source.
 */
export default class DatabaseSearchAutomation implements ISearchAutomationPort {
  async searchProducts(
    claim: ClaimInputDTO
  ): Promise<Result<ProductSearchOutput>> {
    try {
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

        const whereClause: Record<string, unknown> =
          term.type === 'product_name'
            ? { [term.type]: { [Op.iLike]: `%${term.value}%` } }
            : { [term.type]: term.value };

        const rows = await purchaseOrderRepository.findWhere(whereClause);

        if (rows.length === 0) {
          unmatchedResults.push(productFromClaim);
          continue;
        }

        // Map Sequelize model instances to ProductResult shape
        const productsFromSearch = rows.map((po) =>
          DatabaseSearchAutomation.toProductResult(po)
        );
        allSearchResult.push(...productsFromSearch);

        const matchResult = findMatchedProduct(
          productsFromSearch,
          productFromClaim,
          claim.customer.organization
        );

        if (matchResult.found && matchResult.product) {
          allMatchedResults.push(matchResult.product);
        } else {
          const unmatched = {
            ...productFromClaim,
            verifiedFromTheSystem: false,
          };
          unmatchedResults.push(unmatched);
        }
      }

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

  /**
   * Map a Sequelize PurchaseOrder model instance to the {@link ProductResult}
   * shape expected by the shared types.
   */
  private static toProductResult(po: PurchaseOrder): ProductResult {
    return {
      itemCode: po.item_code,
      documentNumber: po.document_number,
      productName: po.product_name,
      vendor: po.vendor_name,
      customerName: po.customer_name,
      orderCode: po.order_code,
      orderDate: DatabaseSearchAutomation.toDateString(po.date),
      lotNumber: po.lot_number,
      quantityOrdered: po.quantity_ordered,
      quantityBilled: po.quantity_billed,
      quantityReceived: po.quantity_received,
    };
  }

  /**
   * Normalize a `DATEONLY` column to a `YYYY-MM-DD` string.
   * Sequelize returns `DATEONLY` as a string already, but the model types it
   * as `Date` — handle both to stay safe at runtime.
   */
  private static toDateString(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.toISOString().split('T')[0];
  }
}

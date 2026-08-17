import { ProductDTO } from '../../app/dto/ClaimDTO';
import { ProductResult, ProductSearchOutput } from '../types/FakeUISaas';

/**
 * Shared helpers for reconciling claim product lines against search results.
 *
 * Both search adapters (Playwright browser scraping and direct database access)
 * produce the same result shape, so the matching, merging, and classification
 * logic lives here to keep them DRY.
 */

/**
 * Find a product in the search results that matches the claim product.
 *
 * Matching criteria:
 *  - itemCode
 *  - vendor
 *  - customerName (the claim's organization)
 *  - orderCode
 */
export function findMatchedProduct(
  products: ProductResult[],
  product: ProductDTO,
  customerName: string
): { found: boolean; product?: ProductDTO } {
  const matchedProduct = products.find(
    (p) =>
      p.itemCode === product.itemCode &&
      p.vendor === product.vendor &&
      p.customerName === customerName &&
      p.orderCode === product.orderCode
  );

  return {
    found: !!matchedProduct,
    product: mergeMatchedProduct(matchedProduct, product),
  };
}

/**
 * Merge a matched {@link ProductResult} into a {@link ProductDTO}.
 * Fields from the search result take precedence; the claim product provides
 * fallback values. Sets `verifiedFromTheSystem: true`.
 */
export function mergeMatchedProduct(
  matched?: ProductResult,
  product?: ProductDTO
): ProductDTO | undefined {
  if (!product) return undefined;

  return {
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

/**
 * Classify a single product as matched or unmatched and push it to the
 * appropriate array. Returns whether a match was found.
 */
export function classifyProductResult(
  results: ProductResult[],
  product: ProductDTO,
  customerName: string,
  matched: ProductDTO[],
  unmatched: ProductDTO[]
): boolean {
  const matchResult = findMatchedProduct(results, product, customerName);

  if (matchResult.found && matchResult.product) {
    matched.push(matchResult.product);
    return true;
  }

  unmatched.push(product);
  return false;
}

/**
 * Build the canonical search output from accumulated results.
 */
export function buildProductSearchOutput(
  allProductsFromSearch: ProductResult[],
  matchedProducts: ProductDTO[],
  unmatchedProducts: ProductDTO[],
  totalProduct: number
): ProductSearchOutput {
  return {
    allProductsFromSearch,
    matchedProducts,
    unmatchedProducts,
    reconciliationResult: {
      totalProduct,
      totalReconciledProduct: matchedProducts.length,
      success: matchedProducts.length === totalProduct,
    },
  };
}

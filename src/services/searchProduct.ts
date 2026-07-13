import { login, LoginCredentials } from "./login";
import { closeBrowser, gotoWithRetry } from "./browser";
import { logger } from "../utils/logger";
import { FAKE_UI_BASE_URL, PagePath } from "../utils/const";
import { SearchData } from "../models/SearchData";

export interface ProductResult {
  item_code: string;
  product: string;
  vendor: string;
  customer_name: string;
  order_code: string;
  existInTheSystem: boolean;
}

export interface SearchResult {
  success: boolean,
  error?: string,
  products: ProductResult[],
}

/**
 * Search the purchase order list page for products matching the given
 * search terms. For each term, it types into the search bar, clicks Search,
 * waits for the table to update, and collects every visible product name + code.
 *
 * Returns a deduplicated array of { item_code, product } pairs.
 */
export async function searchProduct(
  searchData: SearchData,
  credentials: LoginCredentials,
): Promise<SearchResult> {

  const { context, page } = await login(credentials);
  const searchTerms = searchData.products.map((product) => product.product_name);
  const customer = searchData.customer;

  if(!customer) {
    throw new Error("Customer name is required in search data.");
  }

  try {
    logger.info("Navigating to purchase order list...");
    await gotoWithRetry(page, `${FAKE_UI_BASE_URL}${PagePath.purchaseOrderList}`);

    // Wait for the initial table load
    await page.waitForSelector('[data-testid="po-list-table"]', {
      timeout: 10000,
    });

    const results: ProductResult[] = [];

    for (const term of searchTerms) {
      logger.info(`Searching for: "${term}"`);

      // Clear any previous search
      const clearBtn = await page.$('[data-testid="po-list-search-clear"]');
      if (clearBtn) {
        await clearBtn.click();
        await page.waitForTimeout(500);
      }

      // Type the search term and click Search
      await page.fill('[data-testid="po-list-search"]', term);
      await page.click(".po-list-search-btn");

      // Wait for the table to update (loading indicator gone, or table re-rendered)
      await page.waitForTimeout(800);

      // Check if the "no results" or "loading" message is visible
      const emptyVisible = await page.$('[data-testid="po-list-empty"]');
      const loadingVisible = await page.$('[data-testid="po-list-loading"]');
      if (emptyVisible || loadingVisible) {
        logger.info(`No results for "${term}"`);
        continue;
      }

      // Collect all visible rows
      const rows = await page.$$('tr[data-testid^="po-list-row-"]');

      for (const row of rows) {
        const testId = await row.getAttribute("data-testid");
        if (!testId) continue;

        // Extract the row index from the data-testid, e.g. "po-list-row-3"
        const index = testId.replace("po-list-row-", "");

        const itemCode = await page
          .textContent(`[data-testid="po-list-row-${index}-item-code"]`)
          .then((t) => t?.trim() || "");
        const product = await page
          .textContent(`[data-testid="po-list-row-${index}-product"]`)
          .then((t) => t?.trim() || "");
        const vendor = await page
          .textContent(`[data-testid="po-list-row-${index}-vendor"]`)
          .then((t) => t?.trim() || "");
        const customer_name = await page
          .textContent(`[data-testid="po-list-row-${index}-customer"]`)
          .then((t) => t?.trim() || "");
        const order_code = await page
          .textContent(`[data-testid="po-list-row-${index}-order-code"]`)
          .then((t) => t?.trim() || "");

        if (itemCode || product) {
          results.push({
            item_code: itemCode,
            product,
            vendor,
            customer_name,
            order_code,
            existInTheSystem: true,
          });
        }
      }
    }

    // Deduplicate by item_code + product pair
    const unique = results.filter(
      (r, i, arr) =>
        arr.findIndex(
          (x) => x.item_code === r.item_code && x.product === r.product,
        ) === i,
    );

    logger.info(
      `Search complete: ${unique.length} unique products found across ${searchTerms.length} search terms`,
    );

    return {
      success: true,
      products: unique

    };
  } catch (error) {
    return {
      success: false,
      error : (error as Error).message,
      products:[]
    }
  }
  finally {
    await context.close();
    await closeBrowser();
  }
}

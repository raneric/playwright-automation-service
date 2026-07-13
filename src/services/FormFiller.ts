import { Page } from "playwright";
import { FormConfig, FieldDescriptor } from "../config/types";

/**
 * Generic, data-driven form filler.
 *
 * It takes a {@link FormConfig} (declarative form definition) and a data object,
 * walks the field tree, resolves values via dot-paths, and fills the page.
 *
 * Usage:
 * ```ts
 * const filler = new FormFiller(purchaseOrderConfig);
 * await filler.fill(page, orderData);
 * await filler.fillItems(page, orderData.items);
 * const id = await filler.submit(page);
 * ```
 */
export class FormFiller {
  private config: FormConfig;

  constructor(config: FormConfig) {
    this.config = config;
  }

  // ── public API ──────────────────────────────────────────────

  /**
   * Fill every field defined in the config's top-level `fields` tree.
   * @param page  Playwright Page
   * @param data  The form data object (e.g. Order, CustomerClaim)
   */
  async fill(page: Page, data: Record<string, unknown>): Promise<void> {
    for (const descriptor of this.config.fields) {
      await this.fillNode(page, descriptor, data, []);
    }
  }

  /**
   * Fill the items table.
   * The first row is assumed to already exist; subsequent rows trigger
   * the "Add Item" button and wait for the new row to appear.
   */
  async fillItems(page: Page, items: Record<string, unknown>[]): Promise<void> {
    const itemsConfig = this.config.items;
    if (!itemsConfig) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const idx = String(i);


        await page.click(`[data-testid="${itemsConfig.addButtonTestId}"]`);
        // Wait for the first field of the new row to appear
        const firstField = itemsConfig.rowFields[0];
        await page.waitForSelector(
          this.selector([...this.rowPrefix(), idx, firstField.key]),
        );


      for (const descriptor of itemsConfig.rowFields) {
        await this.fillNode(page, descriptor, item, [...this.rowPrefix(), idx]);
      }
    }
  }

  /**
   * Click submit, then race between the success message and any
   * validation errors (elements with class "field-error").
   * Returns the success message text, or throws with all error messages.
   */
  async submit(page: Page): Promise<string> {
    const submitId =
      this.config.submitTestId ?? `${this.config.prefix}-submit-btn`;
    const successId =
      this.config.successTestId ?? `${this.config.prefix}-success-message`;

    await page.click(`[data-testid="${submitId}"]`);

    // Race: wait for either success or the first validation error
    const result = await Promise.race([
      page
        .waitForSelector(`[data-testid="${successId}"]`)
        .then(() => "success" as const),
      page
        .waitForSelector(".field-error", { state: "attached" })
        .then(() => "error" as const),
    ]);

    if (result === "error") {
      const errors = await page.$$eval(".field-error", (els) =>
        els.map((el) => el.textContent?.trim()).filter(Boolean),
      );
      throw new Error(
        `Form validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
      );
    }

    return (
      (await page.textContent(`[data-testid="${successId}"]`)) || "unknown"
    );
  }

  // ── internals ───────────────────────────────────────────────

  /**
   * Recursively walk a FieldDescriptor node.
   * - Leaf: resolve value from data and call page.fill()
   * - Branch: recurse into children
   */
  private async fillNode(
    page: Page,
    descriptor: FieldDescriptor,
    data: Record<string, unknown>,
    parentPath: string[],
  ): Promise<void> {
    if (descriptor.children) {
      // Branch node — recurse into children
      for (const child of descriptor.children) {
        await this.fillNode(page, child, data, [...parentPath, descriptor.key]);
      }
    } else {
      // Leaf node — fill the input
      const valuePath = descriptor.path ?? descriptor.key;
      const value = this.resolveValue(data, valuePath);
      const selector = this.selector([...parentPath, descriptor.key]);
      await page.fill(selector, String(value ?? ""));
    }
  }

  /** Build a full data-testid selector from path segments. */
  private selector(segments: string[]): string {
    return `[data-testid="${this.config.prefix}-${segments.join("-")}"]`;
  }

  /** The prefix segments for items rows, e.g. ["items"]. */
  private rowPrefix(): string[] {
    return ["items"];
  }

  /**
   * Resolve a dot-path like "vendor.address.street" against a data object.
   * Returns `undefined` for missing paths instead of throwing.
   */
  private resolveValue(data: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((obj, key) => {
      if (obj && typeof obj === "object") {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, data);
  }
}

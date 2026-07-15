import { Page } from 'playwright';
import { Logger } from '../../../shared/logger';
import { FieldDescriptor } from '../../config/form/types';
import { BasePage } from './BasePage';
import { FormConfig } from '../../config/form/types';

/**
 * Generic Page Object for any form-driven page.
 * Uses a declarative FormConfig to fill fields and submit.
 */
export class FormPage extends BasePage {
  private readonly config: FormConfig;

  constructor(page: Page, logger: Logger, config: FormConfig) {
    super(page, logger);
    this.config = config;
  }

  /** Wait for the form container to be visible */
  async waitForForm(): Promise<void> {
    await this.waitForReady(`[data-testid="${this.config.prefix}-form"]`);
  }

  /** Fill all top-level fields from the config */
  async fillFields(data: Record<string, unknown>): Promise<void> {
    for (const descriptor of this.config.fields) {
      await this.fillNode(descriptor, data, []);
    }
  }

  /** Fill the items table rows */
  async fillItems(items: Record<string, unknown>[]): Promise<void> {
    const itemsConfig = this.config.items;
    if (!itemsConfig) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const idx = String(i);

      await this.clickByTestId(itemsConfig.addButtonTestId);
      const firstField = itemsConfig.rowFields[0];
      await this.page.waitForSelector(
        this.selector([...this.rowPrefix(), idx, firstField.key]),
      );

      for (const descriptor of itemsConfig.rowFields) {
        await this.fillNode(descriptor, item, [...this.rowPrefix(), idx]);
      }
    }
  }

  /** Click submit and return the success message */
  async submit(): Promise<string> {
    const submitId =
      this.config.submitTestId ?? `${this.config.prefix}-submit-btn`;
    const successId =
      this.config.successTestId ?? `${this.config.prefix}-success-message`;

    await this.clickByTestId(submitId);

    const result = await Promise.race([
      this.page
        .waitForSelector(`[data-testid="${successId}"]`)
        .then(() => 'success' as const),
      this.page
        .waitForSelector('.field-error', { state: 'attached' })
        .then(() => 'error' as const),
    ]);

    if (result === 'error') {
      const errors = await this.page.$$eval('.field-error', (els) =>
        els.map((el) => el.textContent?.trim()).filter(Boolean),
      );
      await this.screenshot(`${this.config.prefix}-form-validation-error`);
      throw new Error(
        `Form validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
      );
    }

    return (await this.textByTestId(successId)) || 'unknown';
  }

  // ── Private helpers ──────────────────────────────────────────

  private async fillNode(
    descriptor: FieldDescriptor,
    data: Record<string, unknown>,
    parentPath: string[],
  ): Promise<void> {
    if (descriptor.children) {
      for (const child of descriptor.children) {
        await this.fillNode(child, data, [...parentPath, descriptor.key]);
      }
    } else {
      const valuePath = descriptor.path ?? descriptor.key;
      const value = this.resolveValue(data, valuePath);
      const sel = this.selector([...parentPath, descriptor.key]);
      await this.page.fill(sel, String(value ?? ''));
    }
  }

  private selector(segments: string[]): string {
    return `[data-testid="${this.config.prefix}-${segments.join('-')}"]`;
  }

  private rowPrefix(): string[] {
    return ['items'];
  }

  private resolveValue(data: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, data);
  }
}

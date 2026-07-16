import { Page } from 'playwright';
import { Logger } from '../../../../shared/logger';
import { FieldDescriptor } from '../../../config/form/types';
import { BasePage } from './BasePage';
import { FormConfig } from '../../../config/form/types';
import { DEFAULT_TIMEOUTS } from '../../../../shared/constants';
import { Result } from '../../../../shared/Result';
import { isRetryableStatus, RetryableError } from '../../../../shared/errors';

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
        this.selector([...this.rowPrefix(), idx, firstField.key])
      );

      for (const descriptor of itemsConfig.rowFields) {
        await this.fillNode(descriptor, item, [...this.rowPrefix(), idx]);
      }
    }
  }

  /**
   * Click submit, capture the HTTP response status, and return the success message.
   *
   * - On 2xx: returns the success message text
   * - On retryable status (5xx, 429, 408): throws RetryableError so callers can retry
   * - On non-retryable client errors (4xx): throws a standard Error immediately
   */
  async submit(): Promise<Result<string>> {
    const submitId = `${this.config.prefix}-${this.config.submitTestId}`;
    const successId = `${this.config.prefix}-${this.config.successTestId}`;
    const serverErrorId = `${this.config.prefix}-${this.config.serverErrorTestId}`;
    const validationErrorId = `${this.config.prefix}-${this.config.formValidationErrorTestId}`;

    // Start waiting for the form submission POST response *before* clicking submit.
    // Playwright matches the first POST request that occurs after the click.
    const responsePromise = this.page
      .waitForResponse((resp) => resp.request().method() === 'POST', {
        timeout: DEFAULT_TIMEOUTS.selector,
      })
      .catch(() => null); // If no POST response (e.g. full-page navigation), resolve null

    await this.clickByTestId(submitId);

    const response = await responsePromise;

    // Wait for the DOM to reflect the outcome
    const result = await Promise.race([
      this.page
        .waitForSelector(`[data-testid="${successId}"]`)
        .then(() => 'success' as const),
      this.page
        .waitForSelector(`[data-testid="${serverErrorId}"]`)
        .then(() => 'server_error' as const),
      this.page
        .waitForSelector(`[data-testid="${validationErrorId}"]`)
        .then(() => 'validation_error' as const),
    ]);

    if (result === 'server_error' || result === 'validation_error') {
      const errors = await this.page.$$eval('.form-error', (els) =>
        els.map((el) => el.textContent?.trim()).filter(Boolean)
      );
      const message = `Form submission failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`;

      // Check the HTTP response status to decide whether to retry
      const statusCode = response?.status();
      if (statusCode && isRetryableStatus(statusCode)) {
        this.logger.warn(
          { statusCode, errors },
          'Retryable server error on form submission'
        );
        throw new RetryableError(message, statusCode);
      }

      // Non-retryable — fail immediately
      throw new Error(message);
    }

    // Extract success message text if the element exists
    const successText = await this.page
      .textContent(`[data-testid="${successId}"]`)
      .then((t) => t?.trim() ?? '');

    return Result.ok(successText);
  }

  // ── Private helpers ──────────────────────────────────────────

  private async fillNode(
    descriptor: FieldDescriptor,
    data: Record<string, unknown>,
    parentPath: string[]
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

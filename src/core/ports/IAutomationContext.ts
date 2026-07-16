/**
 * Framework-agnostic automation context interface.
 *
 * This is the Adapter pattern boundary: the core layer depends on this
 * interface, and infrastructure implements it with Playwright (or any
 * other browser automation framework).
 *
 * The surface area is intentionally minimal — only the operations that
 * business logic actually needs. This keeps the contract stable and
 * makes it easy to implement adapters for different frameworks.
 */
export interface IAutomationContext {
  /** Navigate to a URL */
  navigate(url: string): Promise<void>;

  /** Fill an input field identified by a selector */
  fill(selector: string, value: string): Promise<void>;

  /** Click an element identified by a selector */
  click(selector: string): Promise<void>;

  /** Get the text content of an element */
  textContent(selector: string): Promise<string>;

  /** Get the value of an attribute on an element */
  getAttribute(selector: string, name: string): Promise<string | null>;

  /** Wait for a selector to reach a given state */
  waitForSelector(
    selector: string,
    state: 'attached' | 'detached' | 'visible' | 'hidden'
  ): Promise<void>;

  /** Check if an element exists in the DOM */
  hasElement(selector: string): Promise<boolean>;

  /** Find all elements matching a selector */
  queryAll(selector: string): Promise<IAutomationElement[]>;

  /** Wait for a network response matching a predicate */
  waitForResponse(
    predicate: (response: {
      url(): string;
      status(): number;
      request(): { method(): string };
    }) => boolean,
    timeout?: number
  ): Promise<{ status(): number } | null>;

  /** Wait for the URL to change from a given value */
  waitForUrlChange(fromUrl: string): Promise<void>;

  /** Take a screenshot (for debugging) */
  screenshot(name: string): Promise<void>;

  /** Get the current page URL */
  url(): string;
}

/**
 * Framework-agnostic DOM element handle.
 */
export interface IAutomationElement {
  /** Get the value of an attribute */
  getAttribute(name: string): Promise<string | null>;
}

import { IAutomationContext } from './IAutomationContext';

/**
 * Port for login workflow execution.
 *
 * Each SaaS platform may have a different login flow (form-based, SSO, OAuth).
 * This port allows BrowserManager to perform login without knowing the details.
 */
export interface ILoginWorkflow {
  /** Perform login on the given browser context. Throws on failure. */
  login(ctx: IAutomationContext): Promise<void>;
}

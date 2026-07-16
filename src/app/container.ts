import {
  createContainer,
  asClass,
  asValue,
  InjectionMode,
  AwilixContainer,
} from 'awilix';
import { Logger } from '../shared/logger';
import { AppConfig, PlatformConfig } from '../infrastructure/config';
import { FormConfig } from '../infrastructure/config/form/types';
import { customerClaimConfig } from '../infrastructure/config/form';
import { TableConfig } from '../infrastructure/config/table/types';
import { purchaseOrderTableConfig } from '../infrastructure/config/table';
import { BrowserManager } from '../infrastructure/playwright/BrowserManager';
import {
  PlaywrightClaimAutomation,
  PlaywrightSearchAutomation,
  PlaywrightLoginWorkflow,
} from '../infrastructure/playwright/automation';
import { CreateClaimUseCase } from '../core/usecases/CreateClaimUseCase';
import { SearchProductsUseCase } from '../core/usecases/SearchProductsUseCase';
import { ClaimController } from '../infrastructure/http/controllers/ClaimController';
import { SearchController } from '../infrastructure/http/controllers/SearchController';
import {
  IClaimAutomationPort,
  ISearchAutomationPort,
  ILoginWorkflow,
} from '../core/ports';

/**
 * Build the Awilix DI container.
 *
 * Registration order:
 *  1. Values (config, logger)
 *  2. Helper: resolve a PlatformConfig by name
 *  3. Infrastructure (browser, per-platform automation factories)
 *  4. Application (use cases with per-platform factory injection)
 *  5. Presentation (controllers)
 *
 * Multi-platform design:
 *  - Automation classes accept PlatformConfig (not AppConfig)
 *  - Use cases accept factory functions: (platform: string) => IPort
 *  - BrowserManager maintains one authenticated context per platform
 *
 * IMPORTANT: Factory functions are registered with asValue(), NOT asFunction().
 * asFunction() in CLASSIC mode would try to resolve the parameter names
 * (e.g. "platformName") from the container, which fails. asValue() stores
 * the function as a plain value — callers invoke it with their own arguments.
 */
export function buildContainer(
  config: AppConfig,
  logger: Logger
): AwilixContainer {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC,
  });

  // ── Values ───────────────────────────────────────────────────
  container.register({
    config: asValue(config),
    logger: asValue(logger),
  });

  // ── Platform resolver ────────────────────────────────────────
  // Returns a PlatformConfig by name, or throws if unknown.
  // Registered as a value so callers invoke it with their own platformName arg.
  const getPlatform = (platformName: string): PlatformConfig => {
    const platform = config.platforms[platformName];
    if (!platform) {
      throw new Error(
        `Unknown platform "${platformName}". Known: ${Object.keys(
          config.platforms
        ).join(', ')}`
      );
    }
    return platform;
  };

  // ── Infrastructure ───────────────────────────────────────────
  // Per-platform factory functions — registered as values so Awilix
  // does NOT try to resolve their parameter names from the container.

  /**
   * Resolve the FormConfig for a given platform.
   * Currently defaults to customerClaimConfig for all platforms.
   * When plugin architecture is implemented, this will look up
   * platform-specific form configs from the plugin registry.
   */
  const getFormConfig = (_platformName: string): FormConfig => {
    // TODO: resolve from plugin registry when implemented
    return customerClaimConfig;
  };

  /**
   * Resolve the TableConfig for a given platform.
   * Currently defaults to purchaseOrderTableConfig for all platforms.
   * When plugin architecture is implemented, this will look up
   * platform-specific table configs from the plugin registry.
   */
  const getTableConfig = (_platformName: string): TableConfig => {
    // TODO: resolve from plugin registry when implemented
    return purchaseOrderTableConfig;
  };

  const getLoginWorkflow = (platformName: string): ILoginWorkflow => {
    const platform = getPlatform(platformName);
    return new PlaywrightLoginWorkflow(platform, logger);
  };

  const getClaimAutomation = (platformName: string): IClaimAutomationPort => {
    const platform = getPlatform(platformName);
    const formConfig = getFormConfig(platformName);
    return new PlaywrightClaimAutomation(platform, formConfig, logger);
  };

  const getSearchAutomation = (platformName: string): ISearchAutomationPort => {
    const platform = getPlatform(platformName);
    const tableConfig = getTableConfig(platformName);
    return new PlaywrightSearchAutomation(platform, tableConfig, logger);
  };

  container.register({
    getPlatform: asValue(getPlatform),
    browserSession: asClass(BrowserManager, { lifetime: 'SINGLETON' }),
    getLoginWorkflow: asValue(getLoginWorkflow),
    getClaimAutomation: asValue(getClaimAutomation),
    getSearchAutomation: asValue(getSearchAutomation),
  });

  // ── Application ──────────────────────────────────────────────
  container.register({
    createClaimUseCase: asClass(CreateClaimUseCase, { lifetime: 'SINGLETON' }),
    searchProductsUseCase: asClass(SearchProductsUseCase, {
      lifetime: 'SINGLETON',
    }),
  });

  // ── Controllers ──────────────────────────────────────────────
  container.register({
    claimController: asClass(ClaimController, { lifetime: 'SINGLETON' }),
    searchController: asClass(SearchController, { lifetime: 'SINGLETON' }),
  });

  return container;
}

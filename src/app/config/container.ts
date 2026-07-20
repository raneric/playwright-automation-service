import {
  createContainer,
  asClass,
  asValue,
  InjectionMode,
  AwilixContainer,
} from 'awilix';
import { Logger } from '../../shared/logger';
import { AppConfig, PlatformConfig } from '../../automation/config';
import { BrowserManager } from '../../automation/playwright/BrowserManager';
import {
  PlaywrightClaimAutomation,
  PlaywrightSearchAutomation,
  PlaywrightLoginWorkflow,
} from '../../automation/playwright/interactions';
import { CreateClaimUseCase } from '../../core/usecases/CreateClaimUseCase';
import { SearchProductsUseCase } from '../../core/usecases/SearchProductsUseCase';
import { ClaimController } from '../http/controllers/ClaimController';
import { SearchController } from '../http/controllers/SearchController';
import { IClaimAutomationPort, ISearchAutomationPort } from '../../core/ports';

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

  const getLoginWorkflow = (platformName: string): PlaywrightLoginWorkflow => {
    const platform = getPlatform(platformName);
    return new PlaywrightLoginWorkflow(platform, logger);
  };

  const getClaimAutomation = (platformName: string): IClaimAutomationPort => {
    const platform = getPlatform(platformName);
    return new PlaywrightClaimAutomation(platform, logger);
  };

  const getSearchAutomation = (platformName: string): ISearchAutomationPort => {
    const platform = getPlatform(platformName);
    return new PlaywrightSearchAutomation(platform, logger);
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

import { createContainer, asClass, asValue, InjectionMode, AwilixContainer } from 'awilix';
import { Logger } from '../shared/logger';
import { AppConfig } from '../infrastructure/config';
import { BrowserManager } from '../infrastructure/playwright/BrowserManager';
import {
  PlaywrightClaimAutomation,
  PlaywrightOrderAutomation,
  PlaywrightSearchAutomation,
  PlaywrightLoginWorkflow,
} from '../infrastructure/playwright/PlaywrightAutomation';
import { CreateClaimUseCase } from '../core/usecases/CreateClaimUseCase';
import { CreateOrderUseCase } from '../core/usecases/CreateOrderUseCase';
import { SearchProductsUseCase } from '../core/usecases/SearchProductsUseCase';
import { ClaimController } from '../infrastructure/http/controllers/ClaimController';
import { OrderController } from '../infrastructure/http/controllers/OrderController';
import { SearchController } from '../infrastructure/http/controllers/SearchController';

/**
 * Build the Awilix DI container.
 *
 * Registration order:
 *  1. Values (config, logger)
 *  2. Infrastructure (browser, automation adapters)
 *  3. Application (use cases)
 *  4. Presentation (controllers)
 *
 * All dependencies are resolved by the container — no manual wiring.
 */
export function buildContainer(config: AppConfig, logger: Logger): AwilixContainer {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC,
  });

  // ── Values ───────────────────────────────────────────────────
  container.register({
    config: asValue(config),
    logger: asValue(logger),
  });

  // ── Infrastructure ───────────────────────────────────────────
  container.register({
    browserSession: asClass(BrowserManager, { lifetime: 'SINGLETON' }),
    loginWorkflow: asClass(PlaywrightLoginWorkflow, { lifetime: 'SINGLETON' }),
    claimAutomation: asClass(PlaywrightClaimAutomation, { lifetime: 'SINGLETON' }),
    orderAutomation: asClass(PlaywrightOrderAutomation, { lifetime: 'SINGLETON' }),
    searchAutomation: asClass(PlaywrightSearchAutomation, { lifetime: 'SINGLETON' }),
  });

  // ── Application ──────────────────────────────────────────────
  container.register({
    createClaimUseCase: asClass(CreateClaimUseCase, { lifetime: 'SINGLETON' }),
    createOrderUseCase: asClass(CreateOrderUseCase, { lifetime: 'SINGLETON' }),
    searchProductsUseCase: asClass(SearchProductsUseCase, { lifetime: 'SINGLETON' }),
  });

  // ── Controllers ──────────────────────────────────────────────
  container.register({
    claimController: asClass(ClaimController, { lifetime: 'SINGLETON' }),
    orderController: asClass(OrderController, { lifetime: 'SINGLETON' }),
    searchController: asClass(SearchController, { lifetime: 'SINGLETON' }),
  });

  return container;
}
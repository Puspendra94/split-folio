import { Injectable, Inject } from '@nestjs/common';
import { ApiConfigService } from '../../shared/services/config.service';
import {
  PRICE_RESOLUTION_STRATEGY,
  MARKET_SCHEDULE_STRATEGY,
} from './market.constants';
import { IPriceResolutionStrategy } from './strategies/price-resolution.strategy.interface';
import { IMarketScheduleStrategy } from './strategies/market-schedule.strategy.interface';

@Injectable()
export class MarketService {
  constructor(
    private readonly configService: ApiConfigService,
    @Inject(PRICE_RESOLUTION_STRATEGY)
    private readonly priceResolutionStrategy: IPriceResolutionStrategy,
    @Inject(MARKET_SCHEDULE_STRATEGY)
    private readonly marketScheduleStrategy: IMarketScheduleStrategy,
  ) {}

  /**
   * Checks if the market is open on a given date.
   */
  isMarketOpen(date: Date = new Date()): boolean {
    return this.marketScheduleStrategy.isMarketOpen(date);
  }

  /**
   * Calculates the execution date/time for an order.
   */
  getNextMarketExecutionDate(date: Date = new Date()): Date {
    return this.marketScheduleStrategy.getNextMarketExecutionDate(date);
  }

  /**
   * Returns the effective stock price using the injected PriceResolutionStrategy.
   */
  getEffectiveStockPrice(ticker: string, customPrice?: number): number {
    return this.priceResolutionStrategy.resolvePrice(ticker, customPrice);
  }
}

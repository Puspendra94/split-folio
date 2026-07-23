import { Injectable, Inject } from '@nestjs/common';
import { ApiConfigService } from '../../shared/services/config.service';
import { PRICE_RESOLUTION_STRATEGY } from './market.constants';
import { IPriceResolutionStrategy } from './strategies/price-resolution.strategy.interface';

@Injectable()
export class MarketService {
  constructor(
    private readonly configService: ApiConfigService,
    @Inject(PRICE_RESOLUTION_STRATEGY)
    private readonly priceResolutionStrategy: IPriceResolutionStrategy,
  ) {}

  /**
   * Checks if the market is open on a given date.
   * Markets are open Monday through Friday.
   */
  isMarketOpen(date: Date = new Date()): boolean {
    const day = date.getDay();
    // 0 = Sunday, 6 = Saturday
    return day >= 1 && day <= 5;
  }

  /**
   * Calculates the execution date/time for an order.
   * If submitted on a market day (Mon-Fri), executes on the same day.
   * If submitted on a weekend (Sat/Sun), schedules for the next Monday at 09:00:00 UTC.
   */
  getNextMarketExecutionDate(date: Date = new Date()): Date {
    const executionDate = new Date(date);
    const day = executionDate.getDay();

    if (day === 6) {
      // Saturday -> Advance 2 days to Monday
      executionDate.setDate(executionDate.getDate() + 2);
      executionDate.setHours(9, 0, 0, 0);
    } else if (day === 0) {
      // Sunday -> Advance 1 day to Monday
      executionDate.setDate(executionDate.getDate() + 1);
      executionDate.setHours(9, 0, 0, 0);
    }

    return executionDate;
  }

  /**
   * Returns the effective stock price using the injected PriceResolutionStrategy.
   * If a custom market price is provided (> 0), it takes priority.
   * Otherwise, falls back to the default fixed stock price ($100).
   */
  getEffectiveStockPrice(ticker: string, customPrice?: number): number {
    return this.priceResolutionStrategy.resolvePrice(ticker, customPrice);
  }
}

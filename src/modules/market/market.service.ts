import { Injectable } from '@nestjs/common';
import { ApiConfigService } from '../../shared/services/config.service';

@Injectable()
export class MarketService {
  constructor(private readonly configService: ApiConfigService) {}

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
   * Returns the effective stock price.
   * If a custom market price is provided (> 0), it takes priority.
   * Otherwise, falls back to the default fixed stock price ($100).
   */
  getEffectiveStockPrice(ticker: string, customPrice?: number): number {
    if (
      customPrice !== undefined &&
      customPrice !== null &&
      !isNaN(customPrice) &&
      customPrice > 0
    ) {
      return customPrice;
    }
    return this.configService.defaultStockPrice;
  }
}

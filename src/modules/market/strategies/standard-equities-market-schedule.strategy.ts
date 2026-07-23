import { Injectable } from '@nestjs/common';
import { IMarketScheduleStrategy } from './market-schedule.strategy.interface';

@Injectable()
export class StandardEquitiesMarketScheduleStrategy implements IMarketScheduleStrategy {
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
}

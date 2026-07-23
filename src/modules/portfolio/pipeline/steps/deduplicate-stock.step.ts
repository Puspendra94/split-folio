import { Injectable } from '@nestjs/common';
import { PortfolioStockInput } from '../../portfolio.service';
import { IPortfolioStep } from '../portfolio-step.interface';

@Injectable()
export class DeduplicateStockStep implements IPortfolioStep {
  process(stocks: PortfolioStockInput[]): PortfolioStockInput[] {
    if (!stocks || !Array.isArray(stocks)) return [];
    const stockMap = new Map<string, PortfolioStockInput>();
    for (const s of stocks) {
      if (s && s.ticker) {
        stockMap.set(s.ticker, s);
      }
    }
    return Array.from(stockMap.values());
  }
}

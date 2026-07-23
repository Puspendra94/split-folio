import { Injectable } from '@nestjs/common';
import { PortfolioStockInput } from '../../portfolio.service';
import { IPortfolioStep } from '../portfolio-step.interface';

@Injectable()
export class NormalizeTickerStep implements IPortfolioStep {
  process(stocks: PortfolioStockInput[]): PortfolioStockInput[] {
    if (!stocks || !Array.isArray(stocks)) return [];
    return stocks
      .filter((s) => s && s.ticker)
      .map((s) => ({
        ...s,
        ticker: s.ticker.trim().toUpperCase(),
      }));
  }
}

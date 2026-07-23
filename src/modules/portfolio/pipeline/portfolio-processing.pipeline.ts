import { Injectable } from '@nestjs/common';
import { PortfolioStockInput } from '../portfolio.service';
import { NormalizeTickerStep } from './steps/normalize-ticker.step';
import { DeduplicateStockStep } from './steps/deduplicate-stock.step';

@Injectable()
export class PortfolioProcessingPipeline {
  constructor(
    private readonly normalizeTickerStep: NormalizeTickerStep,
    private readonly deduplicateStockStep: DeduplicateStockStep,
  ) {}

  execute(stocks: PortfolioStockInput[]): PortfolioStockInput[] {
    if (!stocks || !Array.isArray(stocks)) return [];
    let result = this.normalizeTickerStep.process(stocks);
    result = this.deduplicateStockStep.process(result);
    return result;
  }
}

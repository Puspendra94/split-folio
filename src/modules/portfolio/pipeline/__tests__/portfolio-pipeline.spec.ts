import { NormalizeTickerStep } from '../steps/normalize-ticker.step';
import { DeduplicateStockStep } from '../steps/deduplicate-stock.step';
import { PortfolioProcessingPipeline } from '../portfolio-processing.pipeline';

describe('PortfolioProcessingPipeline', () => {
  let normalizeStep: NormalizeTickerStep;
  let deduplicateStep: DeduplicateStockStep;
  let pipeline: PortfolioProcessingPipeline;

  beforeEach(() => {
    normalizeStep = new NormalizeTickerStep();
    deduplicateStep = new DeduplicateStockStep();
    pipeline = new PortfolioProcessingPipeline(normalizeStep, deduplicateStep);
  });

  it('should normalize tickers and deduplicate stocks keeping the last value', () => {
    const input = [
      { ticker: ' aapl ', allocationPercentage: 40 },
      { ticker: 'AAPL', allocationPercentage: 100 },
      { ticker: 'tsla', allocationPercentage: 50 },
    ];

    const result = pipeline.execute(input);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ ticker: 'AAPL', allocationPercentage: 100 });
    expect(result[1]).toEqual({ ticker: 'TSLA', allocationPercentage: 50 });
  });

  it('should handle empty or null inputs gracefully across pipeline steps', () => {
    expect(pipeline.execute(null as any)).toEqual([]);
    expect(pipeline.execute(undefined as any)).toEqual([]);
    expect(pipeline.execute([])).toEqual([]);

    expect(normalizeStep.process(null as any)).toEqual([]);
    expect(deduplicateStep.process(null as any)).toEqual([]);

    expect(
      deduplicateStep.process([
        null as any,
        { ticker: '', allocationPercentage: 10 } as any,
        { ticker: 'AAPL', allocationPercentage: 100 },
      ]),
    ).toEqual([{ ticker: 'AAPL', allocationPercentage: 100 }]);
  });
});

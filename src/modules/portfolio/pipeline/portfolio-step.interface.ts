import { PortfolioStockInput } from '../portfolio.service';

export interface IPortfolioStep {
  process(stocks: PortfolioStockInput[]): PortfolioStockInput[];
}

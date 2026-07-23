import { PortfolioStockEntity } from '../../modules/portfolio-stock/portfolio-stock.entity';

export interface IPortfolioStockRepository {
  create(data: Partial<PortfolioStockEntity>): PortfolioStockEntity;
  save(
    stock: PortfolioStockEntity | PortfolioStockEntity[],
  ): Promise<PortfolioStockEntity | PortfolioStockEntity[]>;
  find(options?: { where?: any; order?: any }): Promise<PortfolioStockEntity[]>;
  findOne(options: {
    where: { id: string };
    relations?: string[];
  }): Promise<PortfolioStockEntity | null>;
  remove(stock: PortfolioStockEntity): Promise<PortfolioStockEntity>;
}

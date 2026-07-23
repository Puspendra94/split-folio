import { PortfolioEntity } from '../../modules/portfolio/portfolio.entity';

export interface IPortfolioRepository {
  create(data: Partial<PortfolioEntity>): PortfolioEntity;
  save(
    portfolio: PortfolioEntity | PortfolioEntity[],
  ): Promise<PortfolioEntity>;
  find(options?: {
    relations?: string[];
    order?: any;
  }): Promise<PortfolioEntity[]>;
  findOne(options: {
    where: { id: string };
    relations?: string[];
  }): Promise<PortfolioEntity | null>;
  remove(portfolio: PortfolioEntity): Promise<PortfolioEntity>;
}

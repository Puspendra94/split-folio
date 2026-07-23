import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPortfolioStockRepository } from '../interfaces/portfolio-stock-repository.interface';
import { PortfolioStockEntity } from '../../modules/portfolio-stock/portfolio-stock.entity';

@Injectable()
export class TypeOrmPortfolioStockRepository implements IPortfolioStockRepository {
  constructor(
    @InjectRepository(PortfolioStockEntity)
    private readonly repo: Repository<PortfolioStockEntity>,
  ) {}

  create(data: Partial<PortfolioStockEntity>): PortfolioStockEntity {
    return this.repo.create(data);
  }

  save(
    stock: PortfolioStockEntity | PortfolioStockEntity[],
  ): Promise<PortfolioStockEntity | PortfolioStockEntity[]> {
    return this.repo.save(stock as any);
  }

  find(options?: {
    where?: any;
    order?: any;
  }): Promise<PortfolioStockEntity[]> {
    return this.repo.find(options as any);
  }

  findOne(options: {
    where: { id: string };
    relations?: string[];
  }): Promise<PortfolioStockEntity | null> {
    return this.repo.findOne(options as any);
  }

  remove(stock: PortfolioStockEntity): Promise<PortfolioStockEntity> {
    return this.repo.remove(stock);
  }
}

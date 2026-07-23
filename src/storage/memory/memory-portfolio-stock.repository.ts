import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IPortfolioStockRepository } from '../interfaces/portfolio-stock-repository.interface';
import { PortfolioStockEntity } from '../../modules/portfolio-stock/portfolio-stock.entity';
import { MemoryPortfolioRepository } from './memory-portfolio.repository';

@Injectable()
export class MemoryPortfolioStockRepository implements IPortfolioStockRepository {
  create(data: Partial<PortfolioStockEntity>): PortfolioStockEntity {
    const entity = new PortfolioStockEntity();
    Object.assign(entity, data);
    if (!entity.id) {
      entity.id = randomUUID();
    }
    if (!entity.createdAt) {
      entity.createdAt = new Date();
    }
    entity.updatedAt = new Date();
    return entity;
  }

  async save(
    stockInput: PortfolioStockEntity | PortfolioStockEntity[],
  ): Promise<PortfolioStockEntity | PortfolioStockEntity[]> {
    const isArray = Array.isArray(stockInput);
    const stocks = isArray ? stockInput : [stockInput];
    const savedStocks: PortfolioStockEntity[] = [];

    for (const stock of stocks) {
      if (!stock.id) {
        stock.id = randomUUID();
      }
      if (!stock.createdAt) {
        stock.createdAt = new Date();
      }
      stock.updatedAt = new Date();
      MemoryPortfolioRepository.stockStore.set(stock.id, stock);
      savedStocks.push(stock);
    }

    return isArray ? savedStocks : savedStocks[0];
  }

  async find(options?: {
    where?: any;
    order?: any;
  }): Promise<PortfolioStockEntity[]> {
    let list = Array.from(MemoryPortfolioRepository.stockStore.values());

    if (options?.where?.portfolio?.id) {
      const pId = options.where.portfolio.id;
      list = list.filter((s) => {
        const stockPId = s.portfolio?.id ?? (s as any).portfolioId;
        return stockPId === pId;
      });
    }

    return list.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  async findOne(options: {
    where: { id: string };
    relations?: string[];
  }): Promise<PortfolioStockEntity | null> {
    const stock = MemoryPortfolioRepository.stockStore.get(options.where.id);
    if (!stock) return null;
    return Object.assign(new PortfolioStockEntity(), stock);
  }

  async remove(stock: PortfolioStockEntity): Promise<PortfolioStockEntity> {
    MemoryPortfolioRepository.stockStore.delete(stock.id);
    return stock;
  }
}

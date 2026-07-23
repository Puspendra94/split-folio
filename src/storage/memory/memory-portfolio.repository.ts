import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IPortfolioRepository } from '../interfaces/portfolio-repository.interface';
import { PortfolioEntity } from '../../modules/portfolio/portfolio.entity';
import { PortfolioStockEntity } from '../../modules/portfolio-stock/portfolio-stock.entity';

@Injectable()
export class MemoryPortfolioRepository implements IPortfolioRepository {
  private readonly store = new Map<string, PortfolioEntity>();
  public static readonly stockStore = new Map<string, PortfolioStockEntity>();

  create(data: Partial<PortfolioEntity>): PortfolioEntity {
    const entity = new PortfolioEntity();
    Object.assign(entity, data);
    if (!entity.id) {
      entity.id = randomUUID();
    }
    if (!entity.createdAt) {
      entity.createdAt = new Date();
    }
    entity.updatedAt = new Date();
    if (!entity.stocks) {
      entity.stocks = [];
    }
    return entity;
  }

  async save(
    portfolioInput: PortfolioEntity | PortfolioEntity[],
  ): Promise<PortfolioEntity> {
    const portfolio = Array.isArray(portfolioInput)
      ? portfolioInput[0]
      : portfolioInput;

    if (!portfolio.id) {
      portfolio.id = randomUUID();
    }
    if (!portfolio.createdAt) {
      portfolio.createdAt = new Date();
    }
    portfolio.updatedAt = new Date();

    if (portfolio.stocks && Array.isArray(portfolio.stocks)) {
      const savedStocks: PortfolioStockEntity[] = [];
      for (const stockData of portfolio.stocks) {
        let stock = stockData;
        if (!stock.id) {
          stock.id = randomUUID();
        }
        stock.createdAt = stock.createdAt || new Date();
        stock.updatedAt = new Date();
        stock.portfolio = { id: portfolio.id } as any;
        MemoryPortfolioRepository.stockStore.set(stock.id, stock);
        savedStocks.push(stock);
      }
      portfolio.stocks = savedStocks;
    }

    this.store.set(portfolio.id, portfolio);
    return this.clone(portfolio);
  }

  async find(options?: {
    relations?: string[];
    order?: any;
  }): Promise<PortfolioEntity[]> {
    const list = Array.from(this.store.values()).map((p) => this.populate(p));
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async findOne(options: {
    where: { id: string };
    relations?: string[];
  }): Promise<PortfolioEntity | null> {
    const portfolio = this.store.get(options.where.id);
    if (!portfolio) return null;
    return this.populate(portfolio);
  }

  async remove(portfolio: PortfolioEntity): Promise<PortfolioEntity> {
    this.store.delete(portfolio.id);
    for (const [
      stockId,
      stock,
    ] of MemoryPortfolioRepository.stockStore.entries()) {
      const pId = stock.portfolio?.id ?? (stock as any).portfolioId;
      if (pId === portfolio.id) {
        MemoryPortfolioRepository.stockStore.delete(stockId);
      }
    }
    return portfolio;
  }

  private populate(portfolio: PortfolioEntity): PortfolioEntity {
    const cloned = this.clone(portfolio);
    const stocks: PortfolioStockEntity[] = [];
    for (const stock of MemoryPortfolioRepository.stockStore.values()) {
      const pId = stock.portfolio?.id ?? (stock as any).portfolioId;
      if (pId === portfolio.id) {
        stocks.push({ ...stock, portfolio: { id: portfolio.id } as any });
      }
    }
    if (stocks.length > 0) {
      cloned.stocks = stocks;
    } else if (!cloned.stocks) {
      cloned.stocks = [];
    }
    return cloned;
  }

  private clone(p: PortfolioEntity): PortfolioEntity {
    const copy = Object.assign(new PortfolioEntity(), p);
    if (p.stocks) {
      copy.stocks = p.stocks.map((s) =>
        Object.assign(new PortfolioStockEntity(), s),
      );
    }
    return copy;
  }
}

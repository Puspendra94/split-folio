import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { PortfolioStockEntity } from './portfolio-stock.entity';
import { PortfolioEntity } from '../portfolio/portfolio.entity';
import { ApiConfigService } from '../../shared/services/config.service';
import { CreatePortfolioStockDto } from './dto/create-portfolio-stock.dto';
import { UpdatePortfolioStockDto } from './dto/update-portfolio-stock.dto';
import { BatchUpsertStocksDto } from './dto/batch-upsert-stocks.dto';

export interface CalculatedStockSplit {
  ticker: string;
  allocationPercentage: number;
  pricePerShare: number;
  allocatedAmount: number;
  shareQuantity: number;
}

@Injectable()
export class PortfolioStockService {
  constructor(
    @InjectRepository(PortfolioStockEntity)
    private readonly portfolioStockRepository: Repository<PortfolioStockEntity>,
    @InjectRepository(PortfolioEntity)
    private readonly portfolioRepository: Repository<PortfolioEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ApiConfigService,
  ) {}

  /**
   * Recalculates and updates portfolio's allocatedWeight and isComplete status based on saved database stocks.
   * Can accept an optional transactional EntityManager to participate in an ongoing transaction.
   */
  async syncPortfolioWeightAndStatus(
    portfolioId: string,
    manager?: EntityManager,
  ): Promise<PortfolioEntity> {
    const portfolioRepo = manager
      ? manager.getRepository(PortfolioEntity)
      : this.portfolioRepository;

    const portfolio = await portfolioRepo.findOne({
      where: { id: portfolioId },
      relations: ['stocks'],
    });

    if (!portfolio) {
      throw new NotFoundException(
        `Portfolio with ID "${portfolioId}" not found`,
      );
    }

    const totalWeight = Number(
      (portfolio.stocks || [])
        .reduce((sum, s) => sum + Number(s.allocationPercentage), 0)
        .toFixed(2),
    );

    portfolio.allocatedWeight = totalWeight;
    portfolio.isComplete = Math.abs(totalWeight - 100) <= 0.01;

    return portfolioRepo.save(portfolio);
  }

  /**
   * Batch upserts stock records for a portfolio within an atomic database transaction.
   * Fetches existing stocks, merges with incoming stocks (existing.merge(new)),
   * validates total weight <= 100, batch saves stocks, and updates portfolio weight & status.
   * If any step fails, the entire transaction rolls back cleanly.
   */
  async batchUpsert(
    portfolioId: string,
    dto: BatchUpsertStocksDto,
  ): Promise<PortfolioEntity> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const portfolioRepo =
        transactionalEntityManager.getRepository(PortfolioEntity);
      const stockRepo =
        transactionalEntityManager.getRepository(PortfolioStockEntity);

      const portfolio = await portfolioRepo.findOne({
        where: { id: portfolioId },
        relations: ['stocks'],
      });

      if (!portfolio) {
        throw new NotFoundException(
          `Portfolio with ID "${portfolioId}" not found`,
        );
      }

      const existingStocks = portfolio.stocks || [];
      const stockMap = new Map<string, PortfolioStockEntity>();

      for (const s of existingStocks) {
        stockMap.set(s.ticker.trim().toUpperCase(), s);
      }

      const stocksToSave: PortfolioStockEntity[] = [];

      for (const incoming of dto.stocks) {
        const tickerKey = incoming.ticker.trim().toUpperCase();
        const existing = stockMap.get(tickerKey);

        if (existing) {
          // Merge/Replace existing stock values with incoming values
          existing.allocationPercentage = incoming.allocationPercentage;
          existing.customMarketPrice = incoming.customMarketPrice;
          stocksToSave.push(existing);
        } else {
          // Create new stock record
          const newStock = stockRepo.create({
            ticker: tickerKey,
            allocationPercentage: incoming.allocationPercentage,
            customMarketPrice: incoming.customMarketPrice,
            portfolio: { id: portfolioId } as any,
          });
          stockMap.set(tickerKey, newStock);
          stocksToSave.push(newStock);
        }
      }

      // Calculate total weight of all stocks in portfolio (merged set)
      const allMergedStocks = Array.from(stockMap.values());
      const totalWeight = Number(
        allMergedStocks
          .reduce((sum, s) => sum + Number(s.allocationPercentage || 0), 0)
          .toFixed(2),
      );

      if (totalWeight > 100) {
        throw new BadRequestException(
          `Total portfolio allocation weight cannot exceed 100%. Current total weight: ${totalWeight}%.`,
        );
      }

      // 1. Batch save stock records inside transaction
      await stockRepo.save(stocksToSave);

      // 2. Sync portfolio allocatedWeight and isComplete status inside the same transaction
      return this.syncPortfolioWeightAndStatus(
        portfolioId,
        transactionalEntityManager,
      );
    });
  }

  async create(
    portfolioId: string,
    dto: CreatePortfolioStockDto,
  ): Promise<PortfolioStockEntity> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
      relations: ['stocks'],
    });

    if (!portfolio) {
      throw new NotFoundException(
        `Portfolio with ID "${portfolioId}" not found`,
      );
    }

    const tickerKey = dto.ticker.trim().toUpperCase();
    const existingStocks = portfolio.stocks || [];
    const existingStock = existingStocks.find(
      (s) => s.ticker.trim().toUpperCase() === tickerKey,
    );

    let stockToSave: PortfolioStockEntity;
    let otherStocksTotal = 0;

    if (existingStock) {
      // Upsert existing stock record
      existingStock.allocationPercentage = dto.allocationPercentage;
      existingStock.customMarketPrice = dto.customMarketPrice;
      stockToSave = existingStock;

      otherStocksTotal = existingStocks
        .filter((s) => s.id !== existingStock.id)
        .reduce((sum, s) => sum + Number(s.allocationPercentage), 0);
    } else {
      // New stock record
      stockToSave = this.portfolioStockRepository.create({
        ticker: tickerKey,
        allocationPercentage: dto.allocationPercentage,
        customMarketPrice: dto.customMarketPrice,
        portfolio: { id: portfolioId } as any,
      });

      otherStocksTotal = existingStocks.reduce(
        (sum, s) => sum + Number(s.allocationPercentage),
        0,
      );
    }

    const newTotalWeight = Number(
      (otherStocksTotal + Number(dto.allocationPercentage)).toFixed(2),
    );

    if (newTotalWeight > 100) {
      throw new BadRequestException(
        `Total portfolio allocation weight cannot exceed 100%. Current total weight: ${newTotalWeight}%.`,
      );
    }

    const savedStock = await this.portfolioStockRepository.save(stockToSave);
    await this.syncPortfolioWeightAndStatus(portfolioId);
    return savedStock;
  }

  async findAllByPortfolio(
    portfolioId: string,
  ): Promise<PortfolioStockEntity[]> {
    return this.portfolioStockRepository.find({
      where: { portfolio: { id: portfolioId } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<PortfolioStockEntity> {
    const stock = await this.portfolioStockRepository.findOne({
      where: { id },
      relations: ['portfolio'],
    });

    if (!stock) {
      throw new NotFoundException(`Portfolio stock with ID "${id}" not found`);
    }

    return stock;
  }

  async update(
    id: string,
    dto: UpdatePortfolioStockDto,
  ): Promise<PortfolioStockEntity> {
    const stock = await this.findOne(id);

    if (dto.allocationPercentage !== undefined) {
      const portfolioId = stock.portfolio?.id;
      if (portfolioId) {
        const existingStocks = await this.findAllByPortfolio(portfolioId);
        const otherTotal = existingStocks
          .filter((s) => s.id !== id)
          .reduce((sum, s) => sum + Number(s.allocationPercentage), 0);
        const newTotal = Number(
          (otherTotal + Number(dto.allocationPercentage)).toFixed(2),
        );

        if (newTotal > 100) {
          throw new BadRequestException(
            `Total portfolio allocation weight cannot exceed 100%. Current total weight: ${newTotal}%.`,
          );
        }
      }
    }

    Object.assign(stock, dto);
    const updatedStock = await this.portfolioStockRepository.save(stock);

    if (stock.portfolio?.id) {
      await this.syncPortfolioWeightAndStatus(stock.portfolio.id);
    }

    return updatedStock;
  }

  async remove(id: string): Promise<{ message: string }> {
    const stock = await this.findOne(id);
    const portfolioId = stock.portfolio?.id;

    await this.portfolioStockRepository.remove(stock);

    if (portfolioId) {
      await this.syncPortfolioWeightAndStatus(portfolioId);
    }

    return { message: `Portfolio stock with ID "${id}" successfully deleted` };
  }

  /**
   * Resolves price per share for a stock.
   * Uses custom market price if provided and > 0, otherwise defaults to $100.
   */
  resolveStockPrice(ticker: string, customMarketPrice?: number | null): number {
    if (
      customMarketPrice !== undefined &&
      customMarketPrice !== null &&
      !isNaN(customMarketPrice) &&
      customMarketPrice > 0
    ) {
      return Number(customMarketPrice);
    }
    return this.configService.defaultStockPrice;
  }

  /**
   * Calculates the split amount and share quantity for an individual stock.
   */
  calculateStockSplit(
    ticker: string,
    allocationPercentage: number,
    totalAmount: number,
    customMarketPrice?: number | null,
    precisionOverride?: number,
  ): CalculatedStockSplit {
    const pricePerShare = this.resolveStockPrice(ticker, customMarketPrice);
    const allocatedAmount = totalAmount * (allocationPercentage / 100);
    const rawQuantity = allocatedAmount / pricePerShare;

    const precision =
      precisionOverride !== undefined
        ? precisionOverride
        : this.configService.shareDecimalPrecision;

    const factor = Math.pow(10, precision);
    const shareQuantity = Math.floor(rawQuantity * factor) / factor;

    return {
      ticker,
      allocationPercentage,
      pricePerShare: Number(pricePerShare.toFixed(2)),
      allocatedAmount: Number(allocatedAmount.toFixed(2)),
      shareQuantity,
    };
  }
}

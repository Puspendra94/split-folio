import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PORTFOLIO_STOCK_REPOSITORY,
  PORTFOLIO_REPOSITORY,
} from '../../storage/storage.constants';
import { IPortfolioStockRepository } from '../../storage/interfaces/portfolio-stock-repository.interface';
import { IPortfolioRepository } from '../../storage/interfaces/portfolio-repository.interface';
import { PortfolioStockEntity } from './portfolio-stock.entity';
import { PortfolioEntity } from '../portfolio/portfolio.entity';
import { CreatePortfolioStockDto } from './dto/create-portfolio-stock.dto';
import { UpdatePortfolioStockDto } from './dto/update-portfolio-stock.dto';
import { BatchUpsertStocksDto } from './dto/batch-upsert-stocks.dto';
import { ApiConfigService } from '../../shared/services/config.service';

export interface CalculatedStockSplit {
  ticker: string;
  allocationPercentage: number;
  pricePerShare: number;
  allocatedAmount: number;
  shareQuantity: number;
  precision: number;
}

@Injectable()
export class PortfolioStockService {
  constructor(
    @Inject(PORTFOLIO_STOCK_REPOSITORY)
    private readonly portfolioStockRepository: IPortfolioStockRepository,
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
    private readonly configService: ApiConfigService,
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  /**
   * Recalculates total allocated weight for a portfolio and updates its completion status.
   */
  async syncPortfolioWeightAndStatus(
    portfolioId: string,
    customPortfolioRepo?: IPortfolioRepository,
  ): Promise<PortfolioEntity> {
    const repo = customPortfolioRepo || this.portfolioRepository;
    const portfolio = await repo.findOne({
      where: { id: portfolioId },
      relations: ['stocks'],
    });

    if (!portfolio) {
      throw new NotFoundException(
        `Portfolio with ID "${portfolioId}" not found`,
      );
    }

    const stocks = portfolio.stocks || [];
    const totalWeight = Number(
      stocks
        .reduce((sum, s) => sum + Number(s.allocationPercentage), 0)
        .toFixed(2),
    );

    portfolio.allocatedWeight = totalWeight;
    portfolio.isComplete = Math.abs(totalWeight - 100) <= 0.01;

    return repo.save(portfolio);
  }

  /**
   * Batch upserts (creates or updates) multiple stocks in a model portfolio.
   */
  async batchUpsert(
    portfolioId: string,
    dto: BatchUpsertStocksDto,
  ): Promise<PortfolioEntity> {
    const executeUpsert = async (
      portfolioRepo: IPortfolioRepository,
      stockRepo: IPortfolioStockRepository,
    ) => {
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

      for (const item of dto.stocks) {
        const tickerKey = item.ticker.trim().toUpperCase();
        const existingStock = stockMap.get(tickerKey);

        if (existingStock) {
          existingStock.allocationPercentage = item.allocationPercentage;
          if (item.customMarketPrice !== undefined) {
            existingStock.customMarketPrice = item.customMarketPrice;
          }
          stocksToSave.push(existingStock);
        } else {
          const newStock = stockRepo.create({
            ticker: tickerKey,
            allocationPercentage: item.allocationPercentage,
            customMarketPrice: item.customMarketPrice,
            portfolio: { id: portfolioId } as any,
          });
          stockMap.set(tickerKey, newStock);
          stocksToSave.push(newStock);
        }
      }

      const allMergedStocks = Array.from(stockMap.values());
      const totalWeight = Number(
        allMergedStocks
          .reduce((sum, s) => sum + Number(s.allocationPercentage), 0)
          .toFixed(2),
      );

      if (totalWeight > 100) {
        throw new BadRequestException(
          `Total portfolio allocation weight cannot exceed 100%. Current total weight: ${totalWeight}%.`,
        );
      }

      await stockRepo.save(stocksToSave);
      return this.syncPortfolioWeightAndStatus(portfolioId, portfolioRepo);
    };

    if (this.dataSource && this.dataSource.isInitialized) {
      return this.dataSource.transaction(async (manager) => {
        return executeUpsert(
          manager.getRepository(PortfolioEntity) as any,
          manager.getRepository(PortfolioStockEntity) as any,
        );
      });
    }

    return executeUpsert(
      this.portfolioRepository,
      this.portfolioStockRepository,
    );
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
      existingStock.allocationPercentage = dto.allocationPercentage;
      existingStock.customMarketPrice = dto.customMarketPrice;
      stockToSave = existingStock;

      otherStocksTotal = existingStocks
        .filter((s) => s.id !== existingStock.id)
        .reduce((sum, s) => sum + Number(s.allocationPercentage), 0);
    } else {
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

    const savedStock = (await this.portfolioStockRepository.save(
      stockToSave,
    )) as PortfolioStockEntity;

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
      stock.allocationPercentage = dto.allocationPercentage;
    }

    if (dto.customMarketPrice !== undefined) {
      stock.customMarketPrice = dto.customMarketPrice;
    }

    const savedStock = (await this.portfolioStockRepository.save(
      stock,
    )) as PortfolioStockEntity;

    if (stock.portfolio?.id) {
      await this.syncPortfolioWeightAndStatus(stock.portfolio.id);
    }

    return savedStock;
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
   * Resolves the market price for a given stock ticker.
   */
  resolveStockPrice(ticker: string, customMarketPrice?: number | null): number {
    if (customMarketPrice !== undefined && customMarketPrice !== null) {
      return Number(customMarketPrice);
    }
    return this.configService.defaultStockPrice;
  }

  /**
   * Calculates investment allocation and share quantities for a single stock.
   */
  calculateStockSplit(
    ticker: string,
    allocationPercentage: number,
    totalAmount: number,
    customMarketPrice?: number | null,
    precisionOverride?: number,
  ): CalculatedStockSplit {
    const pricePerShare = this.resolveStockPrice(ticker, customMarketPrice);
    const allocatedAmount = Number(
      (totalAmount * (allocationPercentage / 100)).toFixed(2),
    );

    const precision =
      precisionOverride !== undefined
        ? precisionOverride
        : this.configService.shareDecimalPrecision;

    const rawShares = allocatedAmount / pricePerShare;
    const shareQuantity = Number(rawShares.toFixed(precision));

    return {
      ticker: ticker.trim().toUpperCase(),
      allocationPercentage,
      pricePerShare,
      allocatedAmount,
      shareQuantity,
      precision,
    };
  }
}

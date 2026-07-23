import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PORTFOLIO_REPOSITORY } from '../../storage/storage.constants';
import { IPortfolioRepository } from '../../storage/interfaces/portfolio-repository.interface';
import { PortfolioEntity } from './portfolio.entity';
import {
  PortfolioStockService,
  CalculatedStockSplit,
} from '../portfolio-stock/portfolio-stock.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

export interface PortfolioStockInput {
  ticker: string;
  allocationPercentage: number;
  customMarketPrice?: number | null;
}

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
    private readonly portfolioStockService: PortfolioStockService,
  ) {}

  private deduplicatePortfolioInputs(
    stocks: PortfolioStockInput[],
  ): PortfolioStockInput[] {
    if (!stocks || !Array.isArray(stocks)) return [];
    const stockMap = new Map<string, PortfolioStockInput>();
    for (const s of stocks) {
      if (s && s.ticker) {
        stockMap.set(s.ticker.trim().toUpperCase(), s);
      }
    }
    return Array.from(stockMap.values());
  }

  async create(dto: CreatePortfolioDto): Promise<PortfolioEntity> {
    const deduplicatedStocks = this.deduplicatePortfolioInputs(
      dto.stocks || [],
    );
    const totalWeight = Number(
      deduplicatedStocks
        .reduce((sum, s) => sum + Number(s.allocationPercentage), 0)
        .toFixed(2),
    );

    if (totalWeight > 100) {
      throw new BadRequestException(
        `Total portfolio allocation weight cannot exceed 100%. Current total weight: ${totalWeight}%.`,
      );
    }

    const portfolio = this.portfolioRepository.create({
      name: dto.name || 'Model Portfolio',
      allocatedWeight: totalWeight,
      isComplete: Math.abs(totalWeight - 100) <= 0.01,
      stocks: deduplicatedStocks.map((stock) => ({
        ticker: stock.ticker.trim().toUpperCase(),
        allocationPercentage: stock.allocationPercentage,
        customMarketPrice: stock.customMarketPrice,
      })) as any,
    });

    return this.portfolioRepository.save(portfolio);
  }

  async findAll(): Promise<PortfolioEntity[]> {
    return this.portfolioRepository.find({
      relations: ['stocks'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PortfolioEntity> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: ['stocks'],
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID "${id}" not found`);
    }

    return portfolio;
  }

  async update(id: string, dto: UpdatePortfolioDto): Promise<PortfolioEntity> {
    const portfolio = await this.findOne(id);

    if (dto.name !== undefined) {
      portfolio.name = dto.name;
    }

    if (dto.stocks !== undefined) {
      const deduplicatedStocks = this.deduplicatePortfolioInputs(
        dto.stocks || [],
      );
      const totalWeight = Number(
        deduplicatedStocks
          .reduce((sum, s) => sum + Number(s.allocationPercentage), 0)
          .toFixed(2),
      );

      if (totalWeight > 100) {
        throw new BadRequestException(
          `Total portfolio allocation weight cannot exceed 100%. Current total weight: ${totalWeight}%.`,
        );
      }

      portfolio.stocks = deduplicatedStocks.map((stock) => ({
        ticker: stock.ticker.trim().toUpperCase(),
        allocationPercentage: stock.allocationPercentage,
        customMarketPrice: stock.customMarketPrice,
      })) as any;

      portfolio.allocatedWeight = totalWeight;
      portfolio.isComplete = Math.abs(totalWeight - 100) <= 0.01;
    }

    return this.portfolioRepository.save(portfolio);
  }

  async remove(id: string): Promise<{ message: string }> {
    const portfolio = await this.findOne(id);
    await this.portfolioRepository.remove(portfolio);
    return { message: `Portfolio with ID "${id}" successfully deleted` };
  }

  /**
   * Validates that stock allocation percentages sum up to 100%.
   */
  validatePortfolioAllocations(stocks: PortfolioStockInput[]): void {
    if (!stocks || stocks.length === 0) {
      throw new BadRequestException(
        'Portfolio must contain at least one stock allocation',
      );
    }

    const totalAllocation = stocks.reduce(
      (sum, s) => sum + Number(s.allocationPercentage),
      0,
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new BadRequestException(
        `Total portfolio allocation percentage must equal 100%. Current total: ${totalAllocation}%`,
      );
    }
  }

  /**
   * Processes a model portfolio against a total investment amount.
   */
  splitPortfolio(
    stocks: PortfolioStockInput[],
    totalAmount: number,
    precisionOverride?: number,
  ): CalculatedStockSplit[] {
    const deduplicatedStocks = this.deduplicatePortfolioInputs(stocks);
    this.validatePortfolioAllocations(deduplicatedStocks);

    return deduplicatedStocks.map((stock) =>
      this.portfolioStockService.calculateStockSplit(
        stock.ticker,
        stock.allocationPercentage,
        totalAmount,
        stock.customMarketPrice,
        precisionOverride,
      ),
    );
  }
}

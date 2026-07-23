import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  PORTFOLIO_STOCK_REPOSITORY,
  PORTFOLIO_REPOSITORY,
} from '../../../storage/storage.constants';
import { PortfolioStockService } from '../portfolio-stock.service';
import { PortfolioStockEntity } from '../portfolio-stock.entity';
import { PortfolioEntity } from '../../portfolio/portfolio.entity';
import { ApiConfigService } from '../../../shared/services/config.service';

describe('PortfolioStockService', () => {
  let service: PortfolioStockService;
  let repository: any;
  let portfolioRepository: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve(
            Array.isArray(entity)
              ? entity.map((e, idx) => ({ id: `stock-${idx}`, ...e }))
              : { id: 'stock-123', ...entity },
          ),
        ),
      find: jest.fn().mockResolvedValue([
        { id: 'stock-123', ticker: 'AAPL', allocationPercentage: 60 },
        { id: 'stock-456', ticker: 'TSLA', allocationPercentage: 40 },
      ]),
      findOne: jest.fn().mockResolvedValue({
        id: 'stock-123',
        ticker: 'AAPL',
        allocationPercentage: 60,
        portfolio: { id: 'port-123' },
      }),
      remove: jest.fn().mockResolvedValue(true),
    };

    portfolioRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'port-123',
        allocatedWeight: 100,
        isComplete: true,
        stocks: [
          { id: 'stock-123', ticker: 'AAPL', allocationPercentage: 60 },
          { id: 'stock-456', ticker: 'TSLA', allocationPercentage: 40 },
        ],
      }),
      save: jest
        .fn()
        .mockImplementation((portfolio) => Promise.resolve(portfolio)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioStockService,
        {
          provide: PORTFOLIO_STOCK_REPOSITORY,
          useValue: repository,
        },
        {
          provide: PORTFOLIO_REPOSITORY,
          useValue: portfolioRepository,
        },
        {
          provide: DataSource,
          useValue: {
            isInitialized: true,
            transaction: jest.fn().mockImplementation(async (cb) => {
              const manager = {
                getRepository: (entity: any) => {
                  if (entity === PortfolioEntity) return portfolioRepository;
                  if (entity === PortfolioStockEntity) return repository;
                  return null;
                },
              };
              return cb(manager);
            }),
          },
        },
        {
          provide: ApiConfigService,
          useValue: {
            defaultStockPrice: 100,
            shareDecimalPrecision: 3,
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioStockService>(PortfolioStockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncPortfolioWeightAndStatus', () => {
    it('should throw NotFoundException if portfolio does not exist', async () => {
      portfolioRepository.findOne.mockResolvedValue(null);
      await expect(
        service.syncPortfolioWeightAndStatus('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate weight and set isComplete to true if weight is 100%', async () => {
      const result = await service.syncPortfolioWeightAndStatus('port-123');
      expect(result.allocatedWeight).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should handle sync when portfolio.stocks is null or undefined', async () => {
      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: null,
      });

      const result = await service.syncPortfolioWeightAndStatus('port-123');
      expect(result.allocatedWeight).toBe(0);
      expect(result.isComplete).toBe(false);
    });
  });

  describe('batchUpsert', () => {
    it('should throw NotFoundException if portfolio does not exist', async () => {
      portfolioRepository.findOne.mockResolvedValue(null);
      await expect(
        service.batchUpsert('invalid-id', {
          stocks: [{ ticker: 'AAPL', allocationPercentage: 50 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should merge existing stock and update portfolio status inside a transaction', async () => {
      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: [
          { id: 'stock-123', ticker: 'AAPL', allocationPercentage: 60 },
          { id: 'stock-456', ticker: 'TSLA', allocationPercentage: 40 },
        ],
      });

      const result = await service.batchUpsert('port-123', {
        stocks: [
          { ticker: 'AAPL', allocationPercentage: 50, customMarketPrice: 150 },
          { ticker: 'TSLA', allocationPercentage: 50 },
        ],
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.allocatedWeight).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should batchUpsert when stock has falsy allocationPercentage (0)', async () => {
      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: [{ id: 'stock-123', ticker: 'AAPL', allocationPercentage: 0 }],
      });

      const result = await service.batchUpsert('port-123', {
        stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.allocatedWeight).toBe(100);
    });

    it('should batchUpsert when dataSource is uninitialized or not provided (inmemory mode)', async () => {
      const inMemoryService = new PortfolioStockService(
        repository,
        portfolioRepository,
        { defaultStockPrice: 100, shareDecimalPrecision: 3 } as any,
        undefined,
      );

      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: [
          { id: 'stock-123', ticker: 'AAPL', allocationPercentage: 60 },
          { id: 'stock-456', ticker: 'TSLA', allocationPercentage: 40 },
        ],
      });

      const result = await inMemoryService.batchUpsert('port-123', {
        stocks: [
          { ticker: 'AAPL', allocationPercentage: 50 },
          { ticker: 'TSLA', allocationPercentage: 50 },
        ],
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.allocatedWeight).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should handle batchUpsert when portfolio.stocks is null', async () => {
      portfolioRepository.findOne
        .mockResolvedValueOnce({
          id: 'port-123',
          stocks: null,
        })
        .mockResolvedValueOnce({
          id: 'port-123',
          stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
        });

      const result = await service.batchUpsert('port-123', {
        stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.allocatedWeight).toBe(100);
    });

    it('should throw BadRequestException if merged total weight > 100%', async () => {
      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: [
          { id: 'stock-123', ticker: 'AAPL', allocationPercentage: 60 },
          { id: 'stock-456', ticker: 'TSLA', allocationPercentage: 40 },
        ],
      });

      await expect(
        service.batchUpsert('port-123', {
          stocks: [{ ticker: 'GOOGL', allocationPercentage: 20 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if portfolio does not exist', async () => {
      portfolioRepository.findOne.mockResolvedValue(null);
      await expect(
        service.create('invalid-id', {
          ticker: 'AAPL',
          allocationPercentage: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create and save stock entity when total allocation <= 100%', async () => {
      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: [{ id: 'stock-123', ticker: 'AAPL', allocationPercentage: 50 }],
      });

      const dto = { ticker: 'GOOGL', allocationPercentage: 50 };
      const result = await service.create('port-123', dto);

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.id).toBe('stock-123');
    });

    it('should handle create when portfolio.stocks is null', async () => {
      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: null,
      });

      const dto = { ticker: 'AAPL', allocationPercentage: 100 };
      const result = await service.create('port-123', dto);
      expect(result.id).toBe('stock-123');
    });

    it('should upsert existing stock if ticker matches', async () => {
      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: [
          { id: 'stock-123', ticker: 'AAPL', allocationPercentage: 60 },
          { id: 'stock-456', ticker: 'TSLA', allocationPercentage: 40 },
        ],
      });

      const dto = { ticker: 'AAPL', allocationPercentage: 50 };
      const result = await service.create('port-123', dto);
      expect(result.id).toBe('stock-123');
    });

    it('should throw BadRequestException if adding stock causes total allocation to exceed 100%', async () => {
      portfolioRepository.findOne.mockResolvedValue({
        id: 'port-123',
        stocks: [
          { id: 'stock-123', ticker: 'AAPL', allocationPercentage: 60 },
          { id: 'stock-456', ticker: 'TSLA', allocationPercentage: 40 },
        ],
      });

      const dto = { ticker: 'GOOGL', allocationPercentage: 10 };
      await expect(service.create('port-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllByPortfolio', () => {
    it('should return list of stocks in portfolio', async () => {
      const result = await service.findAllByPortfolio('port-123');
      expect(repository.find).toHaveBeenCalledWith({
        where: { portfolio: { id: 'port-123' } },
        order: { createdAt: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return stock if found', async () => {
      const result = await service.findOne('stock-123');
      expect(result.id).toBe('stock-123');
    });

    it('should throw NotFoundException if stock does not exist', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update stock fields when new total allocation <= 100%', async () => {
      repository.findOne.mockResolvedValue({
        id: 'stock-123',
        ticker: 'AAPL',
        portfolio: { id: 'port-123' },
      });
      repository.find.mockResolvedValue([
        { id: 'stock-123', allocationPercentage: 60 },
        { id: 'stock-456', allocationPercentage: 40 },
      ]);

      const result = await service.update('stock-123', {
        allocationPercentage: 50,
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.allocationPercentage).toBe(50);
    });

    it('should update stock when allocationPercentage is omitted', async () => {
      repository.findOne.mockResolvedValue({
        id: 'stock-123',
        ticker: 'AAPL',
        customMarketPrice: 100,
        portfolio: { id: 'port-123' },
      });

      const result = await service.update('stock-123', {
        customMarketPrice: 150,
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.customMarketPrice).toBe(150);
    });

    it('should update stock when portfolio relation is not loaded', async () => {
      repository.findOne.mockResolvedValue({
        id: 'stock-123',
        ticker: 'AAPL',
      });

      const result = await service.update('stock-123', {
        allocationPercentage: 50,
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.allocationPercentage).toBe(50);
    });

    it('should throw BadRequestException if updating stock causes total allocation to exceed 100%', async () => {
      repository.findOne.mockResolvedValue({
        id: 'stock-123',
        ticker: 'AAPL',
        portfolio: { id: 'port-123' },
      });
      repository.find.mockResolvedValue([
        { id: 'stock-123', allocationPercentage: 60 },
        { id: 'stock-456', allocationPercentage: 40 },
      ]);

      await expect(
        service.update('stock-123', { allocationPercentage: 70 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete stock entity and sync portfolio weight', async () => {
      repository.findOne.mockResolvedValue({
        id: 'stock-123',
        portfolio: { id: 'port-123' },
      });
      const result = await service.remove('stock-123');

      expect(repository.remove).toHaveBeenCalled();
      expect(result.message).toContain('successfully deleted');
    });

    it('should remove stock when portfolio relation is null or undefined', async () => {
      repository.findOne.mockResolvedValue({
        id: 'stock-standalone',
        portfolio: null,
      });

      const result = await service.remove('stock-standalone');
      expect(repository.remove).toHaveBeenCalled();
      expect(result.message).toContain('successfully deleted');
    });
  });

  describe('resolveStockPrice', () => {
    it('should return default stock price if custom market price is not provided', () => {
      const price = service.resolveStockPrice('AAPL');
      expect(price).toBe(100);
    });

    it('should return custom market price if provided and valid', () => {
      const price = service.resolveStockPrice('AAPL', 150.75);
      expect(price).toBe(150.75);
    });
  });

  describe('calculateStockSplit', () => {
    it('should calculate allocation amount and share quantity correctly', () => {
      const split = service.calculateStockSplit('AAPL', 50, 1000);
      expect(split.allocatedAmount).toBe(500);
      expect(split.shareQuantity).toBe(5);
    });

    it('should calculate share quantity with precision override', () => {
      const split = service.calculateStockSplit('AAPL', 50, 1000, null, 4);
      expect(split.shareQuantity).toBe(5);
    });
  });
});

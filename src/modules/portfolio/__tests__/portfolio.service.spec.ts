import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PortfolioService } from '../portfolio.service';
import { PortfolioEntity } from '../portfolio.entity';
import { PortfolioStockService } from '../../portfolio-stock/portfolio-stock.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let repository: any;
  let portfolioStockService: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: 'port-123', ...entity }),
        ),
      find: jest
        .fn()
        .mockResolvedValue([{ id: 'port-123', name: 'Tech Growth' }]),
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'port-123', name: 'Tech Growth' }),
      remove: jest.fn().mockResolvedValue(true),
    };

    portfolioStockService = {
      calculateStockSplit: jest
        .fn()
        .mockImplementation((ticker, pct, amt, price, prec) => ({
          ticker,
          allocationPercentage: pct,
          pricePerShare: 100,
          allocatedAmount: amt * (pct / 100),
          shareQuantity: (amt * (pct / 100)) / 100,
          precision: prec,
        })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: getRepositoryToken(PortfolioEntity),
          useValue: repository,
        },
        {
          provide: PortfolioStockService,
          useValue: portfolioStockService,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save portfolio with allocatedWeight and isComplete status', async () => {
      const dto = {
        name: 'Tech Growth',
        stocks: [
          { ticker: 'AAPL', allocationPercentage: 60 },
          { ticker: 'TSLA', allocationPercentage: 40 },
        ],
      };

      const result = await service.create(dto);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.id).toBe('port-123');
      expect(result.allocatedWeight).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should set isComplete to false if allocatedWeight < 100%', async () => {
      const dto = {
        name: 'Partial Growth',
        stocks: [{ ticker: 'AAPL', allocationPercentage: 60 }],
      };

      const result = await service.create(dto);
      expect(result.allocatedWeight).toBe(60);
      expect(result.isComplete).toBe(false);
    });

    it('should throw BadRequestException if total weight > 100%', async () => {
      const dto = {
        stocks: [
          { ticker: 'AAPL', allocationPercentage: 60 },
          { ticker: 'TSLA', allocationPercentage: 50 },
        ],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should default name to Model Portfolio if name is omitted', async () => {
      const dto = {
        stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      };

      const result = await service.create(dto as any);
      expect(result.name).toBe('Model Portfolio');
    });
  });

  describe('findAll', () => {
    it('should return list of portfolios with stocks', async () => {
      const result = await service.findAll();
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['stocks'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return portfolio if found', async () => {
      const result = await service.findOne('port-123');
      expect(result.id).toBe('port-123');
    });

    it('should throw NotFoundException if portfolio does not exist', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update name and stock allocations if provided', async () => {
      repository.findOne.mockResolvedValue({ id: 'port-123', name: 'Tech' });
      const result = await service.update('port-123', {
        name: 'Tech Dividend',
        stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Tech Dividend');
      expect(result.allocatedWeight).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should throw BadRequestException if update total weight > 100%', async () => {
      repository.findOne.mockResolvedValue({ id: 'port-123', name: 'Tech' });
      await expect(
        service.update('port-123', {
          stocks: [
            { ticker: 'AAPL', allocationPercentage: 70 },
            { ticker: 'TSLA', allocationPercentage: 40 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update only name if stocks are omitted', async () => {
      repository.findOne.mockResolvedValue({ id: 'port-123', name: 'Tech' });
      const result = await service.update('port-123', {
        name: 'New Name Only',
      });

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name Only');
    });
  });

  describe('remove', () => {
    it('should remove portfolio entity', async () => {
      repository.findOne.mockResolvedValue({ id: 'port-123' });
      const result = await service.remove('port-123');

      expect(repository.remove).toHaveBeenCalled();
      expect(result.message).toContain('successfully deleted');
    });
  });

  describe('validatePortfolioAllocations', () => {
    it('should throw BadRequestException if stocks array is empty', () => {
      expect(() => service.validatePortfolioAllocations([])).toThrow(
        BadRequestException,
      );
      expect(() => service.validatePortfolioAllocations(null as any)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if total allocation does not equal 100%', () => {
      expect(() =>
        service.validatePortfolioAllocations([
          { ticker: 'AAPL', allocationPercentage: 50 },
          { ticker: 'TSLA', allocationPercentage: 40 },
        ]),
      ).toThrow(BadRequestException);
    });

    it('should pass validation if total allocation equals 100%', () => {
      expect(() =>
        service.validatePortfolioAllocations([
          { ticker: 'AAPL', allocationPercentage: 60 },
          { ticker: 'TSLA', allocationPercentage: 40 },
        ]),
      ).not.toThrow();
    });
  });

  describe('splitPortfolio', () => {
    it('should split total investment across stocks based on allocations', () => {
      const result = service.splitPortfolio(
        [
          { ticker: 'AAPL', allocationPercentage: 60 },
          { ticker: 'TSLA', allocationPercentage: 40 },
        ],
        100,
      );

      expect(result).toHaveLength(2);
      expect(result[0].allocatedAmount).toBe(60);
      expect(result[1].allocatedAmount).toBe(40);
    });

    it('should split portfolio with precision override parameter', () => {
      const result = service.splitPortfolio(
        [{ ticker: 'AAPL', allocationPercentage: 100 }],
        100,
        4,
      );

      expect(portfolioStockService.calculateStockSplit).toHaveBeenCalledWith(
        'AAPL',
        100,
        100,
        undefined,
        4,
      );
      expect(result).toHaveLength(1);
    });
  });
});

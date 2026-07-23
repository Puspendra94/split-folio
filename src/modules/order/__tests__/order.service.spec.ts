import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../storage/storage.constants';
import { OrderService } from '../order.service';
import { OrderStatusEnum } from '../order.entity';
import { PortfolioService } from '../../portfolio/portfolio.service';
import { MarketService } from '../../market/market.service';
import { OrderFactory } from '../factories/order.factory';
import { OrderTypeEnum } from '../../../common/constants/order-type.enum';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: any;
  let portfolioService: any;
  let marketService: any;

  beforeEach(async () => {
    orderRepository = {
      save: jest.fn().mockImplementation((order) =>
        Promise.resolve({
          id: 'test-uuid-1234',
          ...order,
          createdAt: new Date(),
        }),
      ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    portfolioService = {
      findOne: jest.fn().mockResolvedValue({
        id: 'port-123',
        allocatedWeight: 100,
        isComplete: true,
        stocks: [
          { ticker: 'AAPL', allocationPercentage: 60, customMarketPrice: null },
          { ticker: 'TSLA', allocationPercentage: 40, customMarketPrice: null },
        ],
      }),
      splitPortfolio: jest.fn().mockReturnValue([
        {
          ticker: 'AAPL',
          allocationPercentage: 60,
          pricePerShare: 100,
          allocatedAmount: 60,
          shareQuantity: 0.6,
        },
        {
          ticker: 'TSLA',
          allocationPercentage: 40,
          pricePerShare: 100,
          allocatedAmount: 40,
          shareQuantity: 0.4,
        },
      ]),
    };

    marketService = {
      getNextMarketExecutionDate: jest
        .fn()
        .mockReturnValue(new Date('2026-07-22T09:00:00Z')),
      isMarketOpen: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderFactory,
        OrderService,
        {
          provide: ORDER_REPOSITORY,
          useValue: orderRepository,
        },
        {
          provide: PortfolioService,
          useValue: portfolioService,
        },
        {
          provide: MarketService,
          useValue: marketService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('splitAndCreateOrder', () => {
    it('should split order using inline portfolio array', async () => {
      const dto = {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolio: [
          { ticker: 'AAPL', allocationPercentage: 60 },
          { ticker: 'TSLA', allocationPercentage: 40 },
        ],
      };

      const result = await service.splitAndCreateOrder(dto);

      expect(portfolioService.splitPortfolio).toHaveBeenCalledWith(
        dto.portfolio,
        100,
        undefined,
      );
      expect(marketService.getNextMarketExecutionDate).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('test-uuid-1234');
      expect(result.orderType).toBe(OrderTypeEnum.BUY);
      expect(result.status).toBe(OrderStatusEnum.EXECUTED);
      expect(result.items).toHaveLength(2);
    });

    it('should split order using portfolioId when portfolio is found and complete', async () => {
      const dto = {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolioId: 'port-123',
      };

      const result = await service.splitAndCreateOrder(dto);

      expect(portfolioService.findOne).toHaveBeenCalledWith('port-123');
      expect(portfolioService.splitPortfolio).toHaveBeenCalledWith(
        [
          { ticker: 'AAPL', allocationPercentage: 60, customMarketPrice: null },
          { ticker: 'TSLA', allocationPercentage: 40, customMarketPrice: null },
        ],
        100,
        undefined,
      );
      expect(result.id).toBe('test-uuid-1234');
    });

    it('should handle portfolioId when portfolio.stocks is null or undefined', async () => {
      portfolioService.findOne.mockResolvedValue({
        id: 'port-no-stocks',
        allocatedWeight: 100,
        isComplete: true,
        stocks: null,
      });

      portfolioService.splitPortfolio.mockReturnValue([]);

      const dto = {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolioId: 'port-no-stocks',
      };

      const result = await service.splitAndCreateOrder(dto);
      expect(portfolioService.splitPortfolio).toHaveBeenCalledWith(
        [],
        100,
        undefined,
      );
      expect(result.id).toBe('test-uuid-1234');
    });

    it('should throw BadRequestException if portfolio found via portfolioId is not complete', async () => {
      portfolioService.findOne.mockResolvedValue({
        id: 'port-incomplete',
        allocatedWeight: 60,
        isComplete: false,
        stocks: [{ ticker: 'AAPL', allocationPercentage: 60 }],
      });

      const dto = {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolioId: 'port-incomplete',
      };

      await expect(service.splitAndCreateOrder(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set status to SCHEDULED when market is closed', async () => {
      marketService.isMarketOpen.mockReturnValue(false);

      const dto = {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolio: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      };

      const result = await service.splitAndCreateOrder(dto);
      expect(result.status).toBe(OrderStatusEnum.SCHEDULED);
    });
  });

  describe('getHistoricOrders', () => {
    it('should return list of historic orders', async () => {
      await service.getHistoricOrders();
      expect(orderRepository.find).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return order if found', async () => {
      const mockOrder = { id: 'test-uuid-1234' };
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrderById('test-uuid-1234');
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrderById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../order.controller';
import { OrderService } from '../order.service';
import { OrderTypeEnum } from '../../../common/constants/order-type.enum';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            splitAndCreateOrder: jest.fn().mockImplementation((dto) =>
              Promise.resolve({
                id: 'test-uuid-123',
                ...dto,
              }),
            ),
            getHistoricOrders: jest.fn().mockResolvedValue([]),
            getOrderById: jest.fn().mockResolvedValue({ id: 'test-uuid-123' }),
          },
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('splitOrder', () => {
    it('should delegate order creation to OrderService for splitOrder', async () => {
      const dto = {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolio: [
          { ticker: 'AAPL', allocationPercentage: 60 },
          { ticker: 'TSLA', allocationPercentage: 40 },
        ],
      };

      const result = await controller.splitOrder(dto);
      expect(service.splitAndCreateOrder).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('test-uuid-123');
    });

    it('should delegate order creation to OrderService for createOrder', async () => {
      const dto = {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolio: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      };

      const result = await controller.createOrder(dto);
      expect(service.splitAndCreateOrder).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('test-uuid-123');
    });
  });

  describe('getHistoricOrders', () => {
    it('should return historic orders list', async () => {
      const result = await controller.getHistoricOrders();
      expect(service.getHistoricOrders).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getOrderById', () => {
    it('should return single order by id', async () => {
      const result = await controller.getOrderById('test-uuid-123');
      expect(service.getOrderById).toHaveBeenCalledWith('test-uuid-123');
      expect(result).toEqual({ id: 'test-uuid-123' });
    });
  });
});

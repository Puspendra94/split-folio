import { OrderFactory } from '../order.factory';
import { OrderTypeEnum } from '../../../../common/constants/order-type.enum';
import { OrderStatusEnum } from '../../order.entity';

describe('OrderFactory', () => {
  let factory: OrderFactory;

  beforeEach(() => {
    factory = new OrderFactory();
  });

  it('should create an OrderEntity using OrderBuilder', () => {
    const date = new Date('2026-07-24T09:00:00Z');
    const order = factory.createOrder({
      orderType: OrderTypeEnum.BUY,
      totalAmount: 5000,
      scheduledExecutionDate: date,
      status: OrderStatusEnum.EXECUTED,
      calculatedSplits: [
        {
          ticker: 'TSLA',
          allocationPercentage: 100,
          pricePerShare: 100,
          allocatedAmount: 5000,
          shareQuantity: 50,
          precision: 3,
        },
      ],
    });

    expect(order.orderType).toBe(OrderTypeEnum.BUY);
    expect(order.totalAmount).toBe(5000);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].ticker).toBe('TSLA');
  });
});

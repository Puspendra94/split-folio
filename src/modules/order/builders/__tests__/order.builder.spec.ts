import { OrderBuilder } from '../order.builder';
import { OrderTypeEnum } from '../../../../common/constants/order-type.enum';
import { OrderStatusEnum } from '../../order.entity';

describe('OrderBuilder', () => {
  it('should build an order entity with fluent methods', () => {
    const date = new Date('2026-07-24T09:00:00Z');
    const order = new OrderBuilder()
      .setOrderType(OrderTypeEnum.BUY)
      .setTotalAmount(1000)
      .setScheduledExecutionDate(date)
      .setStatus(OrderStatusEnum.EXECUTED)
      .addItem({
        ticker: 'AAPL',
        allocationPercentage: 100,
        pricePerShare: 100,
        allocatedAmount: 1000,
        shareQuantity: 10,
        precision: 3,
      })
      .build();

    expect(order.orderType).toBe(OrderTypeEnum.BUY);
    expect(order.totalAmount).toBe(1000);
    expect(order.scheduledExecutionDate).toEqual(date);
    expect(order.status).toBe(OrderStatusEnum.EXECUTED);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].ticker).toBe('AAPL');
  });

  it('should handle null/undefined items array gracefully', () => {
    const orderNull = new OrderBuilder().addItems(null as any).build();
    expect(orderNull.items).toEqual([]);

    const orderUndefined = new OrderBuilder().addItems(undefined).build();
    expect(orderUndefined.items).toEqual([]);
  });
});

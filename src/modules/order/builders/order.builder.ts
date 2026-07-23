import { OrderEntity, OrderStatusEnum } from '../order.entity';
import { OrderItemEntity } from '../order-item.entity';
import { OrderTypeEnum } from '../../../common/constants/order-type.enum';
import { CalculatedStockSplit } from '../../portfolio-stock/portfolio-stock.service';

export class OrderBuilder {
  private order: OrderEntity;

  constructor() {
    this.order = new OrderEntity();
    this.order.items = [];
  }

  setOrderType(orderType: OrderTypeEnum): this {
    this.order.orderType = orderType;
    return this;
  }

  setTotalAmount(totalAmount: number): this {
    this.order.totalAmount = totalAmount;
    return this;
  }

  setScheduledExecutionDate(date: Date): this {
    this.order.scheduledExecutionDate = date;
    return this;
  }

  setStatus(status: OrderStatusEnum): this {
    this.order.status = status;
    return this;
  }

  addItem(split: CalculatedStockSplit): this {
    const item = new OrderItemEntity();
    item.ticker = split.ticker;
    item.allocationPercentage = split.allocationPercentage;
    item.pricePerShare = split.pricePerShare;
    item.allocatedAmount = split.allocatedAmount;
    item.shareQuantity = split.shareQuantity;
    this.order.items.push(item);
    return this;
  }

  addItems(splits?: CalculatedStockSplit[]): this {
    if (splits && Array.isArray(splits)) {
      for (const split of splits) {
        this.addItem(split);
      }
    }
    return this;
  }

  build(): OrderEntity {
    return this.order;
  }
}

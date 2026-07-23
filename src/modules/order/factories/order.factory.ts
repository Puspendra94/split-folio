import { Injectable } from '@nestjs/common';
import { OrderEntity, OrderStatusEnum } from '../order.entity';
import { OrderTypeEnum } from '../../../common/constants/order-type.enum';
import { CalculatedStockSplit } from '../../portfolio-stock/portfolio-stock.service';
import { OrderBuilder } from '../builders/order.builder';

export interface CreateOrderFactoryInput {
  orderType: OrderTypeEnum;
  totalAmount: number;
  scheduledExecutionDate: Date;
  status: OrderStatusEnum;
  calculatedSplits: CalculatedStockSplit[];
}

@Injectable()
export class OrderFactory {
  createOrder(input: CreateOrderFactoryInput): OrderEntity {
    return new OrderBuilder()
      .setOrderType(input.orderType)
      .setTotalAmount(input.totalAmount)
      .setScheduledExecutionDate(input.scheduledExecutionDate)
      .setStatus(input.status)
      .addItems(input.calculatedSplits)
      .build();
  }
}

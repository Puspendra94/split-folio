import { OrderEntity } from '../../modules/order/order.entity';

export interface IOrderRepository {
  save(order: OrderEntity): Promise<OrderEntity>;
  find(options?: { order?: any }): Promise<OrderEntity[]>;
  findOne(options: { where: { id: string } }): Promise<OrderEntity | null>;
}

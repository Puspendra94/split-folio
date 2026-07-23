import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IOrderRepository } from '../interfaces/order-repository.interface';
import { OrderEntity } from '../../modules/order/order.entity';
import { OrderItemEntity } from '../../modules/order/order-item.entity';

@Injectable()
export class MemoryOrderRepository implements IOrderRepository {
  private readonly store = new Map<string, OrderEntity>();

  async save(order: OrderEntity): Promise<OrderEntity> {
    if (!order.id) {
      order.id = randomUUID();
    }
    if (!order.createdAt) {
      order.createdAt = new Date();
    }
    order.updatedAt = new Date();

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (!item.id) {
          item.id = randomUUID();
        }
        if (!item.createdAt) {
          item.createdAt = new Date();
        }
        item.updatedAt = new Date();
      }
    }

    this.store.set(order.id, order);
    return this.clone(order);
  }

  async find(options?: { order?: any }): Promise<OrderEntity[]> {
    const list = Array.from(this.store.values()).map((o) => this.clone(o));
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async findOne(options: {
    where: { id: string };
  }): Promise<OrderEntity | null> {
    const order = this.store.get(options.where.id);
    if (!order) return null;
    return this.clone(order);
  }

  private clone(o: OrderEntity): OrderEntity {
    const copy = Object.assign(new OrderEntity(), o);
    if (o.items) {
      copy.items = o.items.map((item) =>
        Object.assign(new OrderItemEntity(), item),
      );
    }
    return copy;
  }
}

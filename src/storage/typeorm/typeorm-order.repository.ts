import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IOrderRepository } from '../interfaces/order-repository.interface';
import { OrderEntity } from '../../modules/order/order.entity';

@Injectable()
export class TypeOrmOrderRepository implements IOrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repo: Repository<OrderEntity>,
  ) {}

  save(order: OrderEntity): Promise<OrderEntity> {
    return this.repo.save(order);
  }

  find(options?: { order?: any }): Promise<OrderEntity[]> {
    return this.repo.find(options as any);
  }

  findOne(options: { where: { id: string } }): Promise<OrderEntity | null> {
    return this.repo.findOne(options as any);
  }
}

import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../common/abstract.entity';
import { OrderTypeEnum } from '../../common/constants/order-type.enum';
import { OrderItemEntity } from './order-item.entity';

export enum OrderStatusEnum {
  SCHEDULED = 'SCHEDULED',
  EXECUTED = 'EXECUTED',
}

@Entity({ name: 'orders' })
export class OrderEntity extends AbstractEntity {
  @Column({
    type: 'enum',
    enum: OrderTypeEnum,
    name: 'order_type',
  })
  orderType: OrderTypeEnum;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    name: 'total_amount',
  })
  totalAmount: number;

  @Column({
    type: 'timestamp without time zone',
    name: 'scheduled_execution_date',
  })
  scheduledExecutionDate: Date;

  @Column({
    type: 'enum',
    enum: OrderStatusEnum,
    default: OrderStatusEnum.SCHEDULED,
  })
  status: OrderStatusEnum;

  @OneToMany(() => OrderItemEntity, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItemEntity[];
}

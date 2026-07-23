import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../common/abstract.entity';
import { OrderEntity } from './order.entity';

@Entity({ name: 'order_items' })
export class OrderItemEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 20 })
  ticker: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'allocation_percentage',
  })
  allocationPercentage: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    name: 'price_per_share',
  })
  pricePerShare: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 4,
    name: 'allocated_amount',
  })
  allocatedAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 7,
    name: 'share_quantity',
  })
  shareQuantity: number;

  @ManyToOne(() => OrderEntity, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;
}

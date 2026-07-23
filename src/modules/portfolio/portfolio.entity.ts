import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../common/abstract.entity';
import { PortfolioStockEntity } from '../portfolio-stock/portfolio-stock.entity';

@Entity({ name: 'portfolios' })
export class PortfolioEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'allocated_weight',
    default: 0,
  })
  allocatedWeight: number;

  @Column({
    type: 'boolean',
    name: 'is_complete',
    default: false,
  })
  isComplete: boolean;

  @OneToMany(() => PortfolioStockEntity, (stock) => stock.portfolio, {
    cascade: true,
    eager: true,
  })
  stocks: PortfolioStockEntity[];
}

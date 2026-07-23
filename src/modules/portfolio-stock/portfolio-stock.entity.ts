import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../common/abstract.entity';
import { PortfolioEntity } from '../portfolio/portfolio.entity';

@Entity({ name: 'portfolio_stocks' })
export class PortfolioStockEntity extends AbstractEntity {
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
    name: 'custom_market_price',
    nullable: true,
  })
  customMarketPrice?: number | null;

  @ManyToOne(() => PortfolioEntity, (portfolio) => portfolio.stocks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: PortfolioEntity;
}

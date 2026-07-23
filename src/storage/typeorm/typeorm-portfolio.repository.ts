import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPortfolioRepository } from '../interfaces/portfolio-repository.interface';
import { PortfolioEntity } from '../../modules/portfolio/portfolio.entity';

@Injectable()
export class TypeOrmPortfolioRepository implements IPortfolioRepository {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly repo: Repository<PortfolioEntity>,
  ) {}

  create(data: Partial<PortfolioEntity>): PortfolioEntity {
    return this.repo.create(data);
  }

  save(
    portfolio: PortfolioEntity | PortfolioEntity[],
  ): Promise<PortfolioEntity> {
    return this.repo.save(portfolio as any) as Promise<PortfolioEntity>;
  }

  find(options?: {
    relations?: string[];
    order?: any;
  }): Promise<PortfolioEntity[]> {
    return this.repo.find(options as any);
  }

  findOne(options: {
    where: { id: string };
    relations?: string[];
  }): Promise<PortfolioEntity | null> {
    return this.repo.findOne(options as any);
  }

  remove(portfolio: PortfolioEntity): Promise<PortfolioEntity> {
    return this.repo.remove(portfolio);
  }
}

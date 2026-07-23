import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePortfolioStockDto } from './create-portfolio-stock.dto';

export class BatchUpsertStocksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePortfolioStockDto)
  stocks: CreatePortfolioStockDto[];
}

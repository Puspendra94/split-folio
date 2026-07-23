import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePortfolioStockDto } from '../../portfolio-stock/dto/create-portfolio-stock.dto';

export class UpdatePortfolioDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePortfolioStockDto)
  stocks?: CreatePortfolioStockDto[];
}

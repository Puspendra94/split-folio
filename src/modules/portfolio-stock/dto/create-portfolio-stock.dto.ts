import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePortfolioStockDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  ticker: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  allocationPercentage: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  customMarketPrice?: number | null;
}

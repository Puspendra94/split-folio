import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePortfolioStockDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  ticker?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100)
  allocationPercentage?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  customMarketPrice?: number | null;
}

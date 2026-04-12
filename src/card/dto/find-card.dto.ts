import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class FindCardDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(300)
  @IsOptional()
  limit: number = 24;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @IsOptional()
  skip: number = 0;

  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  set?: string;

  @IsString()
  @IsOptional()
  pokemonType?: string;

  @IsString()
  @IsOptional()
  cardType?: string;

  // cardVariant can be empty string "" to filter standard cards
  @IsString()
  @IsOptional()
  cardVariant?: string;

  @IsString()
  @IsOptional()
  evolvesFrom?: string;

  @IsString()
  @IsOptional()
  artist?: string;

  @IsString()
  @IsOptional()
  weakness?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(999)
  @IsOptional()
  hpMin?: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(999)
  @IsOptional()
  hpMax?: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  retreat?: number;

  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  hasAbility?: boolean;

  @IsString()
  @IsOptional()
  rarity?: string;

  @IsString()
  @IsOptional()
  attackEnergy?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(999)
  @IsOptional()
  attackPowerMin?: number;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(999)
  @IsOptional()
  attackPowerMax?: number;
}

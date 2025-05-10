import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FindCardDto {
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  skip: number;

  @IsString()
  @IsOptional()
  set: string;

  @IsString()
  @IsOptional()
  pokemonType: string;

  @IsString()
  @IsOptional()
  cardType: string;

  @IsString()
  @IsOptional()
  cardVariant: string;

  @IsString()
  @IsOptional()
  weakness: string;

  @IsString()
  @IsIn(['number'])
  @IsOptional()
  sort: string;

  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  ordering: string;
}

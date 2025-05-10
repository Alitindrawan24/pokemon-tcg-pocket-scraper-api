import { IsOptional, IsString } from 'class-validator';

export class FindSetDto {
  @IsString()
  @IsOptional()
  code: string;
}

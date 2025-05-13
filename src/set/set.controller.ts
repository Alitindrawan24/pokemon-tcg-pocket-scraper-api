import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { SetService } from './set.service';
import { FindSetDto } from './dto/find-set.dto';

@Controller('sets')
export class SetController {
  constructor(private readonly setService: SetService) {}

  @Get()
  async findAll(@Query() findSetDto: FindSetDto) {
    const sets = await this.setService.findAll(findSetDto);

    return {
      status: 'success',
      message: 'Successfully get Set List',
      data: sets,
    };
  }

  @Get(':code')
  async findOne(@Param('code') code: string) {
    const set = await this.setService.findOne(code);
    if (!set) {
      throw new NotFoundException('Set not found');
    }
    return {
      status: 'success',
      message: 'Successfully get Set',
      data: set,
    };
  }
}

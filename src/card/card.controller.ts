import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { CardService } from './card.service';
import { FindCardDto } from './dto/find-card.dto';

@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get()
  async findAll(@Query() findCardDto: FindCardDto) {
    const cards = await this.cardService.findAll(findCardDto);

    return {
      status: 'success',
      message: 'Successfully get Card List',
      data: cards,
    };
  }

  @Get(':set/:number')
  async findOne(@Param('set') set: string, @Param('number') number: string) {
    const card = await this.cardService.findOne(set, number);
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return {
      status: 'success',
      message: 'Successfully get Card',
      data: card,
    };
  }
}

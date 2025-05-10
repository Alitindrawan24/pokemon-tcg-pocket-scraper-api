import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Card } from './schemas/card.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FindCardDto } from './dto/find-card.dto';
import { HelperService } from 'src/common/helper/helper.service';

@Injectable()
export class CardService {
  constructor(
    @InjectModel(Card.name) private cardModel: Model<Card>,
    private readonly helperService: HelperService,
  ) {}
  async findAll(findCardDto: FindCardDto) {
    return await this.cardModel
      .find({
        ...(findCardDto.set && { set: findCardDto.set }),
        ...(findCardDto.pokemonType && {
          pokemonType: this.helperService.titleCase(findCardDto.pokemonType),
        }),
        ...(findCardDto.cardType && {
          cardType: this.helperService.titleCase(findCardDto.cardType),
        }),
        ...(findCardDto.cardVariant && {
          cardVariant: this.helperService.titleCase(findCardDto.cardVariant),
        }),
        ...(findCardDto.weakness && {
          pokemonType: this.helperService.titleCase(findCardDto.weakness),
        }),
      })
      .sort({
        ...(findCardDto.sort && {
          [findCardDto.sort]: findCardDto.ordering == 'desc' ? -1 : 1,
        }),
        set: 1,
        number: 1,
      })
      .limit(findCardDto.limit ?? 20)
      .skip(findCardDto.skip ?? 0);
  }

  async findOne(set: string, number: string) {
    return await this.cardModel
      .findOne({
        set: set,
        number: number,
      })
      .exec();
  }
}

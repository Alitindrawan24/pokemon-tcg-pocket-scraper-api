import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { Card, CardSchema } from './schemas/card.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { HelperService } from 'src/common/helper/helper.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Card.name, schema: CardSchema }]),
  ],
  controllers: [CardController],
  providers: [CardService, HelperService],
})
export class CardModule {}

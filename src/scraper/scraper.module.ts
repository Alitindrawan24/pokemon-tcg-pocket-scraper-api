import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { Card, CardSchema } from 'src/card/schemas/card.schema';
import { HelperService } from 'src/common/helper/helper.service';
import { Set, SetSchema } from 'src/set/schemas/set.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Card.name, schema: CardSchema },
      { name: Set.name, schema: SetSchema },
    ]),
  ],
  controllers: [ScraperController],
  providers: [ScraperService, HelperService],
})
export class ScraperModule {}

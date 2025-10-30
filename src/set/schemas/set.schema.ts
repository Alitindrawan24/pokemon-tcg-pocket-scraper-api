import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  DEFAULT_SCRAPER_SOURCE,
  ScraperSource,
} from 'src/scraper/scraper.constants';

export type SetDocument = HydratedDocument<Set>;

@Schema()
export class Set {
  @Prop()
  count: number;

  @Prop()
  code: string;

  @Prop()
  name: string;

  @Prop()
  image: string;

  @Prop()
  date: string;

  @Prop()
  order: number;

  @Prop({ default: DEFAULT_SCRAPER_SOURCE })
  source: ScraperSource;
}

export const SetSchema = SchemaFactory.createForClass(Set);

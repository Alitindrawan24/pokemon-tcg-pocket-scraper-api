import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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
}

export const SetSchema = SchemaFactory.createForClass(Set);

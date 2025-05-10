import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CardDocument = HydratedDocument<Card>;

export class CardAbility {
  name: string;
  effect: string;
}

export class CardAttack {
  energy: string[];
  name: string;
  effect?: string;
  power?: number;
}

@Schema()
export class Card {
  @Prop()
  set: string;

  @Prop()
  number: number;

  @Prop()
  code: string;

  @Prop()
  name: string;

  @Prop()
  evolvesFrom: string;

  @Prop()
  pokemonType: string;

  @Prop()
  hp?: number;

  @Prop()
  cardType: string;

  @Prop()
  cardVariant: string;

  @Prop()
  artist: string;

  @Prop({ type: Object })
  ability?: CardAbility;

  @Prop()
  description?: string;

  @Prop()
  flavor: string;

  @Prop({ type: Object })
  attack_1?: CardAttack;

  @Prop({ type: Object })
  attack_2?: CardAttack;

  @Prop()
  weakness: string;

  @Prop()
  retreat: number;

  @Prop()
  rarity: string;

  @Prop()
  image: string;
}

export const CardSchema = SchemaFactory.createForClass(Card);

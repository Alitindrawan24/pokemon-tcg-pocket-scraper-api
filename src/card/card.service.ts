import { BadRequestException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Card } from './schemas/card.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FindCardDto } from './dto/find-card.dto';

@Injectable()
export class CardService {
  constructor(@InjectModel(Card.name) private cardModel: Model<Card>) {}

  async findAll(findCardDto: FindCardDto) {
    const {
      q,
      set,
      cardType,
      cardVariant,
      evolvesFrom,
      artist,
      pokemonType,
      hpMin,
      hpMax,
      weakness,
      retreat,
      hasAbility,
      rarity,
      attackEnergy,
      attackPowerMin,
      attackPowerMax,
      limit = 24,
      skip = 0,
    } = findCardDto;

    const isTrainer =
      cardType && cardType.toLowerCase() === 'trainer';

    // Validate hpMin/hpMax relationship
    if (
      !isTrainer &&
      hpMin !== undefined &&
      hpMax !== undefined &&
      hpMin > hpMax
    ) {
      throw new BadRequestException('hpMin must not be greater than hpMax');
    }

    const filter: Record<string, unknown> = {};

    // Full-text partial match on name
    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }

    if (set) {
      filter.set = set;
    }

    if (cardType) {
      filter.cardType = { $regex: `^${cardType}$`, $options: 'i' };
    }

    // cardVariant: undefined = no filter, "" = match empty string (standard), other = match value
    if (cardVariant !== undefined) {
      filter.cardVariant = { $regex: `^${cardVariant}$`, $options: 'i' };
    }

    if (evolvesFrom) {
      filter.evolvesFrom = { $regex: `^${evolvesFrom}$`, $options: 'i' };
    }

    if (artist) {
      filter.artist = { $regex: artist, $options: 'i' };
    }

    if (rarity) {
      // The spec uses ◇ (U+25C7) but the DB stores ◊ (U+25CA) — normalize
      filter.rarity = rarity.replace(/◇/g, '◊');
    }

    // Pokémon-specific filters — silently ignored for Trainer cards
    if (!isTrainer) {
      if (pokemonType) {
        filter.pokemonType = { $regex: `^${pokemonType}$`, $options: 'i' };
      }

      if (hpMin !== undefined || hpMax !== undefined) {
        const hpFilter: Record<string, number> = {};
        if (hpMin !== undefined) hpFilter.$gte = hpMin;
        if (hpMax !== undefined) hpFilter.$lte = hpMax;
        filter.hp = hpFilter;
      }

      if (weakness) {
        if (weakness.toLowerCase() === 'none') {
          filter.weakness = 'none';
        } else {
          filter.weakness = { $regex: `^${weakness}$`, $options: 'i' };
        }
      }

      if (retreat !== undefined) {
        if (retreat === 4) {
          filter.retreat = { $gte: 4 };
        } else {
          filter.retreat = retreat;
        }
      }

      if (hasAbility === true) {
        filter.ability = { $ne: null, $exists: true };
      } else if (hasAbility === false) {
        filter.$or = [{ ability: null }, { ability: { $exists: false } }];
      }

      if (attackEnergy) {
        filter.$or = [
          { 'attack_1.energy': attackEnergy },
          { 'attack_2.energy': attackEnergy },
        ];
      }

      if (attackPowerMin !== undefined || attackPowerMax !== undefined) {
        const attackConditions: Record<string, unknown>[] = [];
        const powerFilter: Record<string, number> = {};
        if (attackPowerMin !== undefined) powerFilter.$gte = attackPowerMin;
        if (attackPowerMax !== undefined) powerFilter.$lte = attackPowerMax;

        attackConditions.push({ 'attack_1.power': powerFilter });
        attackConditions.push({ 'attack_2.power': powerFilter });

        // Merge with existing $or if present (e.g. from attackEnergy)
        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: attackConditions }];
          delete filter.$or;
        } else {
          filter.$or = attackConditions;
        }
      }
    }

    return await this.cardModel
      .find(filter)
      .sort({ set: 1, number: 1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async findOne(set: string, number: string) {
    return await this.cardModel
      .findOne({ set, number })
      .exec();
  }
}

import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { loadEsm } from 'load-esm';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Card, CardAbility, CardAttack } from 'src/card/schemas/card.schema';
import { HelperService } from 'src/common/helper/helper.service';
import { Set } from 'src/set/schemas/set.schema';

@Injectable()
export class ScraperService {
  constructor(
    @InjectModel(Card.name) private cardModel: Model<Card>,
    @InjectModel(Set.name) private setModel: Model<Set>,
    private readonly helperService: HelperService,
  ) {}
  async scrapeSetList(): Promise<string> {
    const instance = axios.create();
    const url = 'https://pocket.limitlesstcg.com/cards';

    const response = await instance.get<string>(url);

    if (response.status == 200) {
      const $: cheerio.CheerioAPI = cheerio.load(response.data);
      const tables = $('.sets-table tbody tr');
      let order = 1;
      for (const table of tables) {
        const tds = $(table).find('td');
        if (tds.length > 1) {
          const setObject = new Set();

          const image = $(tds[0]).find('span.set-icon img.set').attr('src');
          const code = $(tds[0]).find('span.code').text().trim();
          const name = $(tds[0]).text().trim().replace(code, '').trim();
          const date = $(tds[1]).text().trim();
          const count = parseInt($(tds[2]).text().trim());

          const setLocalImage = await this.helperService.downloadAndSaveImage(
            image,
            `sets/${code}`,
            `${code}.webp`,
          );

          setObject.image = setLocalImage ?? '';
          setObject.name = name;
          setObject.code = code;
          setObject.date = date;
          setObject.count = count;
          setObject.order = order++;

          await this.createSet(setObject);
        }
      }
    }

    return 'scrape-set-list';
  }

  async createSet(set: Set): Promise<Set> {
    return await this.setModel.findOneAndUpdate({ code: set.code }, set, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }

  async getSetByCode(setCode: string): Promise<Set | null> {
    return await this.setModel.findOne({ code: setCode });
  }

  async scrapeSet(set: Set) {
    const { default: pLimit } =
      await loadEsm<typeof import('p-limit')>('p-limit');
    const limit = pLimit(5);

    const numbers: number[] = Array.from(
      { length: set.count },
      (_, index) => index + 1,
    );

    await Promise.all(
      numbers.map((number) => limit(() => this.scrapeCard(set.code, number))),
    );

    return 'scrape-set';
  }

  async scrapeCard(name: string, number: number) {
    const instance = axios.create();
    const url = `https://pocket.limitlesstcg.com/cards/${name}/${number}`;
    const response = await instance.get<string>(url);

    if (response.status == 200) {
      const $: cheerio.CheerioAPI = cheerio.load(response.data);

      const cardTitle = $('.card-text-title').text().trim().split(' - ');
      const cardType = $('.card-text-type').text().trim().split('-');
      const cardArtist = $('.card-text-artist')
        .text()
        .replace(/\n\s+/g, ' ')
        .split('Illustrated by')[1]
        .trim();
      const cardFlavor = $('.card-text-flavor').text()?.trim();
      const cardSection = $('.card-text .card-text-section:nth-child(2)')
        .text()
        ?.trim();
      const cardRarity = $('.prints-current-details span:nth-child(2)')
        .text()
        .split('·')[1]
        ?.trim();
      const cardImage = $('.card-image .card').attr('src');
      const cardLocalImage = await this.helperService.downloadAndSaveImage(
        cardImage,
        `cards/${name}`,
        `${number}.webp`,
      );

      const cardObject = new Card();
      cardObject.code = `${name}-${number}`;
      cardObject.set = name;
      cardObject.number = number;

      cardObject.name = cardTitle[0].trim();
      cardObject.pokemonType = cardTitle[1]?.trim();
      cardObject.hp = cardTitle[2] ? parseInt(cardTitle[2]?.trim()) : undefined;

      cardObject.cardType = cardType[0].trim();
      cardObject.cardVariant = cardType[1].trim();
      cardObject.evolvesFrom = cardType[2]
        ?.replace(/\n\s+/g, ' ')
        .split('Evolves from')[1]
        ?.trim();

      cardObject.artist = cardArtist;
      cardObject.description = cardSection;
      cardObject.flavor = cardFlavor;
      cardObject.rarity = cardRarity ?? '?';
      cardObject.image = cardLocalImage ?? '?';

      if (cardObject.cardType == 'Pokémon') {
        cardObject.description = undefined;

        const wrr = $('.card-text-wrr').text().trim().split('\n');
        cardObject.weakness = wrr[0].trim().split('Weakness:')[1].trim();
        cardObject.retreat = parseInt(
          wrr[1].trim().split('Retreat:')[1].trim(),
        );

        cardObject.attack_1 = undefined;
        const cardAttack1 = $('.card-text-attack .card-text-attack-info')
          .text()
          ?.trim()
          .split('\n');

        cardObject.ability = undefined;
        const cardAbility = $('.card-text-ability');
        const cardAbilityName = cardAbility
          .find('.card-text-ability-info')
          .text()
          .split(':')[1]
          ?.trim();
        const cardAbilityEffect = cardAbility
          .find('.card-text-ability-effect')
          .text()
          ?.trim();

        if (cardAbilityName != '' && cardAbilityEffect != '') {
          const cardAbility = new CardAbility();
          cardAbility.name = cardAbilityName;
          cardAbility.effect = cardAbilityEffect;
          cardObject.ability = cardAbility;
        }

        const cardAttacks1 = new CardAttack();
        cardAttacks1.energy = cardAttack1[0]?.trim().split('');
        const cardAttack1Name = cardAttack1[1]?.trim().split(' ');
        cardAttacks1.power =
          cardAttack1Name[cardAttack1Name.length - 1]?.trim();

        if (cardAttacks1.power === undefined) {
          cardAttacks1.name = cardAttack1[1].trim();
        } else {
          cardAttacks1.name = cardAttack1[1]
            ?.split(cardAttack1Name[cardAttack1Name.length - 1] ?? null)[0]
            ?.trim();
        }

        cardAttacks1.effect = $('.card-text-attack .card-text-attack-effect')
          .text()
          .replace(/\n\s+/g, ' ')
          .trim();

        if (cardAttacks1.effect == '\n') {
          cardAttacks1.effect = undefined;
        }

        cardObject.attack_1 = cardAttacks1;

        cardObject.attack_2 = undefined;
        const cardAttack2 = $(
          '.card-text-attack:last-child .card-text-attack-info',
        )
          .text()
          ?.trim()
          .split('\n');

        if (
          !cardAttack1.every(function (u, i) {
            return u === cardAttack2[i];
          })
        ) {
          const cardAttacks2 = new CardAttack();
          cardAttacks2.energy = cardAttack2[0]?.trim().split('');
          const cardAttack2Name = cardAttack2[1]?.trim().split(' ');
          cardAttacks2.power =
            cardAttack2Name[cardAttack2Name.length - 1]?.trim();

          if (cardAttacks2.power === undefined) {
            cardAttacks2.name = cardAttack2[1].trim();
          } else {
            cardAttacks2.name = cardAttack2[1]
              ?.split(cardAttack2Name[cardAttack2Name.length - 1] ?? null)[0]
              ?.trim();
          }

          cardAttacks2.effect = $(
            '.card-text-attack:last-child .card-text-attack-effect',
          )
            .text()
            .replace(/\n\s+/g, ' ')
            .trim();

          if (cardAttacks2.effect == '\n') {
            cardAttacks2.effect = undefined;
          }

          if (cardObject.attack_1.effect == cardAttacks2.effect) {
            cardObject.attack_1.effect = undefined;
          }

          cardObject.attack_2 = cardAttacks2;
        }
      } else {
        // case fossil
        if (
          cardObject.pokemonType != '' &&
          cardObject.pokemonType != undefined
        ) {
          cardObject.hp = parseInt(
            cardObject.pokemonType.split('HP')[0].trim(),
          );
          cardObject.pokemonType = '';
        }
      }

      await this.createCard(cardObject);
    }
  }

  async createCard(card: Card): Promise<Card> {
    return await this.cardModel.findOneAndUpdate({ code: card.code }, card, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
}

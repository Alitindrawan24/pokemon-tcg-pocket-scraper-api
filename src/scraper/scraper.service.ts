import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { loadEsm } from 'load-esm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import puppeteer, { Browser, Page } from 'puppeteer';
import { Card, CardAbility, CardAttack } from 'src/card/schemas/card.schema';
import { HelperService } from 'src/common/helper/helper.service';
import { Set as SetEntity } from 'src/set/schemas/set.schema';
import { DEFAULT_SCRAPER_SOURCE, ScraperSource } from './scraper.constants';

type PokemonZoneSetEntry = {
  code: string | null;
  name: string | null;
  releaseDate: string | null;
  totalCards: number | null;
  image: string | null;
};

type PokemonZoneCardMeta = {
  number: number;
  slug: string;
};

type PokemonZoneAttackPayload = {
  name: string | null;
  damage: string | null;
  effect: string | null;
  energies: string[];
};

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  private readonly pokemonZoneTypeMap: Record<string, string> = {
    colorless: 'Colorless',
    darkness: 'Darkness',
    dragon: 'Dragon',
    fairy: 'Fairy',
    fighting: 'Fighting',
    fire: 'Fire',
    grass: 'Grass',
    lightning: 'Lightning',
    metal: 'Metal',
    psychic: 'Psychic',
    water: 'Water',
  };

  constructor(
    @InjectModel(Card.name) private readonly cardModel: Model<Card>,
    @InjectModel(SetEntity.name)
    private readonly setModel: Model<SetEntity>,
    private readonly helperService: HelperService,
  ) {}

  async scrapeSetList(
    source: ScraperSource = ScraperSource.LIMITLESS,
  ): Promise<string> {
    if (source === ScraperSource.POKEMON_ZONE) {
      await this.scrapePokemonZoneSetList();
      return 'scrape-set-list';
    }

    await this.scrapeLimitlessSetList();
    return 'scrape-set-list';
  }

  private async scrapeLimitlessSetList(): Promise<void> {
    const instance = axios.create();
    const url = 'https://pocket.limitlesstcg.com/cards';

    const response = await instance.get<string>(url);

    if (response.status === 200) {
      const $: cheerio.CheerioAPI = cheerio.load(response.data);
      const tables = $('.sets-table tbody tr');
      let order = 1;

      for (const table of tables) {
        const tds = $(table).find('td');
        if (tds.length > 1) {
          const setObject = new SetEntity();

          const rawCode = $(tds[0]).find('span.code').text().trim();
          const code = rawCode;
          const promoSlugMap: Record<string, string> = {
            'P-A': 'PROMO-A',
            'P-B': 'PROMO-B',
          };
          const promoSlug = promoSlugMap[code];
          const image = promoSlug
            ? `https://assets.pokemon-zone.com/game-assets/UI/Textures/System/Exp/LOGO_expansion_${promoSlug}_en_US.webp`
            : `https://assets.pokemon-zone.com/game-assets/UI/Textures/System/Exp/LOGO_expansion_${code}_en_US.webp`;
          const name = $(tds[0]).text().trim().replace(rawCode, '').trim();
          const date = $(tds[1]).text().trim();
          const count = parseInt($(tds[2]).text().trim(), 10);

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
          setObject.source = ScraperSource.LIMITLESS;

          await this.createSet(setObject);
        }
      }
    }
  }

  private async scrapePokemonZoneSetList(): Promise<void> {
    const browser = await this.createBrowser();

    try {
      const page = await browser.newPage();
      await this.preparePokemonZonePage(page);
      await page.goto('https://www.pokemon-zone.com/sets/', {
        waitUntil: 'networkidle2',
        timeout: 60_000,
      });
      await page.waitForSelector(
        'a.link-no-style[href^="/sets/"] .set-summary-card__name',
        { timeout: 15_000 },
      );

      const entries = await page.evaluate(() => {
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            'a.link-no-style[href^="/sets/"]',
          ),
        );

        return anchors
          .map((link) => {
            const card = link.querySelector('.set-summary-card');
            if (!card) {
              return null;
            }

            const href = link.getAttribute('href') ?? '';
            const segments = href.split('/').filter(Boolean);
            const code = segments.length >= 2 ? segments[1] : null;

            const name =
              card
                .querySelector('.set-summary-card__name')
                ?.textContent?.trim() ?? null;
            const releaseDate =
              card
                .querySelector('.set-summary-card__release')
                ?.textContent?.trim() ?? null;
            const countText =
              card.querySelector('.set-summary-card__count')?.textContent ?? '';
            const countMatch = countText.replace(/[^0-9]/g, '');
            const totalCards = countMatch ? parseInt(countMatch, 10) : null;

            const styleValue = card.getAttribute('style') ?? '';
            const imageMatch = styleValue.match(/url\\('([^']+)'\\)/);
            const image = imageMatch ? imageMatch[1] : null;

            return {
              code,
              name,
              releaseDate,
              totalCards,
              image,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> =>
            Boolean(entry?.code),
          );
      });

      await page.close();

      const uniqueEntries = new Map<string, PokemonZoneSetEntry>();
      for (const entry of entries) {
        if (!entry.code) {
          continue;
        }

        const code = entry.code.toUpperCase();
        if (!uniqueEntries.has(code)) {
          uniqueEntries.set(code, entry);
        }
      }

      let order = 1;
      for (const [code, entry] of uniqueEntries) {
        const setObject = new SetEntity();
        setObject.code = code;
        setObject.name = entry.name ?? code;
        setObject.date = entry.releaseDate ?? '';
        setObject.count = entry.totalCards ?? 0;
        setObject.order = order++;
        setObject.source = ScraperSource.POKEMON_ZONE;

        if (entry.image) {
          const setLocalImage = await this.helperService.downloadAndSaveImage(
            entry.image,
            `sets/${code}`,
            `${code}.webp`,
          );
          setObject.image = setLocalImage ?? '';
        } else {
          setObject.image = '';
        }

        await this.createSet(setObject);
      }
    } finally {
      await browser.close();
    }
  }

  async createSet(set: SetEntity): Promise<SetEntity> {
    const source: ScraperSource =
      (set as unknown as { source?: ScraperSource }).source ??
      DEFAULT_SCRAPER_SOURCE;

    const filter: Record<string, unknown> = { code: set.code };

    if (source === ScraperSource.LIMITLESS) {
      filter.$or = [
        { source },
        { source: { $exists: false } },
        { source: null },
      ];
    } else {
      filter.source = source;
    }

    return await this.setModel.findOneAndUpdate(
      filter,
      { ...set, source },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  async getSetByCode(
    setCode: string,
    source: ScraperSource = DEFAULT_SCRAPER_SOURCE,
  ): Promise<SetEntity | null> {
    const filter: Record<string, unknown> = { code: setCode.toUpperCase() };

    if (source === ScraperSource.LIMITLESS) {
      filter.$or = [
        { source },
        { source: { $exists: false } },
        { source: null },
      ];
    } else {
      filter.source = source;
    }

    return await this.setModel.findOne(filter);
  }

  async scrapeSet(set: SetEntity, source?: ScraperSource) {
    const effectiveSource: ScraperSource =
      source ??
      (set as unknown as { source?: ScraperSource }).source ??
      DEFAULT_SCRAPER_SOURCE;

    if (effectiveSource === ScraperSource.POKEMON_ZONE) {
      await this.scrapePokemonZoneSet(set);
      return 'scrape-set';
    }

    await this.scrapeLimitlessSet(set);
    return 'scrape-set';
  }

  private async scrapeLimitlessSet(set: SetEntity): Promise<void> {
    const { default: pLimit } =
      await loadEsm<typeof import('p-limit')>('p-limit');
    const limit = pLimit(5);

    const numbers: number[] = Array.from(
      { length: set.count },
      (_, index) => index + 1,
    );

    await Promise.all(
      numbers.map((number) =>
        limit(() => this.scrapeLimitlessCard(set.code, number)),
      ),
    );
  }

  private async scrapeLimitlessCard(name: string, number: number) {
    const instance = axios.create();
    const url = `https://pocket.limitlesstcg.com/cards/${name}/${number}`;
    const response = await instance.get<string>(url);

    if (response.status === 200) {
      const $: cheerio.CheerioAPI = cheerio.load(response.data);

      const cardTitle = $('.card-text-title').text().trim().split(' - ');
      const cardType = $('.card-text-type').text().trim().split('-');
      const cardArtist = $('.card-text-artist')
        .text()
        .replace(/\n\s+/g, ' ')
        .split('Illustrated by')[1]
        ?.trim();
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

      cardObject.name = cardTitle[0]?.trim() ?? '';
      cardObject.pokemonType = cardTitle[1]?.trim() ?? '';
      cardObject.hp = cardTitle[2]
        ? parseInt(cardTitle[2]?.trim(), 10)
        : undefined;

      cardObject.cardType = cardType[0]?.trim() ?? '';
      cardObject.cardVariant = cardType[1]?.trim() ?? '';
      cardObject.evolvesFrom = cardType[2]
        ?.replace(/\n\s+/g, ' ')
        .split('Evolves from')[1]
        ?.trim();

      cardObject.artist = cardArtist;
      cardObject.description = cardSection;
      cardObject.flavor = cardFlavor;
      cardObject.rarity = cardRarity ?? '?';
      cardObject.image = cardLocalImage ?? '?';

      if (cardObject.cardType === 'Pokémon') {
        cardObject.description = undefined;

        const wrr = $('.card-text-wrr').text().trim().split('\n');
        cardObject.weakness = wrr[0].trim().split('Weakness:')[1].trim();
        cardObject.retreat = parseInt(
          wrr[1].trim().split('Retreat:')[1].trim(),
          10,
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

        if (cardAbilityName !== '' && cardAbilityEffect !== '') {
          const cardAbilityObject = new CardAbility();
          cardAbilityObject.name = cardAbilityName ?? '';
          cardAbilityObject.effect = cardAbilityEffect ?? '';
          cardObject.ability = cardAbilityObject;
        }

        const cardAttacks1 = new CardAttack();
        cardAttacks1.energy = cardAttack1[0]?.trim().split('') ?? [];
        const cardAttack1Name = cardAttack1[1]?.trim().split(' ') ?? [];
        cardAttacks1.power =
          cardAttack1Name[cardAttack1Name.length - 1]?.trim();

        if (cardAttacks1.power === undefined) {
          cardAttacks1.name = cardAttack1[1]?.trim() ?? '';
        } else {
          cardAttacks1.name = cardAttack1[1]
            ?.split(cardAttack1Name[cardAttack1Name.length - 1] ?? null)[0]
            ?.trim();
        }

        cardAttacks1.effect = $('.card-text-attack .card-text-attack-effect')
          .text()
          .replace(/\n\s+/g, ' ')
          .trim();

        if (cardAttacks1.effect === '\n') {
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
          cardAttack1 &&
          cardAttack2 &&
          !cardAttack1.every((u, i) => u === cardAttack2[i])
        ) {
          const cardAttacks2 = new CardAttack();
          cardAttacks2.energy = cardAttack2[0]?.trim().split('') ?? [];
          const cardAttack2Name = cardAttack2[1]?.trim().split(' ') ?? [];
          cardAttacks2.power =
            cardAttack2Name[cardAttack2Name.length - 1]?.trim();

          if (cardAttacks2.power === undefined) {
            cardAttacks2.name = cardAttack2[1]?.trim() ?? '';
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

          if (cardAttacks2.effect === '\n') {
            cardAttacks2.effect = undefined;
          }

          if (cardObject.attack_1.effect === cardAttacks2.effect) {
            cardObject.attack_1.effect = undefined;
          }

          cardObject.attack_2 = cardAttacks2;
        }
      } else {
        if (
          cardObject.pokemonType !== '' &&
          cardObject.pokemonType !== undefined
        ) {
          cardObject.hp = parseInt(
            cardObject.pokemonType.split('HP')[0].trim(),
            10,
          );
          cardObject.pokemonType = '';
        }
      }

      await this.createCard(cardObject);
    }
  }

  private async scrapePokemonZoneSet(set: SetEntity): Promise<void> {
    const lowercaseCode = set.code.toLowerCase();
    const browser = await this.createBrowser();

    try {
      const page = await browser.newPage();
      await this.preparePokemonZonePage(page);
      const setUrl = `https://www.pokemon-zone.com/sets/${lowercaseCode}/`;
      await page.goto(setUrl, {
        waitUntil: 'networkidle2',
        timeout: 60_000,
      });
      await page.waitForSelector(`a[href^="/cards/${lowercaseCode}/"]`, {
        timeout: 15_000,
      });

      const metas = await page.evaluate((code) => {
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            `a[href^="/cards/${code}/"]`,
          ),
        );

        const seen = new Set<number>();
        const result: { number: number; slug: string }[] = [];

        anchors.forEach((link) => {
          const href = link.getAttribute('href');
          if (!href) {
            return;
          }

          const segments = href.split('/').filter(Boolean);
          if (segments.length < 4) {
            return;
          }

          const number = parseInt(segments[2], 10);
          const slug = segments[3];

          if (!Number.isFinite(number) || !slug || seen.has(number)) {
            return;
          }

          seen.add(number);
          result.push({ number, slug });
        });

        return result;
      }, lowercaseCode);

      await page.close();

      const { default: pLimit } =
        await loadEsm<typeof import('p-limit')>('p-limit');
      const limit = pLimit(3);

      await Promise.all(
        metas.map((meta) =>
          limit(() => this.scrapePokemonZoneCard(browser, set, meta)),
        ),
      );
    } finally {
      await browser.close();
    }
  }

  private async scrapePokemonZoneCard(
    browser: Browser,
    set: SetEntity,
    meta: PokemonZoneCardMeta,
  ): Promise<void> {
    const page = await browser.newPage();

    try {
      await this.preparePokemonZonePage(page);
      const url = `https://www.pokemon-zone.com/cards/${set.code.toLowerCase()}/${meta.number}/${meta.slug}/`;
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60_000,
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const evaluateResult = await page.evaluate(() => {
        const notFoundText = document.querySelector('h1')?.textContent ?? '';
        if (notFoundText.includes('404 Page Not Found')) {
          return { success: false };
        }

        const headerInfo = document.querySelector(
          '.card-detail__header .fw-bold',
        );

        let cardType: string | null = null;
        let cardVariant: string | null = null;
        let evolvesFrom: string | null = null;

        if (headerInfo) {
          const parts =
            headerInfo.textContent
              ?.split('|')
              .map((part) => part.trim())
              .filter(Boolean) ?? [];

          if (parts.length > 0) {
            cardType = parts[0] ?? null;
          }

          for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.toLowerCase().startsWith('evolves from')) {
              const link = headerInfo.querySelector('a');
              evolvesFrom =
                link?.textContent?.trim() ??
                part.replace(/evolves from/i, '').trim();
            } else if (!cardVariant) {
              cardVariant = part;
            }
          }

          if (!evolvesFrom) {
            const link = headerInfo.querySelector('a');
            evolvesFrom = link?.textContent?.trim() ?? null;
          }
        }

        const hpText =
          document
            .querySelector('.card-detail__header .fs-1')
            ?.textContent?.replace(/[^0-9]/g, '') ?? '';
        const hp = hpText ? parseInt(hpText, 10) : null;

        const types = Array.from(
          document.querySelectorAll('.card-detail__header .energy-icon'),
        )
          .map((icon) => {
            const match = icon.className.match(/energy-icon--type-([a-z]+)/);
            return match ? match[1] : null;
          })
          .filter((value): value is string => Boolean(value));

        const abilityEl = document.querySelector('.ability-summary-row');
        const ability = abilityEl
          ? {
              name:
                abilityEl
                  .querySelector('.ability-summary-row__name')
                  ?.textContent?.replace(/Ability\\s*/i, '')
                  .trim() ?? null,
              effect:
                abilityEl
                  .querySelector('.ability-summary-row__description')
                  ?.textContent?.trim() ?? null,
            }
          : null;

        const attacks = Array.from(
          document.querySelectorAll('.attack-summary-row'),
        ).map((el) => {
          const energies = Array.from(
            el.querySelectorAll('.attack-summary-row__cost .energy-icon'),
          )
            .map((icon) => {
              const match = icon.className.match(/energy-icon--type-([a-z]+)/);
              return match ? match[1] : null;
            })
            .filter((value): value is string => Boolean(value));

          const name =
            el
              .querySelector('.attack-summary-row__name')
              ?.textContent?.trim() ?? null;
          const damage =
            el
              .querySelector('.attack-summary-row__damage')
              ?.textContent?.trim() ?? null;
          const effect =
            el
              .querySelector('.attack-summary-row__footer')
              ?.textContent?.trim() ?? null;

          return {
            name,
            damage,
            effect,
            energies,
          };
        });

        const detailSections = Array.from(
          document.querySelectorAll('.card-detail__content-body .flex-1'),
        );
        const weaknessElement = detailSections.find((el) =>
          el.querySelector('.mb-1')?.textContent?.includes('Weakness'),
        );
        const retreatElement = detailSections.find((el) =>
          el.querySelector('.mb-1')?.textContent?.includes('Retreat'),
        );

        const weaknessIcon = weaknessElement?.querySelector('.energy-icon');
        const weaknessType =
          weaknessIcon?.className.match(/energy-icon--type-([a-z]+)/)?.[1] ??
          null;
        let weaknessModifier: string | null = null;
        if (weaknessElement) {
          const modifierNode = Array.from(
            weaknessElement.querySelectorAll('div'),
          ).find((node) => /\+|−|-/.test(node.textContent ?? ''));
          if (modifierNode) {
            weaknessModifier = modifierNode.textContent?.trim() ?? null;
          } else {
            const parts =
              weaknessElement.textContent
                ?.split('\n')
                .map((part) => part.trim())
                .filter(Boolean) ?? [];
            weaknessModifier = parts.pop() ?? null;
          }
        }

        const retreatCost =
          retreatElement?.querySelectorAll('.energy-icon').length ?? 0;

        const flavor =
          document.querySelector('.fst-italic')?.textContent?.trim() ?? null;
        let artist: string | null = null;
        const artistNode = Array.from(
          document.querySelectorAll('.card-detail__content-body div'),
        ).find((el) => el.textContent?.trim().startsWith('Illustrated by'));
        if (artistNode) {
          artist =
            artistNode.textContent?.replace('Illustrated by', '').trim() ??
            null;
        }

        const metaItems = Array.from(
          document.querySelectorAll('.card-collection-summary__meta-item'),
        ).map((el) => el.textContent?.trim() ?? '');
        const numberItem = metaItems.find((item) => item.startsWith('#'));
        const rarity =
          metaItems.length > 1 ? metaItems[metaItems.length - 1] : null;
        const number = numberItem
          ? parseInt(numberItem.replace(/[^0-9]/g, ''), 10)
          : null;

        const imageUrl =
          document
            .querySelector('.game-card-image__img')
            ?.getAttribute('src') ?? null;

        const name =
          document
            .querySelector('.card-detail__header h1')
            ?.textContent?.trim() ?? null;

        return {
          success: true,
          data: {
            name,
            cardType,
            cardVariant,
            evolvesFrom,
            hp,
            types,
            ability,
            attacks,
            weakness: { type: weaknessType, modifier: weaknessModifier },
            retreatCost,
            flavor,
            artist,
            number,
            rarity,
            imageUrl,
          },
        };
      });

      if (!evaluateResult.success) {
        this.logger.warn(
          `Skipping card ${set.code} #${meta.number} (${meta.slug}) - not found`,
        );
        return;
      }

      const data = evaluateResult.data!;
      const normalizedSetCode = set.code.toUpperCase();
      const cardObject = new Card();
      cardObject.code = `${normalizedSetCode}-${meta.number
        .toString()
        .padStart(3, '0')}`;
      cardObject.set = normalizedSetCode;
      cardObject.number = meta.number;
      cardObject.name = data.name ?? `Card ${meta.number}`;
      cardObject.cardType = data.cardType ?? '';
      cardObject.cardVariant = data.cardVariant ?? '';
      cardObject.evolvesFrom = data.evolvesFrom ?? '';
      cardObject.hp = data.hp ?? undefined;

      const mappedTypes = data.types.map((type) =>
        this.mapPokemonZoneType(type),
      );
      cardObject.pokemonType = mappedTypes.join('/') ?? '';

      if (data.ability?.name) {
        const ability = new CardAbility();
        ability.name = data.ability.name;
        ability.effect = data.ability.effect ?? '';
        cardObject.ability = ability;
      }

      if (data.attacks.length > 0) {
        cardObject.attack_1 = this.convertPokemonZoneAttack(data.attacks[0]);
      }
      if (data.attacks.length > 1) {
        cardObject.attack_2 = this.convertPokemonZoneAttack(data.attacks[1]);
      }

      cardObject.weakness = this.buildWeaknessString(
        data.weakness?.type,
        data.weakness?.modifier,
      );
      cardObject.retreat = data.retreatCost ?? 0;
      cardObject.flavor = data.flavor ?? '';
      cardObject.artist = data.artist ?? '';
      cardObject.rarity = data.rarity ?? '?';
      cardObject.description = undefined;

      if (data.imageUrl) {
        const localImage = await this.helperService.downloadAndSaveImage(
          data.imageUrl,
          `cards/${normalizedSetCode}`,
          `${meta.number.toString().padStart(3, '0')}.webp`,
        );
        cardObject.image = localImage ?? data.imageUrl;
      } else {
        cardObject.image = '';
      }

      await this.createCard(cardObject);
    } catch (error) {
      this.logger.error(
        `Failed to scrape card ${set.code} #${meta.number} (${meta.slug}): ${error}`,
      );
    } finally {
      await page.close();
    }
  }

  private convertPokemonZoneAttack(raw: PokemonZoneAttackPayload): CardAttack {
    const attack = new CardAttack();
    attack.energy = raw.energies.map((energy) =>
      this.mapPokemonZoneType(energy),
    );
    attack.name = raw.name ?? '';
    attack.effect = raw.effect ?? undefined;
    attack.power = raw.damage ?? undefined;
    return attack;
  }

  private mapPokemonZoneType(type?: string | null): string {
    if (!type) {
      return '';
    }

    return this.pokemonZoneTypeMap[type] ?? type;
  }

  private buildWeaknessString(
    type?: string | null,
    modifier?: string | null,
  ): string {
    if (!type) {
      return modifier ?? 'None';
    }

    const typeLabel = this.mapPokemonZoneType(type);
    return modifier ? `${typeLabel} ${modifier}` : typeLabel;
  }

  private async createBrowser(): Promise<Browser> {
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  private async preparePokemonZonePage(page: Page): Promise<void> {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1280, height: 720 });
  }

  async createCard(card: Card): Promise<Card> {
    return await this.cardModel.findOneAndUpdate({ code: card.code }, card, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }
}

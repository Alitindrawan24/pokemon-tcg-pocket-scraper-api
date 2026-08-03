import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';
import {
  DEFAULT_SCRAPER_SOURCE,
  normalizeScraperSource,
  ScraperSource,
} from './scraper.constants';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}
  @Get('/')
  async handleScrapeSet(
    @Headers() headers: Record<string, string>,
    @Query('source') sourceParam?: string,
  ) {
    const tokenStatic = process.env.TOKEN_STATIC;
    if (tokenStatic != '' && tokenStatic != headers['x-token-static']) {
      throw new UnauthorizedException();
    }

    const normalizedSource = normalizeScraperSource(sourceParam);
    if (sourceParam && !normalizedSource) {
      throw new BadRequestException(`Invalid source: ${sourceParam}`);
    }

    const source: ScraperSource = normalizedSource ?? DEFAULT_SCRAPER_SOURCE;

    const res = await this.scraperService.scrapeSetList(source);
    return res;
  }

  @Get('/:setCode/images')
  async handleScrapeImages(
    @Headers() headers: Record<string, string>,
    @Param('setCode') setCode: string,
    @Query('source') sourceParam?: string,
  ) {
    const tokenStatic = process.env.TOKEN_STATIC;
    if (tokenStatic != '' && tokenStatic != headers['x-token-static']) {
      throw new UnauthorizedException();
    }

    const normalizedSource = normalizeScraperSource(sourceParam);
    if (sourceParam && !normalizedSource) {
      throw new BadRequestException(`Invalid source: ${sourceParam}`);
    }

    const source: ScraperSource = normalizedSource ?? DEFAULT_SCRAPER_SOURCE;

    // Cari set dari code saja, tidak terikat source — supaya set Limitless bisa scrape image dari Pokemon Zone
    const set =
      (await this.scraperService.getSetByCode(setCode, source)) ??
      (await this.scraperService.getSetByCode(
        setCode,
        source === ScraperSource.LIMITLESS
          ? ScraperSource.POKEMON_ZONE
          : ScraperSource.LIMITLESS,
      ));

    if (!set) {
      throw new NotFoundException('Set not found');
    }

    const result = await this.scraperService.scrapeSetImages(set, source);
    return result;
  }

  @Get('/:setCode')
  async handleScrapeCard(
    @Headers() headers: Record<string, string>,
    @Param('setCode') setCode: string,
    @Query('source') sourceParam?: string,
  ) {
    const tokenStatic = process.env.TOKEN_STATIC;
    if (tokenStatic != '' && tokenStatic != headers['x-token-static']) {
      throw new UnauthorizedException();
    }

    const normalizedSource = normalizeScraperSource(sourceParam);
    if (sourceParam && !normalizedSource) {
      throw new BadRequestException(`Invalid source: ${sourceParam}`);
    }

    const source: ScraperSource = normalizedSource ?? DEFAULT_SCRAPER_SOURCE;

    const set = await this.scraperService.getSetByCode(setCode, source);

    if (!set) {
      throw new NotFoundException('Set not found');
    }

    const res = await this.scraperService.scrapeSet(set, source);
    return res;
  }
}

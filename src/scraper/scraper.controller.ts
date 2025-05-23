import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}
  @Get('/')
  async handleScrapeSet(@Headers() headers: Record<string, string>) {
    const tokenStatic = process.env.TOKEN_STATIC;
    if (tokenStatic != '' && tokenStatic != headers['x-token-static']) {
      throw new UnauthorizedException();
    }

    const res = await this.scraperService.scrapeSetList();
    return res;
  }

  @Get('/:setCode')
  async handleScrapeCard(
    @Headers() headers: Record<string, string>,
    @Param('setCode') setCode: string,
  ) {
    const tokenStatic = process.env.TOKEN_STATIC;
    if (tokenStatic != '' && tokenStatic != headers['x-token-static']) {
      throw new UnauthorizedException();
    }

    const set = await this.scraperService.getSetByCode(setCode);

    if (!set) {
      throw new NotFoundException('Set not found');
    }

    const res = await this.scraperService.scrapeSet(set);
    return res;
  }
}

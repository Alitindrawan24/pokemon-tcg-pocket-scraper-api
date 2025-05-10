import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}
  @Get('/')
  async handleScrapeSet(): Promise<string> {
    const res = await this.scraperService.scrapeSetList();
    return res;
  }

  @Get('/:setCode')
  async handleScrapeCard(@Param('setCode') setCode: string) {
    const set = await this.scraperService.getSetByCode(setCode);

    if (!set) {
      throw new NotFoundException('Set not found');
    }

    const res = await this.scraperService.scrapeSet(set);
    return res;
  }
}

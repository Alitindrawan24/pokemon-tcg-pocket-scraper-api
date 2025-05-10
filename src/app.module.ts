import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ScraperModule } from './scraper/scraper.module';
import { CardModule } from './card/card.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { SetModule } from './set/set.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/tcgpocket'),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ScraperModule,
    CardModule,
    CommonModule,
    SetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

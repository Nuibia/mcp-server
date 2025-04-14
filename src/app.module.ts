import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataController } from './controllers/data.controller';
import { DataService } from './services/data.service';
import { NewsController } from './controllers/news.controller';
import { NewsService } from './services/news.service';
import { SseService } from './services/sse.service';

@Module({
  imports: [],
  controllers: [AppController, DataController, NewsController],
  providers: [AppService, DataService, NewsService, SseService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataController } from './controllers/data.controller';
import { DataService } from './services/data.service';

@Module({
  imports: [],
  controllers: [AppController, DataController],
  providers: [AppService, DataService],
})
export class AppModule {} 
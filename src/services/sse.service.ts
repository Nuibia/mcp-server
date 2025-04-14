import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { NewsItem } from '../models/news.model';

@Injectable()
export class SseService {
  private newsSubject = new Subject<NewsItem[]>();

  constructor() {}

  // 获取 Observable
  getNewsEventObservable() {
    return this.newsSubject.asObservable();
  }

  // 发送新闻更新
  sendNewsUpdate(news: NewsItem[]) {
    this.newsSubject.next(news);
  }
} 
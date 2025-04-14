import { Injectable, OnModuleInit } from '@nestjs/common';
import { NewsItem, NewsResponse, NewsContent } from '../models/news.model';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SseService } from './sse.service';

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly newsPath = join(process.cwd(), 'data', 'news.json');
  private readonly newsContentPath = join(process.cwd(), 'data', 'news-content.json');
  private updateInterval: NodeJS.Timeout;

  constructor(private readonly sseService: SseService) {
    this.initializeFiles();
  }

  async onModuleInit() {
    // 每分钟检查一次更新
    this.updateInterval = setInterval(async () => {
      try {
        const news = await this.getNewsList();
        this.sseService.sendNewsUpdate(news.data);
      } catch (error) {
        console.error('新闻更新失败:', error);
      }
    }, 60000);
  }

  private async initializeFiles() {
    try {
      await fs.access(this.newsPath);
    } catch {
      await fs.writeFile(this.newsPath, JSON.stringify([]));
    }

    try {
      await fs.access(this.newsContentPath);
    } catch {
      await fs.writeFile(this.newsContentPath, JSON.stringify({}));
    }
  }

  async getNewsList(type: string = 'top', page: number = 1, pageSize: number = 20): Promise<NewsResponse> {
    const data = await fs.readFile(this.newsPath, 'utf8');
    const allNews: NewsItem[] = JSON.parse(data);
    
    const filteredNews = allNews.filter(news => type === 'top' || news.category === type);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedNews = filteredNews.slice(start, end);

    return {
      stat: 'ok',
      data: paginatedNews,
      page,
      pageSize,
      total: filteredNews.length
    };
  }

  async getNewsContent(uniquekey: string): Promise<NewsContent | null> {
    const data = await fs.readFile(this.newsContentPath, 'utf8');
    const contents: Record<string, NewsContent> = JSON.parse(data);
    return contents[uniquekey] || null;
  }

  // 用于同步数据的方法
  async syncNews(news: NewsItem[]) {
    await fs.writeFile(this.newsPath, JSON.stringify(news, null, 2));
    this.sseService.sendNewsUpdate(news);
  }

  async syncNewsContent(uniquekey: string, content: NewsContent) {
    const data = await fs.readFile(this.newsContentPath, 'utf8');
    const contents: Record<string, NewsContent> = JSON.parse(data);
    contents[uniquekey] = content;
    await fs.writeFile(this.newsContentPath, JSON.stringify(contents, null, 2));
  }
} 
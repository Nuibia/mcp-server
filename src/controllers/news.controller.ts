import { Controller, Get, Query, Param, HttpException, HttpStatus, Sse, MessageEvent } from '@nestjs/common';
import { Observable, merge, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { NewsService } from '../services/news.service';
import { SseService } from '../services/sse.service';

@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly sseService: SseService,
  ) {
    console.log('NewsController 已初始化');
  }

  @Get()
  async getNewsList(
    @Query('type') type: string = 'top',
    @Query('page') page: number = 1,
    @Query('page_size') pageSize: number = 20,
  ) {
    console.log('收到获取新闻列表请求:', { type, page, pageSize });
    try {
      return await this.newsService.getNewsList(type, page, pageSize);
    } catch (error) {
      throw new HttpException('获取新闻列表失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Sse('sse')
  async subscribeToNews(): Promise<Observable<MessageEvent>> {
    console.log('尝试建立 SSE 连接...');
    try {
      // 获取初始数据
      console.log('正在获取初始新闻数据...');
      const initialNews = await this.newsService.getNewsList();
      
      if (!initialNews || !initialNews.data) {
        console.error('没有可用的新闻数据');
        throw new HttpException('没有可用的新闻数据', HttpStatus.NOT_FOUND);
      }

      console.log('SSE 连接已建立，初始数据长度:', initialNews.data.length);

      // 创建初始数据流
      const initialDataStream = from([initialNews.data]).pipe(
        map((news): MessageEvent => {
          console.log('发送初始新闻数据...');
          return {
            data: JSON.stringify(news),
            id: new Date().getTime().toString(),
            type: 'news',
            retry: 15000
          };
        })
      );

      // 合并初始数据流和实时更新流
      return merge(
        initialDataStream,
        this.sseService.getNewsEventObservable().pipe(
          map((news): MessageEvent => {
            console.log('发送新闻更新...');
            return {
              data: JSON.stringify(news),
              id: new Date().getTime().toString(),
              type: 'news',
              retry: 15000
            };
          })
        )
      );
    } catch (error) {
      console.error('SSE 连接错误:', error);
      throw new HttpException('SSE 连接失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  @Get(':uniquekey')
  async getNewsContent(@Param('uniquekey') uniquekey: string) {
    console.log('收到获取新闻内容请求:', uniquekey);
    try {
      const content = await this.newsService.getNewsContent(uniquekey);
      if (!content) {
        throw new HttpException('新闻内容不存在', HttpStatus.NOT_FOUND);
      }
      return content;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('获取新闻内容失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 
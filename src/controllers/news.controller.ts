import { Controller, Get, Query, Param, HttpException, HttpStatus, Res, Req } from '@nestjs/common';
import { Observable, merge, from, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { NewsService } from '../services/news.service';
import { SseService } from '../services/sse.service';
import { Request, Response } from 'express';
import { MessageEvent } from '@nestjs/common';

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

  @Get('sse')
  async subscribeToNews(@Req() req: Request, @Res() res: Response) {
    console.log('尝试建立 SSE 连接 (手动模式)...');

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let subscription: Subscription;

    try {
      console.log('正在获取初始新闻数据...');
      const initialNews = await this.newsService.getNewsList();
      
      if (!initialNews || !initialNews.data) {
        console.error('没有可用的新闻数据');
        res.write(`event: error\ndata: ${JSON.stringify({ message: '没有可用的新闻数据' })}\n\n`);
        res.end();
        return;
      }

      console.log('SSE 连接已建立 (手动模式)，初始数据长度:', initialNews.data.length);

      const initialDataStream = from([initialNews.data]).pipe(
        map((newsArray): MessageEvent => {
          console.log('创建初始新闻数据事件...');
          return {
            data: JSON.stringify(newsArray),
            id: new Date().getTime().toString(),
            type: 'news',
            retry: 15000
          };
        })
      );

      const updateStream = this.sseService.getNewsEventObservable().pipe(
        map((newsArray): MessageEvent => {
          console.log('创建新闻更新事件...');
          return {
            data: JSON.stringify(newsArray),
            id: new Date().getTime().toString(),
            type: 'news',
            retry: 15000
          };
        })
      );

      const messageObservable = merge(initialDataStream, updateStream);

      subscription = messageObservable.subscribe({
        next: (messageEvent: MessageEvent) => {
          if (res.writableEnded) {
             console.warn('SSE connection closed by client, cannot write event.');
             if (subscription) subscription.unsubscribe();
             return;
          }
          try {
            let messageString = "";
            if (messageEvent.type) {
              messageString += `event: ${messageEvent.type}\n`;
            }
            if (messageEvent.id) {
              messageString += `id: ${messageEvent.id}\n`;
            }
            if (messageEvent.retry) {
              messageString += `retry: ${messageEvent.retry}\n`;
            }
            const dataString = typeof messageEvent.data === 'string' ? messageEvent.data : JSON.stringify(messageEvent.data);
            messageString += `data: ${dataString.replace(/\n/g, '\\ndata: ')}\n\n`;

            console.log('Writing SSE event:', messageString);
            res.write(messageString);
          } catch (writeError) {
             console.error('Error writing to SSE stream:', writeError);
             if (subscription) subscription.unsubscribe();
             if (!res.writableEnded) res.end();
          }
        },
        error: (err) => {
          console.error('Error in SSE Observable:', err);
          if (!res.writableEnded) {
             try {
               res.write(`event: error\ndata: ${JSON.stringify({ message: 'SSE stream error', error: err.message })}\n\n`);
             } catch (e) { /* ignore */}
             res.end();
          }
        },
        complete: () => {
          console.log('SSE Observable completed.');
          if (!res.writableEnded) {
            res.end();
          }
        }
      });

      req.on('close', () => {
        console.log('SSE client disconnected (manual mode).');
        if (subscription) {
          subscription.unsubscribe();
          console.log('Unsubscribed from SSE Observable.');
        }
         if (!res.writableEnded) {
            res.end();
         }
      });

    } catch (error) {
      console.error('Error setting up manual SSE:', error);
       if (!res.headersSent) {
           res.status(500).send('Internal Server Error setting up SSE');
       } else if (!res.writableEnded) {
           res.end();
       }
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
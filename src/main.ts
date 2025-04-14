import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  logger.log('正在配置 CORS...');
  // 配置 CORS，支持 SSE
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    exposedHeaders: 'Content-Type',
    credentials: true,
  });
  logger.log('CORS 配置完成');

  // 设置全局路由前缀
  logger.log('正在设置全局路由前缀...');
  app.setGlobalPrefix('api');
  logger.log('全局路由前缀设置完成');

  const port = 3000;
  await app.listen(port);

  logger.log(`应用已启动: http://localhost:${port}`);
  logger.log(`SSE 端点: http://localhost:${port}/api/news/sse`);
  logger.log('所有路由:');
  logger.log('- GET /api/news - 获取新闻列表');
  logger.log('- GET /api/news/:uniquekey - 获取新闻内容');
  logger.log('- GET /api/news/sse - SSE 实时新闻更新');
}
bootstrap();

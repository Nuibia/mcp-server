import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Query,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { NewsService } from '../services/news.service';
// 导入 McpServer，暂时移除 RequestHandlerExtra，因为未导出
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z, ZodError, ZodRawShape } from 'zod'; // 导入 ZodRawShape
import { Request, Response } from 'express';

// --- 常量定义 ---
const MCP_NEWS_BASE_PATH = 'mcp-news'; // Controller 基础路径
const SSE_PATH = 'sse'; // SSE 连接路径
const MCP_POST_PATH = 'mcp'; // MCP 消息处理路径
const LATEST_HEADLINES_TOOL = 'get_latest_headlines'; // 获取最新头条工具名
const SEARCH_NEWS_TOOL = 'search_news'; // 搜索新闻工具名
const API_MCP_POST_FULL_PATH = `/api/${MCP_NEWS_BASE_PATH}/${MCP_POST_PATH}`; // 完整的 MCP POST 路径 (包含全局前缀)

// --- 接口与类型定义 ---

/**
 * @interface NewsItem
 * @description 新闻条目结构的基本表示 (假设结构)
 */
interface NewsItem {
  date: string;
  title: string;
  url: string;
  // ... 其他可能的字段
}

/**
 * @interface McpTextContent
 * @description MCP 工具返回的文本内容结构 (适配SDK)
 */
interface McpTextContent {
  type: 'text'; // 明确类型为 'text'
  text: string;
  [key: string]: unknown; // 添加索引签名以匹配 SDK 类型要求
}

/**
 * @interface McpToolResult
 * @description MCP 工具执行结果的标准格式 (适配 SDK 要求)
 */
interface McpToolResult {
  content: McpTextContent[]; // 使用精确的文本内容类型
  isError?: boolean;
  [key: string]: unknown; // 添加索引签名以匹配 SDK 类型要求
}

/**
 * @class McpNewsController
 * @description 处理与新闻相关的 MCP 请求和 SSE 连接的控制器。
 */
@Injectable()
@Controller(MCP_NEWS_BASE_PATH)
export class McpNewsController implements OnModuleInit, OnModuleDestroy {
  // 使用 NestJS Logger 替换 console
  private readonly logger = new Logger(McpNewsController.name);
  private readonly mcpServer: McpServer;
  // 存储活跃的 SSE 连接 Transport，以 Session ID 为键
  private readonly activeTransports = new Map<string, SSEServerTransport>();

  constructor(private readonly newsService: NewsService) {
    this.logger.log('McpNewsController 初始化中...');
    this.mcpServer = new McpServer({
      name: 'NewsMCPServiceViaSDK',
      version: '1.0.0',
      capabilities: {
        tools: {}, // 工具将在 onModuleInit 中定义
      },
    });
    this.logger.log('McpServer 实例已为 McpNewsController 创建。');
  }

  /**
   * @method onModuleInit
   * @description NestJS 模块初始化生命周期钩子。在此定义 MCP 工具。
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('为 McpNewsController 定义 MCP 工具...');
    try {
      // --- 恢复并简化 get_latest_headlines 工具定义以测试 ---
      // 定义一个非常简单的工具
      this.mcpServer.tool(
        LATEST_HEADLINES_TOOL,
        {}, // 无参数
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (args: Record<string, never>, extra: any): Promise<McpToolResult> => {
          this.logger.log(`MCP SDK 工具: 正在执行简化的 ${LATEST_HEADLINES_TOOL}...`);
          // 直接返回固定文本，确保结构和类型正确
          const simpleContent: McpTextContent[] = [
            { type: 'text', text: '这是一个测试工具的简单返回。' },
          ];
          // 使用 Promise.resolve 包装同步返回值
          return Promise.resolve({ content: simpleContent });
        },
      );
      this.logger.log(`MCP SDK 工具: (简化的) ${LATEST_HEADLINES_TOOL} 已定义。`);

      // --- 保持 search_news 工具注释掉 ---
      /*
      const searchParamsShape: ZodRawShape = {
        query: z.string().describe('用于在新闻文章中搜索的关键词或短语。'),
      };
      this.mcpServer.tool(
        SEARCH_NEWS_TOOL,
        searchParamsShape, // 传递 Shape 定义
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (args: { query?: string }, extra: any): Promise<McpToolResult> => { // 调整 args 类型为简单对象
          const query = args?.query ?? '';
          return this.executeSearchNews(query);
        },
      );
      this.logger.log(`MCP SDK 工具: ${SEARCH_NEWS_TOOL} 已定义。`);
      */

      this.logger.log('McpNewsController 的 MCP 工具已部分定义（用于测试连接）。');
    } catch (error: unknown) {
      this.logger.error('为 McpNewsController 定义 MCP 工具时出错:', this.getErrorMessage(error));
    }
  }

  /**
   * @method onModuleDestroy
   * @description NestJS 模块销毁生命周期钩子。清理活动的 SSE 连接。
   * @returns {void}
   */
  onModuleDestroy(): void {
    this.logger.log('McpNewsController 销毁中。正在清理 Transports...');
    this.activeTransports.forEach((transport, sessionId) => {
      this.logger.log(`清理 Session ID: ${sessionId} 的 Transport...`);
      // 如果 transport 对象有 close 方法，应该在这里调用
      // transport.close();
    });
    this.activeTransports.clear();
    this.logger.log('所有活动的 Transports 已清理。');
  }

  // --- SSE 端点 ---

  /**
   * @method handleSse
   * @description 处理新的 SSE 客户端连接请求。
   * @param {Request} req - Express 请求对象
   * @param {Response} res - Express 响应对象
   * @returns {Promise<void>}
   */
  @Get(SSE_PATH)
  async handleSse(@Req() req: Request, @Res() res: Response): Promise<void> {
    const remoteAddress = req.socket.remoteAddress || '未知地址';
    this.logger.log(
      `收到来自 ${remoteAddress} 的 GET /api/${MCP_NEWS_BASE_PATH}/${SSE_PATH} 连接请求。`,
    );

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 对于 Nginx 等代理很重要

    let transport: SSEServerTransport | undefined;
    let sessionId: string | undefined;

    try {
      // 为此连接创建一个新的 Transport 实例
      // 基础路径需要包含全局 API 前缀
      transport = new SSEServerTransport(API_MCP_POST_FULL_PATH, res);
      sessionId = transport.sessionId; // 获取由 Transport 生成的 Session ID
      this.activeTransports.set(sessionId, transport);
      this.logger.log(`已为 Session: ${sessionId} 创建并存储 SSEServerTransport。`);

      // 将主 MCP Server 逻辑连接到此特定的 Transport 实例
      // 这将触发发送初始 MCP 消息（如服务器信息、工具列表）并刷新响应头
      await this.mcpServer.connect(transport);
      this.logger.log(`McpServer 已连接到 Session: ${sessionId} 的 Transport。`);

      // --- 处理客户端断开连接 ---
      req.on('close', () => {
        this.logger.log(`SSE 客户端 Session: ${sessionId} 已断开连接。`);
        // 清理此 Session 对应的 Transport
        // 使用可选链和检查确保安全删除
        const currentTransport = this.activeTransports.get(sessionId!); // 保持非空断言，因为理论上 close 前 sessionId 已设置
        if (currentTransport) {
          this.activeTransports.delete(sessionId!);
          this.logger.log(`已移除 Session: ${sessionId} 的 Transport。`);
          // 如果 transport 有显式的 close 方法，也应调用
          // currentTransport.close?.();
        } else {
          this.logger.warn(`尝试移除 Session: ${sessionId} 的 Transport 时发现它已被移除。`);
        }
      });

      // 连接建立后，Transport 会根据服务器事件处理后续通信
    } catch (error: unknown) {
      this.logger.error(
        `处理 SSE 连接 (Session: ${sessionId ?? '未分配'}) 时出错:`,
        this.getErrorMessage(error),
        error instanceof Error ? error.stack : undefined,
      );

      // 如果 transport 已创建，则从 Map 中移除
      if (sessionId && this.activeTransports.has(sessionId)) {
        this.activeTransports.delete(sessionId);
        this.logger.warn(`因错误移除了 Session: ${sessionId} 的 Transport。`);
      }

      // 检查响应头是否已发送，以决定如何响应错误
      if (!res.headersSent) {
        this.logger.error('由于 Headers 尚未发送，尝试发送 500 错误状态码。');
        if (!res.writableEnded) {
          try {
            res.status(500).send('在建立 SSE 连接期间发生内部服务器错误。');
          } catch (sendError: unknown) {
            this.logger.error('尝试发送 500 状态码时也发生错误:', this.getErrorMessage(sendError));
            // 如果发送错误响应也失败，确保连接关闭
            if (!res.writableEnded) {
              res.end();
            }
          }
        } else {
          this.logger.error('尝试发送 500 状态码前，响应流已结束。');
        }
      } else if (!res.writableEnded) {
        // 如果 Headers 已发送，无法再发送状态码，只能关闭连接
        this.logger.error('由于 Headers 已发送，正在关闭 SSE 连接...');
        res.end();
      } else {
        // Headers 已发送且流已结束，可能错误发生在连接即将关闭时
        this.logger.error('错误发生在 SSE 连接几乎或已经关闭之后。');
      }
    }
  }

  // --- MCP 消息处理端点 ---

  /**
   * @method handleMcpRequest
   * @description 处理来自客户端的 MCP 消息（如工具调用请求）。
   * @param {string} sessionId - 从查询参数获取的 Session ID
   * @param {Request} req - Express 请求对象
   * @param {Response} res - Express 响应对象
   * @returns {Promise<void>}
   */
  @Post(MCP_POST_PATH)
  async handleMcpRequest(
    @Query('sessionId') sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `收到针对 Session: ${sessionId} 的 POST /api/${MCP_NEWS_BASE_PATH}/${MCP_POST_PATH} 请求。`,
    );
    const transport = this.activeTransports.get(sessionId);

    if (!transport) {
      this.logger.error(`未找到 Session: ${sessionId} 的活动 Transport。`);
      // 使用 NestJS 内建的异常，会自动处理为 404 响应
      throw new NotFoundException(`未找到 Session: ${sessionId} 的活动 Transport。`);
    }

    try {
      this.logger.log(`找到 Transport，正在将 MCP 请求交给它处理 (Session: ${sessionId})。`);
      // 使用 Transport 的方法处理 POST 请求体
      await transport.handlePostMessage(req, res);
      this.logger.log(`Transport 已成功处理 MCP 请求 (Session: ${sessionId})。`);
    } catch (error: unknown) {
      this.logger.error(
        `通过 Transport 处理 MCP 请求时出错 (Session: ${sessionId}):`,
        this.getErrorMessage(error),
        error instanceof Error ? error.stack : undefined,
      );
      // 重新抛出错误，让 NestJS 的全局异常过滤器处理（通常返回 500）
      // 可以根据需要实现更具体的错误处理逻辑
      throw error;
    }
  }

  // --- 私有辅助方法 ---

  /**
   * @method executeGetLatestHeadlines
   * @description 执行获取最新头条新闻的逻辑。
   * @private
   * @returns {Promise<McpToolResult>} MCP 工具结果
   */
  private async executeGetLatestHeadlines(): Promise<McpToolResult> {
    this.logger.log(`MCP SDK 工具: 正在执行 ${LATEST_HEADLINES_TOOL}...`);
    try {
      const newsResult = await this.newsService.getNewsList('top', 1, 10);
      // 假设 newsResult.data 是 NewsItem[] 或 undefined
      const headlines =
        newsResult?.data
          ?.map((item: NewsItem) => `${item.date} - ${item.title} (${item.url})`)
          .join('\n') || '未找到头条新闻。';
      this.logger.log(`MCP SDK 工具: ${LATEST_HEADLINES_TOOL} 结果长度: ${headlines.length}`);
      // 确保返回的 content 结构符合 McpTextContent[]
      const content: McpTextContent[] = [{ type: 'text', text: `最新头条:\n${headlines}` }];
      return { content };
    } catch (error: unknown) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`MCP SDK 工具: 执行 ${LATEST_HEADLINES_TOOL} 时出错:`, errorMessage);
      // 确保返回的 content 结构符合 McpTextContent[]
      const content: McpTextContent[] = [
        { type: 'text', text: `获取头条新闻时出错: ${errorMessage}` },
      ];
      return { content, isError: true };
    }
  }

  /**
   * @method executeSearchNews
   * @description 执行根据查询搜索新闻的逻辑。
   * @private
   * @param {string} query - 搜索关键词
   * @returns {Promise<McpToolResult>} MCP 工具结果
   */
  private async executeSearchNews(query: string): Promise<McpToolResult> {
    this.logger.log(`MCP SDK 工具: 正在执行 ${SEARCH_NEWS_TOOL}，查询: "${query}"`);
    try {
      // 注意：这里仍然使用 'top' 类型获取数据，然后进行过滤。
      // 理想情况下，newsService 应该支持直接按查询搜索。
      const allNews = (await this.newsService.getNewsList('top', 1, 50))?.data;
      const searchResults = allNews
        ?.filter((item: NewsItem) => item.title.toLowerCase().includes(query.toLowerCase()))
        .map((item: NewsItem) => `${item.date} - ${item.title} (${item.url})`)
        .join('\n');

      const resultText =
        searchResults && searchResults.length > 0
          ? `关于 "${query}" 的搜索结果:\n${searchResults}`
          : `未找到与 "${query}" 相关的新闻。`;
      this.logger.log(`MCP SDK 工具: ${SEARCH_NEWS_TOOL} 结果长度: ${resultText.length}`);
      // 确保返回的 content 结构符合 McpTextContent[]
      const content: McpTextContent[] = [{ type: 'text', text: resultText }];
      return { content };
    } catch (error: unknown) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(
        `MCP SDK 工具: 执行 ${SEARCH_NEWS_TOOL} (查询: "${query}") 时出错:`,
        errorMessage,
      );
      // 确保返回的 content 结构符合 McpTextContent[]
      const content: McpTextContent[] = [{ type: 'text', text: `搜索新闻时出错: ${errorMessage}` }];
      return { content, isError: true };
    }
  }

  /**
   * @method formatZodError
   * @description 格式化 Zod 验证错误为可读字符串。
   * @private
   * @param {ZodError} error - Zod 错误对象
   * @returns {string} 格式化后的错误消息
   */
  private formatZodError(error: ZodError): string {
    return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
  }

  /**
   * @method getErrorMessage
   * @description 从未知类型的错误中安全地提取错误消息。
   * @private
   * @param {unknown} error - 捕获到的错误对象
   * @returns {string} 错误消息字符串
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // 如果是 ZodError，可以使用更详细的格式化
      if (error instanceof ZodError) {
        return this.formatZodError(error);
      }
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return '发生了未知类型的错误';
  }
}

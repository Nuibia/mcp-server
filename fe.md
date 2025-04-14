# MCP-Server 技术方案文档

## 技术栈

- 框架：NestJS
- Node.js 版本：v20
- 数据存储：本地 JSON 文件
- 包管理器：Yarn

## 项目结构

```
mcp-server/
├── src/
│   ├── controllers/     # 控制器层
│   ├── services/        # 服务层
│   ├── models/          # 数据模型
│   ├── utils/           # 工具函数
│   ├── config/          # 配置文件
│   └── main.ts          # 应用入口
├── data/                # JSON 数据存储目录
├── package.json
├── tsconfig.json
└── README.md
```

## 核心功能模块

### 1. 数据存储模块

- 使用 Node.js 的 `fs` 模块进行 JSON 文件读写
- 实现数据持久化层，提供 CRUD 操作接口
- 数据文件存储在 `data/` 目录下

### 2. API 接口模块

- RESTful API 设计
- 统一的响应格式
- 错误处理中间件
- 请求参数验证

### 3. 工具模块

- 数据序列化/反序列化
- 文件操作工具
- 日志记录
- 错误处理

## 使用说明

### 1. 环境准备

```bash
# 安装 Node.js v20
# 使用 nvm 安装指定版本
nvm install 20
nvm use 20

# 全局安装 NestJS CLI
yarn global add @nestjs/cli
```

### 2. 项目初始化

```bash
# 创建新项目
nest new mcp-server

# 进入项目目录
cd mcp-server

# 安装依赖
yarn install
```

### 3. 项目配置

在 `package.json` 中添加必要的依赖：

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  }
}
```

### 4. 运行项目

```bash
# 开发模式运行
yarn start:dev

# 生产模式运行
yarn build
yarn start:prod
```

### 5. API 使用示例

#### 创建数据

```typescript
// POST /api/data
{
  "name": "example",
  "value": "test"
}
```

#### 查询数据

```typescript
// GET /api/data/:id
```

#### 更新数据

```typescript
// PUT /api/data/:id
{
  "name": "updated",
  "value": "new value"
}
```

#### 删除数据

```typescript
// DELETE /api/data/:id
```

## 开发规范

1. 代码风格
   - 使用 TypeScript 严格模式
   - 遵循 NestJS 最佳实践
   - 使用 ESLint 和 Prettier 进行代码格式化

2. 命名规范
   - 文件名：kebab-case
   - 类名：PascalCase
   - 变量名：camelCase
   - 常量：UPPER_SNAKE_CASE

3. 注释规范
   - 类和方法使用 JSDoc 注释
   - 复杂逻辑添加必要注释
   - 保持注释的及时更新

## 部署说明

1. 环境要求
   - Node.js v20
   - 足够的磁盘空间用于数据存储
   - 适当的文件读写权限

2. 部署步骤
   ```bash
   # 安装依赖
   yarn install --production

   # 构建项目
   yarn build

   # 启动服务
   yarn start:prod
   ```

3. 监控和维护
   - 定期备份数据文件
   - 监控服务运行状态
   - 日志定期归档

## 注意事项

1. 数据安全
   - 定期备份 JSON 数据文件
   - 实现数据访问权限控制
   - 敏感数据加密存储

2. 性能优化
   - 实现数据缓存机制
   - 优化文件读写操作
   - 控制单次数据加载量

3. 错误处理
   - 完善的错误日志记录
   - 优雅的错误响应处理
   - 数据操作的事务性保证 
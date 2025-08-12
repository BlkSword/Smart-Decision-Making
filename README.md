# 智慧体智能决策模拟系统

这是一个基于AI的商业竞争模拟平台，支持集权和去中心化公司的智能决策对抗。系统通过实时WebSocket通信、Redis集群缓存和多种AI模型集成，提供沉浸式的商业模拟体验。

# 队友GitHub链接
一个基于此系统的玩法DLC
https://github.com/George-is-not-available/multi-agent-business-simulator

(已放入本仓库的DLC目录)

## 核心功能

- **AI决策引擎**: 支持OpenAI、Claude、Moonshot AI等多种AI模型的智能决策
- **实时游戏引擎**: 自动步进、资金分配、商业规则执行
- **公司管理**: 支持集权式和去中心化两种公司类型
- **实时监控**: WebSocket通信、Redis流处理、性能监控
- **可视化界面**: D3.js网络图、实时数据面板、事件图表
- **多模式运行**: 自动模式和手动模式切换
- **游戏总结**: 详细的统计数据和分析报告

## 技术架构

### 前端技术栈
- **框架**: [Next.js 15.4.0] (TypeScript)
- **UI组件**: [shadcn/ui](https://ui.shadcn.com/)
- **图表**: [D3.js](https://d3js.org/)
- **状态管理**: React Hooks + SWR
- **实时通信**: WebSocket

### 后端技术栈
- **框架**: [FastAPI](https://fastapi.tiangolo.com/)
- **数据库**: [PostgreSQL](https://www.postgresql.org/) / SQLite
- **ORM**: [SQLAlchemy](https://www.sqlalchemy.org/)
- **缓存**: [Redis Cluster](https://redis.io/)
- **AI集成**: OpenAI, Claude, Moonshot AI
- **实时通信**: WebSocket + Redis Streams

### 开发工具
- **包管理**: pnpm
- **数据库迁移**: Drizzle ORM
- **代码格式化**: Prettier + ESLint
- **类型检查**: TypeScript

## 快速开始

### 环境要求
- Node.js 18+
- Python 3.8+
- PostgreSQL 12+ (或 SQLite)
- Redis 6+ (可选)

### 1. 克隆项目
```bash
git clone <repository-url>
cd ai-business-simulation
```

### 2. 安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
pip install -r requirements.txt
cd ..
```

### 3. 环境配置

#### 前端环境变量 (.env.local)
```bash
# 后端API地址
NEXT_PUBLIC_API_URL=http://localhost:8000

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/ai_business_war

# 认证配置
JWT_SECRET=your-jwt-secret-here
```

#### 后端环境变量 (.env)
```bash
# AI模型API密钥
OPENAI_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
MOONSHOT_API_KEY=your_moonshot_api_key_here

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/ai_business_war

# Redis配置 (可选)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 应用配置
DEBUG=True
LOG_LEVEL=INFO
```

### 4. 数据库设置
```bash
# 设置数据库
npm run db:setup

# 运行迁移
npm run db:migrate

# 初始化数据
npm run db:seed
```

### 5. 启动服务
```bash
# 启动后端服务
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 新终端启动前端服务
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 系统特性

### AI决策系统
- 支持多种AI模型集成
- 智能决策逻辑
- 成本控制和监控
- 决策历史记录

### 实时通信
- WebSocket实时数据推送
- Redis Streams事件流
- 连接状态监控
- 自动重连机制

### 游戏引擎
- 自动轮次执行
- 手动模式控制
- 事件系统
- 资金和资源管理

### 可视化界面
- 实时数据面板
- 公司状态卡片
- 事件时间线
- 网络关系图

## 开发指南

### 项目结构
```
ai-business-simulation/
├── app/                    # Next.js应用页面
├── backend/               # FastAPI后端
│   ├── core/             # 核心模块
│   ├── models/           # 数据模型
│   └── routers/          # API路由
├── components/           # React组件
├── lib/                  # 工具库
└── public/              # 静态资源
```

### 开发命令
```bash
# 前端开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 数据库操作
npm run db:setup         # 设置数据库
npm run db:migrate       # 运行迁移
npm run db:seed          # 初始化数据
npm run db:studio        # 打开数据库管理界面

# 后端开发
cd backend
uvicorn main:app --reload  # 启动开发服务器
```


## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。


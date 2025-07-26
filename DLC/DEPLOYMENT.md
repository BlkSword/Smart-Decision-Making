# 部署指南 - 多智能体商业模拟器

## 📋 部署概述

本指南详细介绍如何将多智能体商业模拟器部署到生产环境。

## 🛠️ 部署环境要求

### 系统要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+)
- **Node.js**: 18.0+ 
- **RAM**: 最低 2GB，推荐 4GB+
- **存储**: 最低 10GB 可用空间
- **网络**: 稳定的互联网连接

### 服务依赖
- **PostgreSQL**: 13.0+
- **Redis**: 6.0+ (可选，用于缓存)
- **Nginx**: 1.18+ (反向代理)
- **PM2**: 进程管理器

## 🚀 快速部署 (Docker)

### 1. 使用 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/business_simulator
      - MOONSHOT_API_KEY=${MOONSHOT_API_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=business_simulator
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### 2. 创建 Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境
FROM node:18-alpine AS runner

WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 设置权限
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

CMD ["node", "server.js"]
```

### 3. 部署命令
```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

## 🔧 手动部署

### 1. 环境准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt-get install -y nginx
```

### 2. 数据库配置
```bash
# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE DATABASE business_simulator;
CREATE USER gameuser WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE business_simulator TO gameuser;
\q
EOF
```

### 3. 应用部署
```bash
# 克隆代码
git clone <repository-url>
cd multi-agent-business-simulator

# 安装依赖
npm ci --only=production

# 配置环境变量
cat > .env.local << EOF
NODE_ENV=production
DATABASE_URL=postgresql://gameuser:your_password@localhost:5432/business_simulator
MOONSHOT_API_KEY=your_moonshot_api_key
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_nextauth_secret
EOF

# 构建应用
npm run build

# 启动应用
pm2 start npm --name "business-simulator" -- start
pm2 startup
pm2 save
```

### 4. Nginx 配置
```nginx
# /etc/nginx/sites-available/business-simulator
server {
    listen 80;
    server_name yourdomain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL 证书配置
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 反向代理配置
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态文件缓存
    location /_next/static {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 安全头配置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/business-simulator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🌐 云平台部署

### 1. Vercel 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 配置环境变量
vercel env add DATABASE_URL
vercel env add MOONSHOT_API_KEY
```

### 2. AWS 部署
```bash
# 使用 AWS Amplify
amplify init
amplify add hosting
amplify publish

# 或使用 AWS Elastic Beanstalk
eb init
eb create production
eb deploy
```

### 3. 阿里云部署
```bash
# 使用阿里云 ECS
# 1. 创建 ECS 实例
# 2. 配置安全组
# 3. 安装运行环境
# 4. 部署应用代码
```

## 🔐 安全配置

### 1. 环境变量管理
```bash
# 使用 dotenv 管理环境变量
npm install dotenv

# 创建 .env.production
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
MOONSHOT_API_KEY=sk-xxx
NEXTAUTH_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret
EOF

# 设置文件权限
chmod 600 .env.production
```

### 2. 数据库安全
```sql
-- 创建只读用户
CREATE USER readonly WITH ENCRYPTED PASSWORD 'readonly_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- 限制连接数
ALTER USER gameuser CONNECTION LIMIT 50;

-- 设置密码过期
ALTER USER gameuser VALID UNTIL '2024-12-31';
```

### 3. 应用安全
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 📊 监控和日志

### 1. 应用监控
```javascript
// lib/monitoring.js
const monitoring = {
  // 错误监控
  logError: (error, context) => {
    console.error(`[${new Date().toISOString()}] ERROR:`, error);
    // 发送到监控服务
  },
  
  // 性能监控
  logPerformance: (metric, value) => {
    console.log(`[${new Date().toISOString()}] PERF: ${metric} = ${value}ms`);
  },
  
  // 业务监控
  logBusiness: (event, data) => {
    console.log(`[${new Date().toISOString()}] BUSINESS: ${event}`, data);
  }
};

export default monitoring;
```

### 2. 日志管理
```javascript
// lib/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### 3. 健康检查
```javascript
// pages/api/health.js
export default async function handler(req, res) {
  try {
    // 检查数据库连接
    await db.query('SELECT 1');
    
    // 检查 AI 服务
    const aiHealthy = await checkAIService();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      database: 'connected',
      ai_service: aiHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}
```

## 🚀 性能优化

### 1. 构建优化
```javascript
// next.config.js
module.exports = {
  // 启用压缩
  compress: true,
  
  // 图片优化
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 实验性功能
  experimental: {
    optimizeCss: true,
    optimizeImages: true,
  },
  
  // Webpack 优化
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks.chunks = 'all';
    }
    return config;
  }
};
```

### 2. 缓存策略
```javascript
// lib/cache.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cache = {
  get: async (key) => {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },
  
  set: async (key, value, ttl = 3600) => {
    await redis.setex(key, ttl, JSON.stringify(value));
  },
  
  del: async (key) => {
    await redis.del(key);
  }
};
```

### 3. 数据库优化
```sql
-- 创建索引
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_buildings_owner ON buildings(owner);
CREATE INDEX idx_agents_company ON agents(company);

-- 分析查询性能
EXPLAIN ANALYZE SELECT * FROM companies WHERE status = 'active';
```

## 📈 扩展部署

### 1. 负载均衡
```nginx
# upstream 配置
upstream app_servers {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    location / {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. 数据库集群
```bash
# 主从复制配置
# master.conf
listen_addresses = '*'
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3

# slave.conf
hot_standby = on
```

### 3. 微服务架构
```javascript
// 拆分服务
const services = {
  game: 'http://game-service:3000',
  ai: 'http://ai-service:3001',
  notification: 'http://notification-service:3002'
};

// 服务发现
const serviceDiscovery = {
  register: (name, url) => {
    // 注册服务
  },
  discover: (name) => {
    // 发现服务
  }
};
```

## 🔄 CI/CD 流程

### 1. GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Build
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to server
      run: |
        ssh user@server "cd /app && git pull && npm install && npm run build && pm2 reload all"
```

### 2. 自动化脚本
```bash
#!/bin/bash
# deploy.sh

set -e

echo "Starting deployment..."

# 备份
backup_dir="/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $backup_dir
cp -r /app $backup_dir/

# 更新代码
cd /app
git pull origin main

# 安装依赖
npm ci --only=production

# 构建
npm run build

# 重启服务
pm2 reload all

echo "Deployment completed successfully!"
```

## 🆘 故障排除

### 1. 常见问题
```bash
# 检查应用状态
pm2 status

# 查看日志
pm2 logs business-simulator

# 检查端口占用
netstat -tlnp | grep 3000

# 检查数据库连接
pg_isready -h localhost -p 5432
```

### 2. 错误处理
```javascript
// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 优雅关闭
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### 3. 回滚策略
```bash
#!/bin/bash
# rollback.sh

backup_dir=$1
if [ -z "$backup_dir" ]; then
    echo "Usage: ./rollback.sh <backup_directory>"
    exit 1
fi

echo "Rolling back to $backup_dir..."

# 停止服务
pm2 stop all

# 恢复代码
cp -r $backup_dir/app/* /app/

# 重启服务
pm2 start all

echo "Rollback completed!"
```

## 📋 部署检查清单

### 部署前检查
- [ ] 环境变量配置完成
- [ ] 数据库连接测试通过
- [ ] 依赖安装完成
- [ ] 构建测试通过
- [ ] 安全配置完成

### 部署后检查
- [ ] 应用启动正常
- [ ] 健康检查通过
- [ ] 日志输出正常
- [ ] 性能指标正常
- [ ] 监控报警配置

### 生产运行检查
- [ ] 负载均衡配置
- [ ] 备份策略实施
- [ ] 监控告警正常
- [ ] 日志轮转配置
- [ ] 安全更新计划

---

这份部署指南提供了完整的部署流程和最佳实践，确保应用能够稳定运行在生产环境中。
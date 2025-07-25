# AI商战模拟系统 - 生产环境部署指南

## 系统架构概述

### 技术栈
- **前端**: Next.js 15.4.0 (TypeScript)
- **后端**: Python FastAPI
- **数据库**: PostgreSQL (推荐) / SQLite (开发)
- **缓存**: Redis Cluster
- **AI服务**: 支持OpenAI、Claude、Moonshot AI、本地AI
- **实时通信**: WebSocket + Redis Streams

### 核心功能
- AI决策引擎：集权 vs 去中心化公司决策模拟
- 实时游戏引擎：自动步进、资金分配、商业规则
- 实时监控：WebSocket通信、Redis流处理
- 可视化界面：D3.js网络图、实时数据面板

## 部署准备

### 1. 环境变量配置

#### 前端环境变量 (.env.local)
```bash
# 后端API地址
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

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

# Redis集群配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_MAX_CONNECTIONS=100
REDIS_SOCKET_TIMEOUT=5

# 应用配置
DEBUG=False
LOG_LEVEL=INFO
ALLOWED_HOSTS=*.yourdomain.com

# 游戏配置
DEFAULT_STEP_INTERVAL=30
DEFAULT_BASE_FUNDING_RATE=1000
DEFAULT_MAX_COMPANIES=10
DEFAULT_DECISION_TIMEOUT=60
```

### 2. 性能优化配置

#### Next.js 优化
```javascript
// next.config.ts
const nextConfig = {
  // 生产环境优化
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  
  // 压缩配置
  compress: true,
  
  // 允许的主机
  allowedDevOrigins: ['*.yourdomain.com'],
  
  // 实验性功能
  experimental: {
    ppr: true,
    turbo: {
      resolveAlias: {
        canvas: './empty-module.js',
      },
    },
  },
}
```

#### FastAPI 优化
```python
# 生产环境启动命令
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --access-log
```

### 3. 数据库部署

#### PostgreSQL 推荐配置
```sql
-- 创建数据库和用户
CREATE DATABASE ai_business_war;
CREATE USER ai_war_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ai_business_war TO ai_war_user;

-- 性能调优
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

#### 数据库迁移
```bash
# 运行迁移
cd backend
python -m alembic upgrade head

# 初始化数据
python -c "from lib.db.seed import seed_database; seed_database()"
```

### 4. Redis 集群部署

#### Redis 配置文件 (redis.conf)
```
# 基础配置
port 6379
bind 0.0.0.0
protected-mode yes
requirepass your_redis_password

# 内存配置
maxmemory 1gb
maxmemory-policy allkeys-lru

# 持久化
save 900 1
save 300 10
save 60 10000

# 集群配置
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
```

## 部署步骤

### 1. 系统依赖安装
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip nodejs npm postgresql-client redis-server

# 安装Python依赖
cd backend
pip install -r requirements.txt

# 安装Node.js依赖
cd ..
npm install
```

### 2. 前端构建
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### 3. 后端部署
```bash
# 使用Gunicorn部署
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# 或使用Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. 负载均衡配置 (Nginx)
```nginx
upstream frontend {
    server 127.0.0.1:3000;
}

upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    # 前端应用
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 后端API
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # WebSocket支持
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

## 监控和维护

### 1. 日志管理
```bash
# 创建日志目录
mkdir -p /var/log/ai-business-war

# 配置日志轮转
cat > /etc/logrotate.d/ai-business-war << EOF
/var/log/ai-business-war/*.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
    create 644 www-data www-data
}
EOF
```

### 2. 健康检查
```bash
# 前端健康检查
curl -f http://localhost:3000/ || exit 1

# 后端健康检查
curl -f http://localhost:8000/health || exit 1

# Redis健康检查
redis-cli ping || exit 1
```

### 3. 性能监控
- 使用内置的Redis性能监控系统
- 配置Prometheus + Grafana监控
- 设置告警通知

## 安全配置

### 1. 防火墙配置
```bash
# 开放必要端口
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. SSL/TLS配置
```bash
# 安装Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d yourdomain.com
```

### 3. 数据库安全
```sql
-- 限制数据库访问
REVOKE ALL ON SCHEMA public FROM public;
GRANT ALL ON SCHEMA public TO ai_war_user;

-- 配置SSL连接
ALTER SYSTEM SET ssl = on;
```

## 扩展性配置

### 1. 水平扩展
- 前端：多实例部署，负载均衡
- 后端：多Worker进程，API网关
- 数据库：读写分离，分库分表
- Redis：集群模式，分片存储

### 2. 垂直扩展
- 增加服务器配置
- 优化数据库参数
- 调整Redis内存配置

## 故障恢复

### 1. 数据备份
```bash
# 数据库备份
pg_dump ai_business_war > backup_$(date +%Y%m%d).sql

# Redis备份
redis-cli --rdb backup.rdb
```

### 2. 服务重启
```bash
# 重启所有服务
sudo systemctl restart nginx
sudo systemctl restart postgresql
sudo systemctl restart redis-server
pm2 restart all
```

## 部署检查清单

- [ ] 环境变量配置完成
- [ ] 数据库连接正常
- [ ] Redis集群运行正常
- [ ] AI API密钥配置正确
- [ ] SSL证书安装完成
- [ ] 防火墙规则配置
- [ ] 日志系统配置
- [ ] 监控告警配置
- [ ] 备份策略实施
- [ ] 性能测试通过
- [ ] 安全扫描完成

## 性能基准

### 推荐配置
- **CPU**: 4核心以上
- **内存**: 8GB以上
- **存储**: SSD 100GB以上
- **网络**: 100Mbps以上

### 预期性能
- **并发用户**: 100-500
- **API响应时间**: < 200ms
- **WebSocket延迟**: < 50ms
- **AI决策延迟**: < 5s

## 常见问题

### 1. AI API调用失败
- 检查API密钥是否正确
- 确认网络连接正常
- 查看API使用配额

### 2. Redis连接问题
- 检查Redis服务状态
- 确认密码和端口配置
- 查看连接池设置

### 3. WebSocket连接断开
- 检查Nginx配置
- 确认防火墙设置
- 查看超时参数

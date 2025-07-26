# 技术文档 - 多智能体商业模拟器

## 🏗️ 系统架构

### 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  Game Components  │  UI Components  │  State Management   │
├─────────────────────────────────────────────────────────────┤
│               Game Logic Layer                              │
├─────────────────────────────────────────────────────────────┤
│  AI Decision Engine  │  Competition Engine  │  Stock Market│
├─────────────────────────────────────────────────────────────┤
│               External Services                             │
├─────────────────────────────────────────────────────────────┤
│    Moonshot AI API    │        PostgreSQL Database         │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. 游戏状态管理 (`lib/game/useGameState.ts`)
- **功能**: 中央游戏状态管理
- **职责**: 
  - 管理公司、建筑、智能体状态
  - 处理游戏循环和事件
  - 协调各个子系统
- **关键接口**:
  ```typescript
  interface GameState {
    companies: Company[];
    buildings: Building[];
    agents: Agent[];
    currentTurn: number;
    gameStatus: 'playing' | 'victory' | 'defeat';
    stockMarket: StockMarket;
    winner: Company | null;
    victoryReason: string;
    recentEvents: CompetitionEvent[];
    analytics: CompetitionAnalytics;
  }
  ```

#### 2. AI决策引擎 (`lib/ai/aiDecisionEngine.ts`)
- **功能**: 基于Moonshot AI的智能决策系统
- **职责**:
  - 分析游戏状态
  - 生成决策提示
  - 解析AI响应
  - 执行决策行动
- **决策流程**:
  ```
  游戏状态 → 构建上下文 → 生成提示 → 调用AI API → 解析响应 → 执行行动
  ```

#### 3. 竞争引擎 (`lib/game/competitionEngine.ts`)
- **功能**: 处理公司间竞争和胜负判定
- **职责**:
  - 跟踪竞争事件
  - 计算竞争分析数据
  - 判定游戏结束条件
  - 生成竞争报告

#### 4. 股票市场系统 (`lib/game/stockMarket.ts`)
- **功能**: 模拟股票市场和操纵机制
- **职责**:
  - 管理股票价格
  - 实现7种操纵策略
  - 计算市场影响
  - 更新股票数据

## 🤖 AI系统设计

### Moonshot AI集成架构
```
┌─────────────────────────────────────────────────────────────┐
│                  AI Decision Engine                         │
├─────────────────────────────────────────────────────────────┤
│  Context Builder  │  Prompt Generator  │  Response Parser  │
├─────────────────────────────────────────────────────────────┤
│               Moonshot Client                               │
├─────────────────────────────────────────────────────────────┤
│               HTTP API Client                               │
├─────────────────────────────────────────────────────────────┤
│             Moonshot AI Service                             │
└─────────────────────────────────────────────────────────────┘
```

### AI决策上下文构建
```typescript
interface AIContext {
  company: {
    name: string;
    assets: number;
    employees: number;
    buildings: number;
    marketShare: number;
  };
  competitors: CompetitorInfo[];
  market: {
    availableBuildings: BuildingInfo[];
    stockPrices: StockInfo[];
  };
  gameStatus: {
    turn: number;
    totalCompanies: number;
    playerAssets: number;
  };
}
```

### 决策类型和执行
```typescript
interface AIDecision {
  action: 'purchase_building' | 'recruit_employee' | 'stock_manipulation' | 'attack' | 'intelligence' | 'wait';
  target?: string | number;
  reasoning: string;
  priority: number;
  cost: number;
}
```

## 📊 游戏机制设计

### 1. 建筑系统
- **建筑类型**: 6种不同功能的建筑
- **属性系统**: 等级、收益、维护成本
- **升级机制**: 建筑等级提升系统
- **所有权**: 建筑归属和转让机制

### 2. 智能体行动系统
- **移动系统**: 智能体在地图上的移动
- **任务执行**: 不同类型的任务执行
- **技能系统**: 谈判、间谍、管理技能
- **可视化**: 彩色路径线显示行动类型

### 3. 股票市场机制
```typescript
// 7种股票操纵策略
enum ManipulationStrategy {
  PUMP_AND_DUMP = 'pump_and_dump',
  BEAR_RAID = 'bear_raid',
  WASH_TRADING = 'wash_trading',
  INSIDER_TRADING = 'insider_trading',
  MARKET_CORNERING = 'market_cornering',
  SPOOFING = 'spoofing',
  CHURNING = 'churning'
}
```

### 4. 竞争系统
- **资产追踪**: 实时监控所有公司资产
- **市场份额**: 动态计算市场占有率
- **风险评估**: 企业风险等级评估
- **胜负判定**: 资产归零的自动判定

## 🎮 游戏循环设计

### 主游戏循环 (100ms间隔)
```typescript
useEffect(() => {
  const gameLoop = setInterval(() => {
    // 1. 更新智能体位置
    updateAgentPositions();
    
    // 2. 处理股票市场
    updateStockMarket();
    
    // 3. 更新竞争数据
    updateCompetitionAnalytics();
    
    // 4. 检查游戏结束条件
    checkGameEndConditions();
    
    // 5. 处理AI决策 (10秒冷却)
    if (aiDecisionCooldown === 0) {
      handleAIDecisions();
      setAiDecisionCooldown(100); // 10秒冷却
    } else {
      setAiDecisionCooldown(prev => prev - 1);
    }
  }, 100);
  
  return () => clearInterval(gameLoop);
}, []);
```

### AI决策循环 (10秒间隔)
```typescript
const handleAIDecisions = async () => {
  for (const company of aiCompanies) {
    try {
      const decision = await aiDecisionEngine.current.makeDecision(
        company, 
        gameState, 
        decisionOptions
      );
      
      await executeAIDecision(decision, company);
      
      // 显示AI决策通知
      ToastManager.showAIDecision(decision, company);
    } catch (error) {
      console.error('AI decision error:', error);
    }
  }
};
```

## 🎨 UI组件架构

### 主要UI组件
```
GamePage
├── GameMap (2D地图)
│   ├── BuildingMarkers
│   ├── AgentMarkers
│   └── MovementLines
├── CompetitionPanel (竞争面板)
│   ├── CompanyOverview
│   ├── EventHistory
│   └── Analytics
├── NewsNotification (新闻面板)
│   ├── EventList
│   └── RealTimeUpdates
├── ActionLegend (行动图例)
└── NewsToast (通知系统)
```

### 组件通信模式
```typescript
// 父组件传递游戏状态
<CompetitionPanel
  gameState={gameState}
  playerCompany={playerCompany}
  aiCompanies={aiCompanies}
  onHostileTakeover={handleHostileTakeover}
/>

// 子组件处理用户交互
const handleHostileTakeover = (companyId: string) => {
  // 执行敌对收购逻辑
  setGameState(prev => ({
    ...prev,
    companies: prev.companies.map(c => 
      c.id === companyId ? { ...c, status: 'under_attack' } : c
    )
  }));
};
```

## 🛠️ 开发工具和配置

### TypeScript配置
```json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "esnext",
    "moduleResolution": "node",
    "jsx": "preserve",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Next.js配置
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true,
    nodeMiddleware: true,
    clientSegmentCache: true,
  },
  turbo: {
    loaders: {
      '.svg': ['@svgr/webpack'],
    },
  },
};
```

### 环境配置
```yaml
# .environments.yaml
# Command to run when "Run" button clicked
run_command: 'npm run dev'
# Command to install or update dependencies
dependency_command: npm install
linter_config:
  - config_path: 'tsconfig.json'
    type: 'eslint'
    language: 'typescript'
```

## 🚀 性能优化策略

### 1. 组件优化
- **React.memo**: 防止不必要的重渲染
- **useMemo**: 缓存计算结果
- **useCallback**: 缓存函数引用
- **懒加载**: 按需加载组件

### 2. 状态管理优化
- **状态分片**: 将大状态拆分成小块
- **选择性更新**: 只更新变化的部分
- **批量更新**: 合并多个状态更新

### 3. 渲染优化
- **虚拟化**: 大列表的虚拟化渲染
- **防抖**: 用户交互的防抖处理
- **节流**: 高频事件的节流处理

### 4. API优化
- **请求缓存**: 缓存API响应
- **请求合并**: 合并多个API请求
- **错误重试**: 失败请求的重试机制

## 🔒 安全考虑

### 1. API安全
- **环境变量**: 敏感信息存储在环境变量
- **请求验证**: 验证API请求的合法性
- **错误处理**: 避免敏感信息泄露

### 2. 数据安全
- **输入验证**: 验证用户输入
- **XSS防护**: 防止跨站脚本攻击
- **CSRF保护**: 防止跨站请求伪造

### 3. AI安全
- **提示注入防护**: 防止恶意提示注入
- **输出过滤**: 过滤AI输出的敏感内容
- **访问控制**: 限制AI API的访问

## 📈 监控和调试

### 1. 错误监控
```typescript
// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Game error:', error, errorInfo);
    // 发送错误报告
  }

  render() {
    if (this.state.hasError) {
      return <h1>游戏遇到错误，请刷新页面</h1>;
    }
    return this.props.children;
  }
}
```

### 2. 性能监控
```typescript
// 性能指标收集
const performanceMetrics = {
  gameLoopTime: 0,
  aiDecisionTime: 0,
  renderTime: 0,
  memoryUsage: 0
};

// 监控游戏循环性能
const measureGameLoop = () => {
  const start = performance.now();
  gameLoop();
  const end = performance.now();
  performanceMetrics.gameLoopTime = end - start;
};
```

### 3. 调试工具
- **React DevTools**: 组件状态调试
- **Redux DevTools**: 状态管理调试
- **浏览器DevTools**: 网络和性能调试
- **自定义调试面板**: 游戏状态可视化

## 🔧 部署和运维

### 1. 构建优化
```bash
# 生产构建
npm run build

# 构建分析
npm run analyze

# 静态导出
npm run export
```

### 2. 环境配置
```bash
# 开发环境
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

# 生产环境
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### 3. 健康检查
```typescript
// 健康检查端点
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: await checkDatabaseHealth(),
    aiService: await checkAIServiceHealth()
  };
  
  return Response.json(health);
}
```

## 📚 扩展开发

### 1. 添加新建筑类型
```typescript
// 1. 在Building接口中添加新类型
interface Building {
  type: 'trade_center' | 'hospital' | 'company' | 'real_estate' | 'hotel' | 'apartment' | 'new_building_type';
  // ...其他属性
}

// 2. 在游戏逻辑中添加处理
const handleBuildingPurchase = (buildingType: BuildingType) => {
  switch (buildingType) {
    case 'new_building_type':
      return handleNewBuildingType();
    // ...其他类型
  }
};

// 3. 在UI中添加显示
const getBuildingIcon = (type: BuildingType) => {
  switch (type) {
    case 'new_building_type':
      return <NewBuildingIcon />;
    // ...其他类型
  }
};
```

### 2. 扩展AI策略
```typescript
// 添加新的AI决策策略
interface AIStrategy {
  name: string;
  weight: number;
  condition: (context: AIContext) => boolean;
  execute: (context: AIContext) => AIDecision;
}

const aggressiveStrategy: AIStrategy = {
  name: 'aggressive',
  weight: 0.7,
  condition: (context) => context.company.assets > 1000000,
  execute: (context) => ({
    action: 'attack',
    target: context.competitors[0].id,
    reasoning: '资产充足，采用攻击策略',
    priority: 9,
    cost: 500000
  })
};
```

### 3. 添加新的竞争机制
```typescript
// 新的竞争事件类型
interface CompetitionEvent {
  type: 'asset_change' | 'building_acquired' | 'company_eliminated' | 'hostile_takeover' | 'market_manipulation' | 'new_competition_type';
  // ...其他属性
}

// 处理新的竞争机制
const handleNewCompetition = (event: CompetitionEvent) => {
  // 实现新的竞争逻辑
};
```

## 📋 开发检查清单

### 功能开发
- [ ] 功能规格定义
- [ ] 接口设计
- [ ] 核心逻辑实现
- [ ] UI组件开发
- [ ] 状态管理集成
- [ ] 错误处理
- [ ] 单元测试

### 性能优化
- [ ] 组件性能优化
- [ ] 状态更新优化
- [ ] 渲染性能优化
- [ ] 内存泄漏检查
- [ ] 网络请求优化

### 质量保证
- [ ] TypeScript类型检查
- [ ] ESLint代码检查
- [ ] 单元测试覆盖
- [ ] 集成测试
- [ ] 性能测试
- [ ] 安全测试

### 文档更新
- [ ] API文档更新
- [ ] 用户文档更新
- [ ] 技术文档更新
- [ ] 变更日志更新
- [ ] 部署文档更新

---

这份技术文档为开发者提供了全面的系统架构和实现细节，有助于理解和扩展游戏功能。
# 多智能体商业模拟器 (Multi-Agent Business Simulator)

一个类似群星界面风格的2D商业竞争游戏，采用多智能体系统和AI驱动的竞争机制。

## 🎮 游戏特性

### 核心功能
- **2D虚拟地图商业系统模拟** - 交互式地图，支持建筑购买和管理
- **多智能体系统** - 通过Moonshot AI API实现真实的AI决策
- **公司管理系统** - 支持集权式和去中心化两种管理结构
- **竞争消除机制** - 通过各种手段消灭竞争对手（资产归零）
- **AI驱动的竞争对手** - 智能AI公司实时竞争

### 游戏系统
- **实时2D地图渲染** - 可视化的商业地图和建筑系统
- **股票市场操纵** - 7种不同的市场操纵策略
- **建筑互动系统** - AI必须前往建筑执行操作
- **竞争分析面板** - 实时竞争态势和数据分析
- **智能决策引擎** - 基于Moonshot AI的真实决策系统

## 🛠️ 技术栈

- **Frontend**: Next.js 15 + React + TypeScript
- **Styling**: Tailwind CSS V3
- **Database**: PostgreSQL
- **AI Integration**: Moonshot AI API
- **UI Components**: Lucide React Icons
- **State Management**: React Hooks + Custom Game State

## 🚀 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 数据库
- Moonshot AI API Key

### 安装与运行

1. **克隆项目**
```bash
git clone <repository-url>
cd multi-agent-business-simulator
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
# 创建 .env 文件
MOONSHOT_API_KEY=your_moonshot_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/business_simulator
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问游戏**
```
http://localhost:3000/game
```

## 🎯 游戏玩法

### 游戏目标
通过一切手段消灭其他公司，让它们资产归零出局。

### 游戏机制

#### 1. 建筑系统
- **国际贸易中心** - 高收益贸易建筑
- **中心医院** - 稳定收益的医疗建筑
- **公司总部** - 企业管理中心
- **房地产交易所** - 高风险高回报
- **豪华酒店** - 旅游收益建筑
- **高档公寓** - 稳定租金收入

#### 2. 智能体行动
- **建筑购买** - 扩大商业版图
- **员工招聘** - 提升企业实力
- **股票操纵** - 7种市场操纵策略
- **敌对收购** - 攻击竞争对手
- **情报收集** - 获取竞争信息

#### 3. 竞争机制
- **资产竞争** - 通过各种方式积累资产
- **市场份额** - 争夺更大的市场控制权
- **敌对行动** - 直接攻击竞争对手
- **股市操纵** - 通过股票市场影响对手

## 🤖 AI系统

### Moonshot AI集成
- **智能决策** - AI公司每10秒做出战略决策
- **策略分析** - 基于实时游戏状态分析
- **动态竞争** - AI根据市场变化调整策略
- **决策反馈** - 实时显示AI决策理由

### AI决策类型
1. **建筑投资** - 智能选择最优建筑购买
2. **人员扩张** - 战略性员工招聘
3. **市场操纵** - 股票市场干预
4. **竞争攻击** - 针对性敌对行动
5. **情报战** - 信息收集和分析

## 📊 游戏界面

### 主要组件
- **2D地图视图** - 交互式商业地图
- **公司管理面板** - 企业状态和控制
- **竞争态势面板** - 实时竞争分析
- **股票市场面板** - 市场操纵界面
- **新闻通知系统** - 实时游戏事件
- **行动图例** - 智能体行动指南

### 视觉反馈
- **彩色路径线** - 不同行动类型的可视化
  - 白色虚线：建筑购买
  - 蓝色虚线：员工招聘
  - 红色虚线：敌对行动
  - 黄色虚线：情报收集

## 🔧 开发指南

### 项目结构
```
├── app/
│   ├── game/                 # 游戏主页面
│   └── api/                  # API路由
├── components/               # React组件
├── lib/
│   ├── game/                # 游戏逻辑
│   └── ai/                  # AI决策系统
├── public/                  # 静态资源
└── types/                   # TypeScript类型定义
```

### 核心文件
- `lib/game/useGameState.ts` - 游戏状态管理
- `lib/ai/aiDecisionEngine.ts` - AI决策引擎
- `lib/game/stockMarket.ts` - 股票市场系统
- `lib/game/competitionEngine.ts` - 竞争机制
- `components/CompetitionPanel.tsx` - 竞争面板

### 添加新功能
1. 在 `lib/game/` 中添加游戏逻辑
2. 在 `components/` 中创建UI组件
3. 在 `app/game/page.tsx` 中集成功能
4. 更新类型定义和文档

## 🧪 测试

### 运行测试
```bash
# TypeScript检查
npx tsc --noEmit

# 构建测试
npm run build

# 开发服务器测试
npm run dev
```

### 测试覆盖
- ✅ 游戏状态管理
- ✅ AI决策系统
- ✅ 股票市场机制
- ✅ 竞争分析系统
- ✅ UI组件渲染
- ✅ API端点功能

## 🚀 部署

### 生产环境配置
1. 配置环境变量
2. 设置PostgreSQL数据库
3. 获取Moonshot AI API密钥
4. 构建生产版本

### 部署步骤
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 📈 性能优化

### 已实现的优化
- **组件懒加载** - 按需加载游戏组件
- **状态管理优化** - 高效的游戏状态更新
- **AI决策限流** - 10秒冷却时间防止过度调用
- **视觉效果优化** - 平滑的动画和过渡

### 建议的优化
- 实现游戏状态持久化
- 添加更多AI决策策略
- 优化大规模智能体性能
- 实现多人在线模式

## 🐛 问题排查

### 常见问题
1. **AI决策不工作** - 检查Moonshot API密钥配置
2. **游戏卡顿** - 减少智能体数量或优化渲染
3. **数据库连接失败** - 检查PostgreSQL配置
4. **构建失败** - 清理 `.next` 缓存重新构建

### 日志调试
```bash
# 查看开发日志
npm run dev

# 查看构建日志
npm run build
```

## 📝 更新日志

### v1.0.0 (Current)
- ✅ 基础游戏框架
- ✅ 2D地图系统
- ✅ 多智能体系统
- ✅ AI决策集成
- ✅ 股票市场系统
- ✅ 竞争分析功能
- ✅ 完整UI界面

### 未来计划
- 🔄 多人在线模式
- 🔄 更多建筑类型
- 🔄 高级AI策略
- 🔄 游戏平衡优化
- 🔄 移动端支持

## 🤝 贡献指南

欢迎贡献代码和建议！

### 贡献流程
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

### 开发规范
- 使用TypeScript
- 遵循ESLint规则
- 编写单元测试
- 更新文档

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🙏 致谢

- **Moonshot AI** - 提供智能决策API
- **Next.js团队** - 优秀的React框架
- **Tailwind CSS** - 现代化的CSS框架
- **群星游戏** - UI设计灵感来源

---

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 📧 Email: [your-email@example.com]
- 🐛 Issues: [GitHub Issues]
- 💬 Discussion: [GitHub Discussions]

**享受这个充满策略和竞争的商业模拟游戏吧！** 🎮✨
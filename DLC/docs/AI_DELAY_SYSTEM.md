# AI延迟系统文档

## 概述

AI延迟系统确保AI竞争对手在游戏开始后5秒才开始做出决策，为玩家提供适应游戏的缓冲时间。

## 功能特性

### ⏱️ 时间控制
- **初始延迟**: 游戏开始后5秒AI才开始行动
- **决策间隔**: AI每10秒做出一次决策
- **可视化反馈**: 实时倒计时显示

### 🎮 用户体验
- **准备时间**: 玩家有5秒时间熟悉界面
- **倒计时提示**: 清晰的视觉倒计时
- **状态通知**: Toast通知AI状态变化

## 技术实现

### 1. 核心逻辑修改

**文件**: `lib/game/useGameState.ts`

```tsx
// 初始化AI决策冷却时间为5秒
const [aiDecisionCooldown, setAiDecisionCooldown] = useState(50); // 50 * 100ms = 5000ms

// 游戏循环中的AI决策逻辑
if (aiDecisionCooldown <= 0) {
  // AI开始决策
  setAiDecisionCooldown(100); // 重置为10秒冷却
  
  // 第一次决策时显示通知
  if (newState.currentTurn === 1) {
    toastManager.success('游戏状态', 'AI竞争对手开始行动！', 3000);
  }
  
  // 执行AI决策逻辑...
} else {
  // 倒计时递减
  setAiDecisionCooldown(prev => {
    const newCooldown = prev - 1;
    // 剩余1秒时显示预警
    if (newCooldown === 10) {
      toastManager.info('游戏状态', 'AI竞争对手即将开始行动...', 2000);
    }
    return newCooldown;
  });
}
```

### 2. 倒计时显示组件

**文件**: `components/AICountdown.tsx`

```tsx
interface AICountdownProps {
  cooldown: number;
  isActive: boolean;
}

export const AICountdown: React.FC<AICountdownProps> = ({ cooldown, isActive }) => {
  const secondsLeft = Math.ceil(cooldown / 10);
  
  // 初始倒计时 - 橙色主题
  if (!isActive && cooldown > 0) {
    return (
      <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border-orange-600/50">
        <CardContent>
          <div className="text-2xl font-bold text-orange-400">
            {secondsLeft}s
          </div>
          <div className="text-xs text-orange-300">
            准备中...
          </div>
          {/* 进度条 */}
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
              style={{ width: `${((50 - cooldown) / 50) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // 决策间隔倒计时 - 蓝色主题
  if (isActive && cooldown > 0) {
    return (
      <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-600/50">
        {/* 类似的UI结构但颜色不同 */}
      </Card>
    );
  }
  
  return null;
};
```

### 3. 游戏页面集成

**文件**: `app/game/page.tsx`

```tsx
const {
  // ... 其他返回值
  aiDecisionCooldown
} = useGameState();

// 在游戏界面中显示倒计时
{aiDecisionCooldown > 0 && (
  <div className="mb-4">
    <AICountdown 
      cooldown={aiDecisionCooldown}
      isActive={gameState.currentTurn > 1 || aiDecisionCooldown < 50}
    />
  </div>
)}
```

## 状态管理

### 时间轴设计

```
0ms      - 游戏开始，AI冷却时间 = 50
100ms    - 第一次游戏循环，冷却时间 = 49
...
4900ms   - 冷却时间 = 1
5000ms   - 冷却时间 = 0，AI开始首次决策
5000ms   - 重置冷却时间 = 100 (10秒)
...
15000ms  - 冷却时间 = 0，AI第二次决策
```

### 状态转换

```
初始状态 -> 准备阶段 -> AI激活 -> 循环决策
   |          |         |         |
  t=0      t=0-5s    t=5s     t=5s+10s*n
```

## 视觉反馈系统

### 1. 倒计时卡片

**初始阶段** (前5秒)
- 🟠 橙色主题
- 📊 进度条显示激活进度
- 💬 "准备中..." 状态提示
- ⏰ 倒计时显示剩余秒数

**决策间隔** (每10秒)
- 🔵 蓝色主题
- 📊 进度条显示冷却进度
- 💬 "冷却中..." 状态提示
- ⏰ 倒计时显示下次决策时间

### 2. Toast通知

**即将激活** (剩余1秒)
```tsx
toastManager.info('游戏状态', 'AI竞争对手即将开始行动...', 2000);
```

**首次激活** (第一次决策)
```tsx
toastManager.success('游戏状态', 'AI竞争对手开始行动！', 3000);
```

## 配置选项

### 调整延迟时间

```tsx
// 修改初始延迟时间
const [aiDecisionCooldown, setAiDecisionCooldown] = useState(30); // 3秒延迟

// 修改决策间隔
setAiDecisionCooldown(150); // 15秒间隔
```

### 自定义通知时机

```tsx
// 修改预警时机
if (newCooldown === 20) { // 剩余2秒时提示
  toastManager.info('游戏状态', 'AI竞争对手即将开始行动...', 2000);
}
```

## 性能考虑

### 优化措施

1. **条件渲染**: 只在需要时显示倒计时组件
2. **状态合并**: 避免不必要的重渲染
3. **计算优化**: 使用Math.ceil减少计算复杂度
4. **内存管理**: 组件卸载时自动清理

### 资源使用

- **CPU**: 每100ms一次简单计算
- **内存**: 轻量级状态管理
- **渲染**: 条件渲染，最小化DOM操作

## 测试验证

### 功能测试

```bash
# 启动游戏
npm run dev

# 访问游戏页面
http://localhost:3000/game

# 验证流程
1. 游戏开始后立即显示橙色倒计时
2. 倒计时从5秒递减到0
3. 剩余1秒时显示预警通知
4. 倒计时结束后显示AI激活通知
5. AI开始做出决策
6. 之后每10秒循环一次
```

### 时间精度测试

```jsx
// 添加调试日志
useEffect(() => {
  console.log('AI Cooldown:', aiDecisionCooldown, 'seconds left:', Math.ceil(aiDecisionCooldown / 10));
}, [aiDecisionCooldown]);
```

## 扩展功能

### 可能的改进

1. **可配置延迟**
   - 难度设置影响AI延迟时间
   - 用户可自定义延迟时间

2. **动态调整**
   - 根据游戏进度调整AI行为频率
   - 多层次的AI激活时间

3. **视觉增强**
   - 添加动画效果
   - 声音提示
   - 更丰富的进度指示

4. **智能预测**
   - 预测AI下一步行动
   - 提供策略建议

## 问题排查

### 常见问题

1. **倒计时不显示**
   - 检查`aiDecisionCooldown`是否正确返回
   - 确认条件渲染逻辑
   - 验证组件导入路径

2. **时间不准确**
   - 检查游戏循环间隔(100ms)
   - 确认倒计时计算逻辑
   - 验证状态更新频率

3. **通知不触发**
   - 确认ToastManager正确初始化
   - 检查通知触发条件
   - 验证通知时机设置

### 调试方法

```tsx
// 添加调试信息
console.log('AI Decision Cooldown:', aiDecisionCooldown);
console.log('Game Turn:', gameState.currentTurn);
console.log('AI Active:', gameState.currentTurn > 1 || aiDecisionCooldown < 50);
```

## 更新日志

### v1.0.0 (当前版本)
- ✅ 5秒初始延迟
- ✅ 可视化倒计时
- ✅ Toast通知系统
- ✅ 进度条显示
- ✅ 响应式设计

### 未来版本
- 🔄 可配置延迟时间
- 🔄 动态难度调整
- 🔄 声音提示
- 🔄 AI行为预测

---

**AI延迟系统已成功实现，为玩家提供了更好的游戏体验！** ⏰✨
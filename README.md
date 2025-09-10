# 智能决策引擎

这是一个为游戏NPC或AI设计的智能决策引擎框架，具备以下核心功能：

## 核心特性

1. **智能体实时感知** - 分布式决策机制
2. **互相学习算法** - 基于历史决策的快速响应
3. **共享情景库** - 实时感知当前状态，无需重复更新提示词

## 项目结构

```
.
├── decision_engine.py    # 决策引擎核心实现
├── main.py              # FastAPI接口服务
├── example_usage.py     # 使用示例
├── requirements.txt     # 项目依赖
└── README.md            # 项目说明文档
```

## 核心组件

### 1. Perception（感知）
表示智能体对环境的感知信息，包括时间戳、数据和位置等。

### 2. Decision（决策）
表示智能体做出的决策，包括行为、置信度和上下文等。

### 3. Situation（情景）
表示特定情景的上下文信息，用于存储和检索相似场景。

### 4. PerceptionSystem（感知系统）
负责收集和处理智能体对环境的感知信息。

### 5. SituationRepository（情景库）
存储和管理各种情景及对应的决策。

### 6. LearningSystem（学习系统）
负责从历史决策中学习并优化决策过程。

### 7. AIDecisionMaker（AI决策接口）
定义AI辅助决策的抽象接口。

### 8. DecisionEngine（决策引擎）
整合所有系统，提供统一的决策接口。

## 安装和运行

1. 安装依赖：
```bash
pip install -r requirements.txt
```

2. 运行Web服务：
```bash
uvicorn main:app --reload
```

3. 或者运行示例程序：
```bash
python example_usage.py
```

## API接口

启动服务后，可以通过以下接口与决策引擎交互：

- `GET /` - 检查服务状态
- `POST /perceive` - 添加感知信息
- `POST /decision` - 基于感知信息做出决策

## 扩展建议

1. 可以实现更复杂的AI决策算法替换[SimpleAIDecisionMaker](file:///root/somefun/decision_engine.py#L151-L173)
2. 可以扩展[SituationRepository](file:///root/somefun/decision_engine.py#L72-L109)以支持更复杂的情景相似度计算
3. 可以增强[LearningSystem](file:///root/somefun/decision_engine.py#L112-L150)以支持更高级的机器学习算法
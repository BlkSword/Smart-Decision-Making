"""
智能决策引擎框架
主要用于NPC或游戏AI的智能决策系统
"""

import asyncio
import time
from typing import Dict, List, Any, Optional, Hashable
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Perception:
    """
    感知数据类
    用于存储智能体对环境的感知信息
    """
    agent_id: str
    timestamp: datetime
    data: Dict[str, Any]
    location: Optional[str] = None


@dataclass
class Decision:
    """
    决策数据类
    用于存储决策相关信息
    """
    agent_id: str
    perception_id: str
    action: str
    confidence: float
    timestamp: datetime
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Situation:
    """
    情景数据类
    用于存储特定情景的上下文信息
    """
    id: str
    context: Dict[str, Any]
    decisions: List[Decision] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    last_used: datetime = field(default_factory=datetime.now)


class PerceptionSystem:
    """
    感知系统
    负责收集和处理智能体对环境的感知信息
    """

    def __init__(self):
        self.perceptions: Dict[str, Perception] = {}

    def add_perception(self, perception: Perception) -> str:
        """
        添加感知信息
        """
        perception_id = f"{perception.agent_id}_{perception.timestamp.timestamp()}"
        self.perceptions[perception_id] = perception
        return perception_id

    def get_recent_perceptions(self, agent_id: str, time_window: float = 5.0) -> List[Perception]:
        """
        获取指定时间窗口内的感知信息
        """
        current_time = datetime.now().timestamp()
        recent_perceptions = []
        for perception in self.perceptions.values():
            if (perception.agent_id == agent_id and
                    current_time - perception.timestamp.timestamp() <= time_window):
                recent_perceptions.append(perception)
        return recent_perceptions


class SituationRepository:
    """
    情景库
    存储和管理各种情景及对应的决策
    """

    def __init__(self):
        self.situations: Dict[str, Situation] = {}

    def add_situation(self, situation: Situation):
        """
        添加情景
        """
        self.situations[situation.id] = situation

    def find_similar_situation(self, context: Dict[str, Any]) -> Optional[Situation]:
        """
        查找相似情景
        简化实现：基于简单的键值匹配
        """
        # 生成上下文的简单哈希值
        context_hash = self._hash_context(context)
        return self.situations.get(context_hash)

    def update_situation_usage(self, situation_id: str):
        """
        更新情景的最后使用时间
        """
        if situation_id in self.situations:
            self.situations[situation_id].last_used = datetime.now()

    def _hash_context(self, context: Dict[str, Any]) -> str:
        """
        对上下文进行简单哈希处理
        """
        # 简化实现，实际应用中可能需要更复杂的相似度计算
        sorted_items = sorted(context.items())
        return str(hash(str(sorted_items)))


class LearningSystem:
    """
    学习系统
    负责从历史决策中学习并优化决策过程
    """

    def __init__(self, situation_repo: SituationRepository):
        self.situation_repo = situation_repo
        self.decision_history: List[Decision] = []

    def learn_from_decision(self, perception: Perception, decision: Decision):
        """
        从决策中学习
        """
        self.decision_history.append(decision)

        # 将决策添加到对应的情景中
        context = perception.data.copy()
        if perception.location:
            context['location'] = perception.location

        situation_id = self.situation_repo._hash_context(context)
        existing_situation = self.situation_repo.situations.get(situation_id)

        if existing_situation:
            existing_situation.decisions.append(decision)
            existing_situation.last_used = datetime.now()
        else:
            situation = Situation(
                id=situation_id,
                context=context,
                decisions=[decision]
            )
            self.situation_repo.add_situation(situation)

    def get_similar_decision(self, perception: Perception) -> Optional[Decision]:
        """
        根据相似情景获取决策
        """
        context = perception.data.copy()
        if perception.location:
            context['location'] = perception.location

        similar_situation = self.situation_repo.find_similar_situation(context)
        if similar_situation and similar_situation.decisions:
            # 更新情景使用时间
            self.situation_repo.update_situation_usage(similar_situation.id)
            # 返回最新的决策
            return similar_situation.decisions[-1]
        return None


class AIDecisionMaker(ABC):
    """
    AI决策接口
    定义AI辅助决策的抽象接口
    """

    @abstractmethod
    async def make_decision(self, perception: Perception) -> Decision:
        """
        基于感知信息做出决策
        """
        pass


class SimpleAIDecisionMaker(AIDecisionMaker):
    """
    简单AI决策实现
    模拟AI决策过程
    """

    async def make_decision(self, perception: Perception) -> Decision:
        """
        简单的决策实现，模拟AI处理时间
        """
        # 模拟AI处理时间
        await asyncio.sleep(0.1)

        # 基于感知数据做简单决策
        action = "idle"
        confidence = 0.5

        # 根据感知数据调整决策
        if 'enemy_nearby' in perception.data and perception.data['enemy_nearby']:
            action = "attack"
            confidence = 0.9
        elif 'item_nearby' in perception.data and perception.data['item_nearby']:
            action = "collect"
            confidence = 0.8
        elif 'health_low' in perception.data and perception.data['health_low']:
            action = "heal"
            confidence = 0.95

        return Decision(
            agent_id=perception.agent_id,
            perception_id=f"{perception.agent_id}_{perception.timestamp.timestamp()}",
            action=action,
            confidence=confidence,
            timestamp=datetime.now(),
            context=perception.data
        )


class DecisionEngine:
    """
    决策引擎主类
    整合感知、决策、学习和情景库系统
    """

    def __init__(self, ai_decision_maker: AIDecisionMaker = None):
        self.perception_system = PerceptionSystem()
        self.situation_repository = SituationRepository()
        self.learning_system = LearningSystem(self.situation_repository)
        self.ai_decision_maker = ai_decision_maker or SimpleAIDecisionMaker()

    async def make_decision(self, perception: Perception) -> Decision:
        """
        做出决策的主要方法
        首先尝试从历史情景中查找相似决策，如果没有则使用AI辅助决策
        """
        # 1. 尝试从历史情景中查找相似决策
        similar_decision = self.learning_system.get_similar_decision(perception)
        if similar_decision:
            print(f"使用历史决策: {similar_decision.action}")
            return similar_decision

        # 2. 如果没有相似决策，则使用AI辅助决策
        print("使用AI辅助决策")
        decision = await self.ai_decision_maker.make_decision(perception)

        # 3. 将决策添加到学习系统中
        self.learning_system.learn_from_decision(perception, decision)

        return decision

    def add_perception(self, perception: Perception) -> str:
        """
        添加感知信息
        """
        return self.perception_system.add_perception(perception)
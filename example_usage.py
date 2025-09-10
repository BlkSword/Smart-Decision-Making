"""
决策引擎使用示例
"""

import asyncio
import random
from datetime import datetime
from decision_engine import (
    DecisionEngine, 
    Perception, 
    SimpleAIDecisionMaker
)

async def simulate_game_agent():
    """
    模拟游戏智能体决策过程
    """
    # 初始化决策引擎
    engine = DecisionEngine(SimpleAIDecisionMaker())
    
    # 模拟智能体ID
    agent_id = "npc_001"
    
    # 模拟不同的游戏场景
    scenarios = [
        {"enemy_nearby": True, "health_low": False, "item_nearby": False},
        {"enemy_nearby": False, "health_low": True, "item_nearby": False},
        {"enemy_nearby": False, "health_low": False, "item_nearby": True},
        {"enemy_nearby": False, "health_low": False, "item_nearby": False},
    ]
    
    print("开始模拟游戏智能体决策...")
    
    for i, scenario in enumerate(scenarios):
        print(f"\n--- 场景 {i+1} ---")
        print(f"环境状态: {scenario}")
        
        # 创建感知信息
        perception = Perception(
            agent_id=agent_id,
            data=scenario,
            location=f"location_{random.randint(1, 10)}",
            timestamp=datetime.now()
        )
        
        # 进行决策
        decision = await engine.make_decision(perception)
        
        print(f"决策行为: {decision.action}")
        print(f"置信度: {decision.confidence}")
        
        # 添加一些延迟来模拟时间推移
        await asyncio.sleep(0.5)
    
    print("\n--- 测试相似情景决策 ---")
    # 再次使用相同的情景，测试历史决策重用
    perception = Perception(
        agent_id=agent_id,
        data=scenarios[0],  # 使用第一个场景
        location="location_5",
        timestamp=datetime.now()
    )
    
    decision = await engine.make_decision(perception)
    print(f"相似情景决策行为: {decision.action}")
    print(f"置信度: {decision.confidence}")

if __name__ == "__main__":
    asyncio.run(simulate_game_agent())
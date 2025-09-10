# uvicorn main:app --reload


from typing import Union, Dict, Any
from fastapi import FastAPI
from pydantic import BaseModel
import asyncio

from decision_engine import DecisionEngine, Perception, SimpleAIDecisionMaker

app = FastAPI()

# 初始化决策引擎
decision_engine = DecisionEngine(SimpleAIDecisionMaker())

class PerceptionRequest(BaseModel):
    agent_id: str
    data: Dict[str, Any]
    location: str = None

@app.get("/")
def read_root():
    return {"Hello": "World", "message": "智能决策引擎已启动"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}

@app.post("/decision")
async def make_decision(perception_request: PerceptionRequest):
    """
    基于感知信息做出决策
    """
    perception = Perception(
        agent_id=perception_request.agent_id,
        data=perception_request.data,
        location=perception_request.location
    )
    
    decision = await decision_engine.make_decision(perception)
    
    return {
        "agent_id": decision.agent_id,
        "action": decision.action,
        "confidence": decision.confidence,
        "context": decision.context
    }

@app.post("/perceive")
def add_perception(perception_request: PerceptionRequest):
    """
    添加感知信息
    """
    perception = Perception(
        agent_id=perception_request.agent_id,
        data=perception_request.data,
        location=perception_request.location
    )
    
    perception_id = decision_engine.add_perception(perception)
    
    return {
        "perception_id": perception_id,
        "message": "Perception added successfully"
    }
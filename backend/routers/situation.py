from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
import asyncio
import json
import time
from datetime import datetime, timedelta

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.cache_manager import CacheManager
from core.stream_manager import StreamManager
from core.redis_client_cluster import ClusterAwareRedisClient
from core.game_engine import GameEngine

router = APIRouter(prefix="/api/situation", tags=["situation"])

# 依赖注入
async def get_cache_manager():
    return CacheManager()

async def get_stream_manager():
    return StreamManager()

async def get_redis_client():
    return ClusterAwareRedisClient()

async def get_game_engine():
    # 直接从 main 模块导入游戏引擎实例
    import main
    return main.game_engine

class SituationDataGenerator:
    """态势屏幕数据生成器"""
    
    def __init__(self, cache_manager: CacheManager, stream_manager: StreamManager, redis_client: ClusterAwareRedisClient, game_engine: GameEngine):
        self.cache = cache_manager
        self.stream = stream_manager
        self.redis = redis_client
        self.game_engine = game_engine
        
    def _get_real_companies_data(self):
        """获取真实公司数据"""
        companies = self.game_engine.get_companies()
        return [company.to_dict() for company in companies]
    
    def _get_real_employees_data(self):
        """获取真实员工数据"""
        employees = self.game_engine.get_employees()
        return [employee.to_dict() for employee in employees]
    
    def _get_real_decisions_data(self):
        """获取真实决策数据"""
        decisions = self.game_engine.get_decisions()
        return [decision.to_dict() for decision in decisions]

    async def get_network_topology(self) -> Dict[str, List[Dict]]:
        """获取网络拓扑数据"""
        try:
            # 从游戏引擎获取真实数据
            companies_data = self._get_real_companies_data()
            employees_data = self._get_real_employees_data()
            decisions_data = self._get_real_decisions_data()
            
            if isinstance(companies_data, str):
                companies_data = json.loads(companies_data)
            if isinstance(employees_data, str):
                employees_data = json.loads(employees_data)
            if isinstance(decisions_data, str):
                decisions_data = json.loads(decisions_data)

            nodes = []
            links = []

            # 生成公司节点
            for company in companies_data:
                nodes.append({
                    "id": company.get("id", f"company_{len(nodes)}"),
                    "name": company.get("name", f"Company {len(nodes)}"),
                    "type": "company",
                    "company_type": company.get("company_type", "centralized"),
                    "status": "active" if company.get("is_active", True) else "inactive",
                    "funds": company.get("funds", 100000),
                    "size": company.get("size", 10)
                })

            # 生成员工节点
            company_employees = {}
            for employee in employees_data:
                company_id = employee.get("company_id")
                if company_id not in company_employees:
                    company_employees[company_id] = []
                
                # 随机生成员工状态
                import random
                status_options = ["active", "thinking", "deciding", "idle"]
                weights = [0.4, 0.3, 0.2, 0.1]  # 权重分布
                
                employee_node = {
                    "id": employee.get("id", f"employee_{len(nodes)}"),
                    "name": employee.get("name", f"Employee {len(nodes)}"),
                    "type": "employee",
                    "role": employee.get("role", "employee"),
                    "company_id": company_id,
                    "status": random.choices(status_options, weights=weights)[0]
                }
                
                nodes.append(employee_node)
                company_employees[company_id].append(employee_node)

                # 添加公司-员工连接
                links.append({
                    "source": company_id,
                    "target": employee_node["id"],
                    "type": "hierarchy",
                    "strength": 0.8 if employee_node["role"] == "ceo" else 0.6,
                    "status": "active"
                })

            # 生成员工间的层级关系
            for company_id, employees in company_employees.items():
                company = next((c for c in companies_data if c["id"] == company_id), {})
                company_type = company.get("company_type", "centralized")
                
                ceos = [e for e in employees if e["role"] == "ceo"]
                managers = [e for e in employees if e["role"] == "manager"]
                workers = [e for e in employees if e["role"] == "employee"]

                if company_type == "centralized":
                    # 集权公司：CEO -> 经理 -> 员工
                    for ceo in ceos:
                        for manager in managers:
                            links.append({
                                "source": ceo["id"],
                                "target": manager["id"],
                                "type": "hierarchy",
                                "strength": 0.9,
                                "status": "active"
                            })
                    
                    for manager in managers:
                        # 每个经理管理一部分员工
                        assigned_workers = workers[:len(workers)//len(managers)] if managers else workers
                        for worker in assigned_workers:
                            links.append({
                                "source": manager["id"],
                                "target": worker["id"],
                                "type": "hierarchy",
                                "strength": 0.7,
                                "status": "active"
                            })
                else:
                    # 去中心化公司：更多横向连接
                    all_employees = ceos + managers + workers
                    for i, emp1 in enumerate(all_employees):
                        for emp2 in all_employees[i+1:]:
                            if random.random() > 0.7:  # 30%概率创建连接
                                links.append({
                                    "source": emp1["id"],
                                    "target": emp2["id"],
                                    "type": "communication",
                                    "strength": 0.5,
                                    "status": "active"
                                })

            # 生成决策节点
            for decision in decisions_data:
                if decision.get("status") == "pending":
                    decision_id = f"decision_{decision.get('id')}"
                    nodes.append({
                        "id": decision_id,
                        "name": f"决策: {decision.get('type', 'Unknown')}",
                        "type": "decision",
                        "status": "deciding",
                        "description": decision.get("content", "")
                    })

                    # 连接决策发起者
                    links.append({
                        "source": decision.get("employee_id"),
                        "target": decision_id,
                        "type": "decision",
                        "strength": 0.8,
                        "status": "active"
                    })

            return {"nodes": nodes, "links": links}

        except Exception as e:
            print(f"Error generating network topology: {e}")
            return {"nodes": [], "links": []}

    async def get_activity_stream(self, limit: int = 50) -> List[Dict]:
        """获取活动流数据"""
        try:
            # 从Redis Streams获取最新事件 - 暂时返回空列表
            events = []  # TODO: 实现真正的事件获取
            
            activities = []
            for event_id, fields in events:
                try:
                    event_data = fields
                    activities.append({
                        "id": event_id,
                        "type": event_data.get("type", "info"),
                        "company_id": event_data.get("company_id", ""),
                        "employee_id": event_data.get("employee_id"),
                        "description": event_data.get("message", event_data.get("description", "未知事件")),
                        "timestamp": event_data.get("timestamp", datetime.now().isoformat()),
                        "severity": event_data.get("severity", "info"),
                        "details": event_data.get("details", {})
                    })
                except Exception as e:
                    print(f"Error parsing event {event_id}: {e}")
                    continue

            return activities

        except Exception as e:
            print(f"Error getting activity stream: {e}")
            return []

    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """获取实时指标"""
        try:
            # 从游戏引擎获取真实数据
            simulation_status = {"status": self.game_engine.state.value, "current_step": self.game_engine.current_round}
            companies_data = self._get_real_companies_data()
            employees_data = self._get_real_employees_data()
            decisions_data = self._get_real_decisions_data()

            # 计算实时指标
            total_companies = len(companies_data)
            total_agents = len(employees_data)
            active_decisions = len([d for d in decisions_data if d.get("status") == "pending"])
            
            # 计算公司类型分布
            centralized_count = len([c for c in companies_data if c.get("company_type") == "centralized"])
            decentralized_count = total_companies - centralized_count
            
            # 计算员工状态分布（模拟）
            import random
            active_agents = random.randint(int(total_agents * 0.6), int(total_agents * 0.8))
            thinking_agents = random.randint(int(total_agents * 0.1), int(total_agents * 0.2))
            deciding_agents = random.randint(int(total_agents * 0.1), int(total_agents * 0.2))
            idle_agents = total_agents - active_agents - thinking_agents - deciding_agents

            return {
                "total_companies": total_companies,
                "total_agents": total_agents,
                "active_decisions": active_decisions,
                "company_distribution": {
                    "centralized": centralized_count,
                    "decentralized": decentralized_count
                },
                "agent_status": {
                    "active": max(0, active_agents),
                    "thinking": max(0, thinking_agents),
                    "deciding": max(0, deciding_agents),
                    "idle": max(0, idle_agents)
                },
                "simulation_status": simulation_status.get("status", "stopped"),
                "current_step": simulation_status.get("current_step", 0),
                "last_update": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"Error getting real-time metrics: {e}")
            return {
                "total_companies": 0,
                "total_agents": 0,
                "active_decisions": 0,
                "company_distribution": {"centralized": 0, "decentralized": 0},
                "agent_status": {"active": 0, "thinking": 0, "deciding": 0, "idle": 0},
                "simulation_status": "error",
                "current_step": 0,
                "last_update": datetime.now().isoformat()
            }

@router.get("/topology")
async def get_network_topology(
    cache_manager: CacheManager = Depends(get_cache_manager),
    stream_manager: StreamManager = Depends(get_stream_manager),
    redis_client: ClusterAwareRedisClient = Depends(get_redis_client),
    game_engine: GameEngine = Depends(get_game_engine)
):
    """获取网络拓扑结构"""
    generator = SituationDataGenerator(cache_manager, stream_manager, redis_client, game_engine)
    return await generator.get_network_topology()

@router.get("/activities")
async def get_activity_stream(
    limit: int = 50,
    cache_manager: CacheManager = Depends(get_cache_manager),
    stream_manager: StreamManager = Depends(get_stream_manager),
    redis_client: ClusterAwareRedisClient = Depends(get_redis_client),
    game_engine: GameEngine = Depends(get_game_engine)
):
    """获取活动流"""
    generator = SituationDataGenerator(cache_manager, stream_manager, redis_client, game_engine)
    return await generator.get_activity_stream(limit)

@router.get("/metrics")
async def get_real_time_metrics(
    cache_manager: CacheManager = Depends(get_cache_manager),
    stream_manager: StreamManager = Depends(get_stream_manager),
    redis_client: ClusterAwareRedisClient = Depends(get_redis_client),
    game_engine: GameEngine = Depends(get_game_engine)
):
    """获取实时指标"""
    generator = SituationDataGenerator(cache_manager, stream_manager, redis_client, game_engine)
    return await generator.get_real_time_metrics()

@router.get("/full-data")
async def get_full_situation_data(
    limit: int = 50,
    cache_manager: CacheManager = Depends(get_cache_manager),
    stream_manager: StreamManager = Depends(get_stream_manager),
    redis_client: ClusterAwareRedisClient = Depends(get_redis_client),
    game_engine: GameEngine = Depends(get_game_engine)
):
    """获取完整的态势数据"""
    generator = SituationDataGenerator(cache_manager, stream_manager, redis_client, game_engine)
    
    # 并行获取所有数据
    topology_task = generator.get_network_topology()
    activities_task = generator.get_activity_stream(limit)
    metrics_task = generator.get_real_time_metrics()
    
    topology, activities, metrics = await asyncio.gather(
        topology_task, activities_task, metrics_task
    )
    
    return {
        "topology": topology,
        "activities": activities,
        "metrics": metrics,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/simulate-event")
async def simulate_event(
    event_type: str,
    company_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    description: str = "模拟事件",
    stream_manager: StreamManager = Depends(get_stream_manager)
):
    """模拟一个事件，用于测试"""
    event_data = {
        "type": event_type,
        "company_id": company_id or "test_company",
        "employee_id": employee_id,
        "message": description,
        "timestamp": datetime.now().isoformat(),
        "severity": "info",
        "details": {"simulated": True}
    }
    
    try:
        # 发送到Redis Stream
        await stream_manager.add_event("game_events", event_data)
        return {"success": True, "message": "Event simulated successfully", "event": event_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to simulate event: {str(e)}")
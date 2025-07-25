from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime

router = APIRouter()

def get_game_engine():
    import main
    return main.game_engine

@router.get("/status")
async def get_simulation_status():
    """获取模拟系统状态"""
    engine = get_game_engine()
    
    return {
        "status": engine.state.value,
        "current_step": engine.current_step,
        "last_step_time": engine.last_step_time.isoformat(),
        "companies_count": len(engine.companies),
        "employees_count": len(engine.employees),
        "decisions_count": len(engine.decisions),
        "events_count": len(engine.events),
        "ai_stats": engine.ai_client.get_stats(),
        "config": engine.config
    }

@router.post("/start")
async def start_simulation():
    """启动模拟"""
    engine = get_game_engine()
    
    if engine.state.value == "running":
        return {"message": "Simulation is already running"}
    
    await engine.initialize()
    
    return {
        "message": "Simulation started successfully",
        "status": engine.state.value,
        "companies": len(engine.companies)
    }

@router.post("/pause")
async def pause_simulation():
    """暂停模拟"""
    engine = get_game_engine()
    
    if engine.state.value != "running":
        raise HTTPException(status_code=400, detail="Simulation is not running")
    
    from core.game_engine import GameState
    engine.state = GameState.PAUSED
    
    return {
        "message": "Simulation paused",
        "status": engine.state.value
    }

@router.post("/resume")
async def resume_simulation():
    """恢复模拟"""
    engine = get_game_engine()
    
    if engine.state.value != "paused":
        raise HTTPException(status_code=400, detail="Simulation is not paused")
    
    from core.game_engine import GameState
    engine.state = GameState.RUNNING
    
    return {
        "message": "Simulation resumed",
        "status": engine.state.value
    }

@router.post("/stop")
async def stop_simulation():
    """停止模拟"""
    engine = get_game_engine()
    
    await engine.shutdown()
    
    return {
        "message": "Simulation stopped",
        "status": engine.state.value
    }

@router.post("/step")
async def manual_step():
    """手动执行一步模拟"""
    engine = get_game_engine()
    
    if engine.state.value != "running":
        raise HTTPException(status_code=400, detail="Simulation is not running")
    
    events = await engine.step()
    
    return {
        "message": f"Step {engine.current_step} executed",
        "step": engine.current_step,
        "events_generated": len(events),
        "events": [event.__dict__ for event in events]
    }

@router.get("/events")
async def get_recent_events(
    company_id: str = None,
    limit: int = 100,
    event_type: str = None
):
    """获取最近的游戏事件"""
    engine = get_game_engine()
    
    events = engine.get_recent_events(company_id, limit)
    
    # 过滤事件类型
    if event_type:
        events = [e for e in events if e.type == event_type]
    
    return {
        "events": [
            {
                "id": e.id,
                "type": e.type,
                "timestamp": e.timestamp.isoformat(),
                "company_id": e.company_id,
                "description": e.description,
                "data": e.data
            }
            for e in events
        ],
        "total_events": len(events)
    }

@router.get("/stats")
async def get_simulation_stats():
    """获取模拟统计信息"""
    engine = get_game_engine()
    
    stats = engine.get_game_stats()
    
    # 添加更详细的统计信息
    companies = engine.get_companies()
    company_stats = {}
    
    for company in companies:
        employees = engine.get_employees(company.id)
        decisions = engine.get_recent_decisions(company.id)
        events = engine.get_recent_events(company.id)
        
        company_stats[company.id] = {
            "name": company.name,
            "type": company.company_type.value,
            "funds": company.funds,
            "employees_count": len(employees),
            "decisions_count": len(decisions),
            "events_count": len(events),
            "avg_employee_level": sum(e.level for e in employees) / len(employees) if employees else 0,
            "total_experience": sum(e.experience for e in employees),
            "is_active": company.is_active
        }
    
    stats["companies"] = company_stats
    
    return stats

@router.put("/config")
async def update_simulation_config(
    step_interval: int = None,
    base_funding_rate: int = None,
    max_companies: int = None,
    decision_timeout: int = None
):
    """更新模拟配置"""
    engine = get_game_engine()
    
    config_updated = {}
    
    if step_interval is not None:
        if step_interval < 10 or step_interval > 300:
            raise HTTPException(
                status_code=400, 
                detail="Step interval must be between 10 and 300 seconds"
            )
        engine.config["step_interval"] = step_interval
        config_updated["step_interval"] = step_interval
    
    if base_funding_rate is not None:
        if base_funding_rate < 100 or base_funding_rate > 10000:
            raise HTTPException(
                status_code=400,
                detail="Base funding rate must be between 100 and 10000"
            )
        engine.config["base_funding_rate"] = base_funding_rate
        config_updated["base_funding_rate"] = base_funding_rate
    
    if max_companies is not None:
        if max_companies < 2 or max_companies > 20:
            raise HTTPException(
                status_code=400,
                detail="Max companies must be between 2 and 20"
            )
        engine.config["max_companies"] = max_companies
        config_updated["max_companies"] = max_companies
    
    if decision_timeout is not None:
        if decision_timeout < 30 or decision_timeout > 300:
            raise HTTPException(
                status_code=400,
                detail="Decision timeout must be between 30 and 300 seconds"
            )
        engine.config["decision_timeout"] = decision_timeout
        config_updated["decision_timeout"] = decision_timeout
    
    return {
        "message": "Configuration updated successfully",
        "updated_config": config_updated,
        "current_config": engine.config
    }

@router.get("/leaderboard")
async def get_company_leaderboard():
    """获取公司排行榜"""
    engine = get_game_engine()
    
    companies = engine.get_companies()
    
    leaderboard = []
    for company in companies:
        employees = engine.get_employees(company.id)
        decisions = engine.get_recent_decisions(company.id)
        
        # 计算综合评分
        funds_score = company.funds / 10000  # 资金评分
        size_score = len(employees) * 10  # 规模评分
        activity_score = len(decisions) * 5  # 活跃度评分
        
        # 员工质量评分
        if employees:
            avg_performance = sum(e.performance for e in employees) / len(employees)
            avg_level = sum(e.level for e in employees) / len(employees)
            quality_score = (avg_performance * avg_level) * 20
        else:
            quality_score = 0
        
        total_score = funds_score + size_score + activity_score + quality_score
        
        leaderboard.append({
            "company_id": company.id,
            "company_name": company.name,
            "company_type": company.company_type.value,
            "total_score": round(total_score, 2),
            "breakdown": {
                "funds_score": round(funds_score, 2),
                "size_score": round(size_score, 2),
                "activity_score": round(activity_score, 2),
                "quality_score": round(quality_score, 2)
            },
            "stats": {
                "funds": company.funds,
                "employees": len(employees),
                "decisions": len(decisions),
                "avg_performance": round(sum(e.performance for e in employees) / len(employees), 2) if employees else 0
            }
        })
    
    # 按总分排序
    leaderboard.sort(key=lambda x: x["total_score"], reverse=True)
    
    # 添加排名
    for i, company in enumerate(leaderboard):
        company["rank"] = i + 1
    
    return {
        "leaderboard": leaderboard,
        "total_companies": len(leaderboard),
        "updated_at": datetime.now().isoformat()
    }

@router.post("/trigger-event")
async def trigger_custom_event(
    event_type: str,
    description: str,
    company_id: str = None,
    data: Dict[str, Any] = None
):
    """触发自定义事件（用于测试）"""
    engine = get_game_engine()
    
    if company_id and company_id not in engine.companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    from core.game_engine import GameEvent
    
    event = GameEvent(
        id=f"custom_{datetime.now().timestamp()}",
        type=event_type,
        timestamp=datetime.now(),
        company_id=company_id,
        description=description,
        data=data or {}
    )
    
    engine.events.append(event)
    
    return {
        "message": "Custom event triggered successfully",
        "event": {
            "id": event.id,
            "type": event.type,
            "timestamp": event.timestamp.isoformat(),
            "company_id": event.company_id,
            "description": event.description,
            "data": event.data
        }
    }
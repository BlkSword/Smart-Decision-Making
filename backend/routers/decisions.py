from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

from models.decision import Decision, DecisionType, DecisionStatus

router = APIRouter()

def get_game_engine():
    import main
    return main.game_engine

@router.get("/", response_model=List[dict])
async def get_decisions(
    company_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    decision_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
):
    """获取决策列表"""
    engine = get_game_engine()
    
    decisions = engine.decisions.copy()
    
    # 过滤条件
    if company_id:
        decisions = [d for d in decisions if d.company_id == company_id]
    
    if employee_id:
        decisions = [d for d in decisions if d.employee_id == employee_id]
    
    if decision_type:
        try:
            dt = DecisionType(decision_type.lower())
            decisions = [d for d in decisions if d.decision_type == dt]
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid decision type. Must be one of: {[t.value for t in DecisionType]}"
            )
    
    if status:
        try:
            ds = DecisionStatus(status.lower())
            decisions = [d for d in decisions if d.status == ds]
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {[s.value for s in DecisionStatus]}"
            )
    
    # 按时间排序，最新的在前
    decisions = sorted(decisions, key=lambda x: x.created_at, reverse=True)[:limit]
    
    return [decision.to_dict() for decision in decisions]

@router.get("/{decision_id}", response_model=dict)
async def get_decision(decision_id: str):
    """获取特定决策详情"""
    engine = get_game_engine()
    
    decision = next((d for d in engine.decisions if d.id == decision_id), None)
    
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    decision_dict = decision.to_dict()
    
    # 添加相关信息
    company = engine.get_company(decision.company_id)
    if company:
        decision_dict["company_name"] = company.name
        decision_dict["company_type"] = company.company_type.value
    
    employee = engine.employees.get(decision.employee_id)
    if employee:
        decision_dict["employee_name"] = employee.name
        decision_dict["employee_role"] = employee.role.value
    
    return decision_dict

@router.post("/{decision_id}/vote")
async def vote_on_decision(
    decision_id: str,
    employee_id: str,
    vote_type: str  # "for", "against", "abstain"
):
    """对决策进行投票（用于去中心化公司）"""
    engine = get_game_engine()
    
    decision = next((d for d in engine.decisions if d.id == decision_id), None)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    # 检查员工是否存在且属于同一公司
    employee = engine.employees.get(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if employee.company_id != decision.company_id:
        raise HTTPException(status_code=403, detail="Employee not in the same company")
    
    # 检查投票类型
    if vote_type not in ["for", "against", "abstain"]:
        raise HTTPException(
            status_code=400, 
            detail="Vote type must be 'for', 'against', or 'abstain'"
        )
    
    # 添加投票
    success = decision.add_vote(employee_id, vote_type)
    if not success:
        raise HTTPException(status_code=400, detail="Employee has already voted")
    
    return {
        "message": f"Vote recorded successfully",
        "decision_id": decision_id,
        "voter": employee.name,
        "vote_type": vote_type,
        "current_votes": {
            "for": decision.votes_for,
            "against": decision.votes_against,
            "abstentions": decision.abstentions
        },
        "vote_result": decision.get_vote_result(),
        "approval_rate": decision.get_approval_rate()
    }

@router.post("/{decision_id}/execute")
async def execute_decision(decision_id: str):
    """执行决策"""
    engine = get_game_engine()
    
    decision = next((d for d in engine.decisions if d.id == decision_id), None)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    if decision.status != DecisionStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail=f"Decision cannot be executed. Current status: {decision.status.value}"
        )
    
    # 开始执行
    decision.start_execution()
    
    return {
        "message": "Decision execution started",
        "decision_id": decision_id,
        "status": decision.status.value,
        "started_at": decision.started_at.isoformat()
    }

@router.post("/{decision_id}/complete")
async def complete_decision(
    decision_id: str,
    outcome: str,
    impact_score: Optional[float] = None
):
    """完成决策执行"""
    engine = get_game_engine()
    
    decision = next((d for d in engine.decisions if d.id == decision_id), None)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    if decision.status != DecisionStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail=f"Decision is not in progress. Current status: {decision.status.value}"
        )
    
    # 完成执行
    decision.complete_execution(outcome, impact_score)
    
    return {
        "message": "Decision completed successfully",
        "decision_id": decision_id,
        "status": decision.status.value,
        "outcome": outcome,
        "impact_score": impact_score,
        "execution_time": decision.get_execution_time()
    }

@router.get("/company/{company_id}/analytics")
async def get_company_decision_analytics(company_id: str):
    """获取公司决策分析"""
    engine = get_game_engine()
    
    # 检查公司是否存在
    company = engine.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company_decisions = [d for d in engine.decisions if d.company_id == company_id]
    
    if not company_decisions:
        return {
            "company_id": company_id,
            "total_decisions": 0,
            "analytics": {}
        }
    
    # 决策类型分布
    type_distribution = {}
    for decision in company_decisions:
        dt = decision.decision_type.value
        type_distribution[dt] = type_distribution.get(dt, 0) + 1
    
    # 决策状态分布
    status_distribution = {}
    for decision in company_decisions:
        status = decision.status.value
        status_distribution[status] = status_distribution.get(status, 0) + 1
    
    # AI成本统计
    total_ai_cost = sum(d.cost for d in company_decisions if d.cost > 0)
    ai_decisions_count = len([d for d in company_decisions if d.ai_provider])
    
    # 按员工统计决策
    employee_decisions = {}
    for decision in company_decisions:
        emp_id = decision.employee_id
        if emp_id not in employee_decisions:
            employee_decisions[emp_id] = {
                "count": 0,
                "total_cost": 0,
                "decisions": []
            }
        employee_decisions[emp_id]["count"] += 1
        employee_decisions[emp_id]["total_cost"] += decision.cost
        employee_decisions[emp_id]["decisions"].append(decision.to_dict())
    
    # 添加员工信息
    for emp_id in employee_decisions:
        employee = engine.employees.get(emp_id)
        if employee:
            employee_decisions[emp_id]["employee_name"] = employee.name
            employee_decisions[emp_id]["employee_role"] = employee.role.value
    
    # 时间趋势分析
    recent_decisions = sorted(company_decisions, key=lambda x: x.created_at, reverse=True)[:10]
    
    return {
        "company_id": company_id,
        "company_name": company.name,
        "total_decisions": len(company_decisions),
        "analytics": {
            "type_distribution": type_distribution,
            "status_distribution": status_distribution,
            "ai_cost_stats": {
                "total_cost": total_ai_cost,
                "ai_decisions_count": ai_decisions_count,
                "average_cost_per_decision": total_ai_cost / ai_decisions_count if ai_decisions_count > 0 else 0
            },
            "employee_decisions": employee_decisions,
            "recent_decisions": [d.to_dict() for d in recent_decisions]
        }
    }
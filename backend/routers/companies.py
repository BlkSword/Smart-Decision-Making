from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel

from models.company import Company, CompanyType
from core.game_engine import GameEngine
from core.cache_manager import cache_manager

router = APIRouter()

# 请求模型
class CreateCompanyRequest(BaseModel):
    name: str
    type: str  # 前端传递的字段名是 'type'
    initial_funding: int = 50000
    size: int = 10
    description: Optional[str] = None

# 获取游戏引擎实例
def get_game_engine():
    # 直接从 main 模块导入游戏引擎实例
    import main
    return main.game_engine

@router.get("/", response_model=List[dict])
async def get_companies():
    """获取所有公司列表"""
    # 先尝试从缓存获取
    cached_companies = await cache_manager.get_cached_companies_list()
    if cached_companies:
        return cached_companies
    
    # 缓存未命中，从游戏引擎获取
    engine = get_game_engine()
    companies = engine.get_companies()
    result = [company.to_dict() for company in companies]
    
    # 更新缓存
    await cache_manager.cache_companies_list(companies)
    
    return result

@router.get("/{company_id}", response_model=dict)
async def get_company(company_id: str):
    """获取特定公司详情"""
    engine = get_game_engine()
    company = engine.get_company(company_id)
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return company.to_dict()

@router.post("/", response_model=dict)
async def create_company(request: CreateCompanyRequest):
    """创建新公司"""
    engine = get_game_engine()
    
    # 验证公司类型
    try:
        comp_type = CompanyType(request.type.lower())
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid company type. Must be one of: {[t.value for t in CompanyType]}"
        )
    
    # 验证公司规模
    if comp_type == CompanyType.CENTRALIZED and request.size < 4:
        raise HTTPException(
            status_code=400, 
            detail="Centralized companies must have at least 4 employees (1 CEO + 3 Managers)"
        )
    
    if request.size < 1:
        raise HTTPException(
            status_code=400, 
            detail="Company size must be at least 1"
        )
    
    # 检查公司数量限制
    if len(engine.companies) >= engine.config.get("max_companies", 10):
        raise HTTPException(status_code=400, detail="Maximum number of companies reached")
    
    # 创建新公司
    company_id = f"company_{uuid.uuid4().hex[:8]}"
    company = Company(
        id=company_id,
        name=request.name,
        company_type=comp_type,
        funds=request.initial_funding,
        size=request.size,
        created_at=datetime.now(),
        description=request.description
    )
    
    # 添加到游戏引擎
    engine.companies[company_id] = company
    
    # 创建员工
    await engine._create_employees_for_company(company)
    
    return company.to_dict()

@router.put("/{company_id}", response_model=dict)
async def update_company(
    company_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """更新公司信息"""
    engine = get_game_engine()
    company = engine.get_company(company_id)
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # 更新字段
    if name is not None:
        company.name = name
    if description is not None:
        company.description = description
    if is_active is not None:
        company.is_active = is_active
    
    company.updated_at = datetime.now()
    
    return company.to_dict()

@router.delete("/{company_id}")
async def delete_company(company_id: str):
    """删除公司"""
    engine = get_game_engine()
    
    if company_id not in engine.companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # 删除公司及其员工
    del engine.companies[company_id]
    
    # 删除相关员工
    employees_to_remove = [emp_id for emp_id, emp in engine.employees.items() 
                          if emp.company_id == company_id]
    for emp_id in employees_to_remove:
        del engine.employees[emp_id]
    
    return {"message": "Company deleted successfully"}

@router.get("/{company_id}/stats", response_model=dict)
async def get_company_stats(company_id: str):
    """获取公司统计信息"""
    engine = get_game_engine()
    company = engine.get_company(company_id)
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # 获取员工信息
    employees = engine.get_employees(company_id)
    
    # 获取最近决策
    recent_decisions = engine.get_recent_decisions(company_id, limit=10)
    
    # 获取最近事件
    recent_events = engine.get_recent_events(company_id, limit=20)
    
    # 计算统计信息
    role_distribution = {}
    for emp in employees:
        role = emp.role.value
        role_distribution[role] = role_distribution.get(role, 0) + 1
    
    avg_performance = sum(emp.performance for emp in employees) / len(employees) if employees else 0
    total_experience = sum(emp.experience for emp in employees)
    
    decision_types = {}
    for decision in recent_decisions:
        dt = decision.decision_type.value
        decision_types[dt] = decision_types.get(dt, 0) + 1
    
    return {
        "company": company.to_dict(),
        "employee_count": len(employees),
        "role_distribution": role_distribution,
        "average_performance": round(avg_performance, 2),
        "total_experience": total_experience,
        "recent_decisions_count": len(recent_decisions),
        "decision_type_distribution": decision_types,
        "recent_events_count": len(recent_events),
        "hierarchy_depth": company.get_hierarchy_depth()
    }

@router.post("/{company_id}/funding")
async def add_funding(company_id: str, amount: int):
    """为公司添加资金"""
    engine = get_game_engine()
    company = engine.get_company(company_id)
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    company.update_funds(amount)
    
    return {
        "message": f"Added {amount} funds to {company.name}",
        "new_balance": company.funds
    }
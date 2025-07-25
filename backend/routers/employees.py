from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

from models.employee import Employee, Role

router = APIRouter()

# 获取游戏引擎实例
def get_game_engine():
    import main
    return main.game_engine

@router.get("/", response_model=List[dict])
async def get_employees(company_id: Optional[str] = None):
    """获取员工列表"""
    engine = get_game_engine()
    employees = engine.get_employees(company_id)
    return [employee.to_dict() for employee in employees]

@router.get("/{employee_id}", response_model=dict)
async def get_employee(employee_id: str):
    """获取特定员工详情"""
    engine = get_game_engine()
    
    if employee_id not in engine.employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee = engine.employees[employee_id]
    
    # 获取员工的决策历史
    employee_decisions = [d for d in engine.decisions if d.employee_id == employee_id]
    
    employee_dict = employee.to_dict()
    employee_dict["decisions_count"] = len(employee_decisions)
    employee_dict["recent_decisions"] = [d.to_dict() for d in employee_decisions[-5:]]
    
    return employee_dict

@router.put("/{employee_id}", response_model=dict)
async def update_employee(
    employee_id: str,
    name: Optional[str] = None,
    ai_personality: Optional[str] = None,
    decision_style: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """更新员工信息"""
    engine = get_game_engine()
    
    if employee_id not in engine.employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee = engine.employees[employee_id]
    
    # 更新字段
    if name is not None:
        employee.name = name
    if ai_personality is not None:
        employee.ai_personality = ai_personality
    if decision_style is not None:
        employee.decision_style = decision_style
    if is_active is not None:
        employee.is_active = is_active
    
    employee.updated_at = datetime.now()
    
    return employee.to_dict()

@router.post("/{employee_id}/experience")
async def add_experience(employee_id: str, experience: int):
    """为员工添加经验值"""
    engine = get_game_engine()
    
    if employee_id not in engine.employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if experience <= 0:
        raise HTTPException(status_code=400, detail="Experience must be positive")
    
    employee = engine.employees[employee_id]
    old_level = employee.level
    employee.update_experience(experience)
    
    result = {
        "message": f"Added {experience} experience to {employee.name}",
        "new_experience": employee.experience,
        "current_level": employee.level
    }
    
    if employee.level > old_level:
        result["level_up"] = True
        result["message"] += f" - Level up! Now level {employee.level}"
    
    return result

@router.get("/company/{company_id}/hierarchy")
async def get_company_hierarchy(company_id: str):
    """获取公司组织架构"""
    engine = get_game_engine()
    
    # 检查公司是否存在
    company = engine.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    employees = engine.get_employees(company_id)
    
    # 按角色分组
    hierarchy = {
        "ceo": [],
        "managers": [],
        "employees": []
    }
    
    for emp in employees:
        emp_dict = emp.to_dict()
        if emp.role == Role.CEO:
            hierarchy["ceo"].append(emp_dict)
        elif emp.role == Role.MANAGER:
            hierarchy["managers"].append(emp_dict)
        else:
            hierarchy["employees"].append(emp_dict)
    
    return {
        "company_id": company_id,
        "company_name": company.name,
        "company_type": company.company_type.value,
        "hierarchy": hierarchy,
        "total_employees": len(employees)
    }

@router.get("/company/{company_id}/performance")
async def get_company_performance(company_id: str):
    """获取公司员工绩效统计"""
    engine = get_game_engine()
    
    # 检查公司是否存在
    company = engine.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    employees = engine.get_employees(company_id)
    
    if not employees:
        return {
            "company_id": company_id,
            "total_employees": 0,
            "performance_stats": {}
        }
    
    # 计算绩效统计
    performances = [emp.performance for emp in employees]
    levels = [emp.level for emp in employees]
    experiences = [emp.experience for emp in employees]
    
    # 按角色统计
    role_stats = {}
    for emp in employees:
        role = emp.role.value
        if role not in role_stats:
            role_stats[role] = {
                "count": 0,
                "avg_performance": 0,
                "avg_level": 0,
                "avg_experience": 0,
                "total_performance": 0,
                "total_level": 0,
                "total_experience": 0
            }
        
        role_stats[role]["count"] += 1
        role_stats[role]["total_performance"] += emp.performance
        role_stats[role]["total_level"] += emp.level
        role_stats[role]["total_experience"] += emp.experience
    
    # 计算平均值
    for role in role_stats:
        count = role_stats[role]["count"]
        role_stats[role]["avg_performance"] = role_stats[role]["total_performance"] / count
        role_stats[role]["avg_level"] = role_stats[role]["total_level"] / count
        role_stats[role]["avg_experience"] = role_stats[role]["total_experience"] / count
    
    return {
        "company_id": company_id,
        "company_name": company.name,
        "total_employees": len(employees),
        "performance_stats": {
            "overall": {
                "avg_performance": sum(performances) / len(performances),
                "avg_level": sum(levels) / len(levels),
                "avg_experience": sum(experiences) / len(experiences),
                "max_performance": max(performances),
                "min_performance": min(performances),
                "max_level": max(levels),
                "min_level": min(levels)
            },
            "by_role": role_stats
        }
    }

@router.get("/top-performers")
async def get_top_performers(limit: int = 10):
    """获取表现最佳的员工"""
    engine = get_game_engine()
    
    all_employees = list(engine.employees.values())
    
    # 按绩效排序
    top_performers = sorted(
        all_employees, 
        key=lambda emp: emp.performance * emp.level * (emp.experience / 100), 
        reverse=True
    )[:limit]
    
    result = []
    for emp in top_performers:
        emp_dict = emp.to_dict()
        # 添加公司信息
        company = engine.get_company(emp.company_id)
        if company:
            emp_dict["company_name"] = company.name
            emp_dict["company_type"] = company.company_type.value
        
        # 计算综合评分
        emp_dict["composite_score"] = emp.performance * emp.level * (emp.experience / 100)
        
        result.append(emp_dict)
    
    return {
        "top_performers": result,
        "total_employees": len(all_employees)
    }
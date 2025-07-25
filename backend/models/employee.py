from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any

class Role(Enum):
    """员工角色"""
    CEO = "ceo"
    MANAGER = "manager"
    EMPLOYEE = "employee"

@dataclass
class Employee:
    """员工数据模型"""
    id: str
    company_id: str
    name: str
    role: Role
    level: int  # 等级 (1-3)
    experience: int  # 经验值
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # 员工属性
    skills: Optional[Dict[str, float]] = None  # 技能评分
    personality: Optional[Dict[str, float]] = None  # 性格特征
    performance: float = 1.0  # 绩效指数
    
    # 员工状态
    is_active: bool = True
    
    # AI相关
    ai_personality: Optional[str] = None  # AI性格描述
    decision_style: Optional[str] = None  # 决策风格
    
    # 额外数据
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
        if self.skills is None:
            self.skills = self._generate_default_skills()
        if self.personality is None:
            self.personality = self._generate_default_personality()
        if self.metadata is None:
            self.metadata = {}
    
    def _generate_default_skills(self) -> Dict[str, float]:
        """生成默认技能"""
        import random
        base_skills = {
            "leadership": 0.5,
            "technical": 0.5,
            "communication": 0.5,
            "creativity": 0.5,
            "analytical": 0.5
        }
        
        # 根据角色调整技能
        if self.role == Role.CEO:
            base_skills["leadership"] += 0.3
            base_skills["communication"] += 0.2
        elif self.role == Role.MANAGER:
            base_skills["leadership"] += 0.2
            base_skills["analytical"] += 0.2
        else:  # EMPLOYEE
            base_skills["technical"] += 0.2
            base_skills["creativity"] += 0.1
        
        # 添加随机因素
        for skill in base_skills:
            base_skills[skill] += random.uniform(-0.1, 0.1)
            base_skills[skill] = max(0.0, min(1.0, base_skills[skill]))
        
        return base_skills
    
    def _generate_default_personality(self) -> Dict[str, float]:
        """生成默认性格"""
        import random
        return {
            "openness": random.uniform(0.3, 0.8),
            "conscientiousness": random.uniform(0.4, 0.9),
            "extraversion": random.uniform(0.2, 0.7),
            "agreeableness": random.uniform(0.3, 0.8),
            "neuroticism": random.uniform(0.1, 0.5)
        }
    
    def get_authority_level(self) -> int:
        """获取权限级别"""
        authority_map = {
            Role.CEO: 3,
            Role.MANAGER: 2,
            Role.EMPLOYEE: 1
        }
        return authority_map.get(self.role, 1)
    
    def can_make_decision(self, decision_importance: int) -> bool:
        """判断是否有权限做特定重要度的决策"""
        return self.get_authority_level() >= decision_importance
    
    def update_experience(self, exp_gain: int):
        """更新经验值"""
        self.experience += exp_gain
        self.updated_at = datetime.now()
        
        # 检查是否可以升级
        if self.experience >= self.level * 100:
            self.level += 1
    
    def get_decision_weight(self) -> float:
        """获取决策权重"""
        # 基于角色、等级和经验计算权重
        base_weight = {
            Role.CEO: 1.0,
            Role.MANAGER: 0.7,
            Role.EMPLOYEE: 0.5
        }.get(self.role, 0.5)
        
        # 等级和经验加成
        level_bonus = (self.level - 1) * 0.1
        exp_bonus = min(self.experience / 1000, 0.3)
        
        return base_weight + level_bonus + exp_bonus
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "company_id": self.company_id,
            "name": self.name,
            "role": self.role.value,
            "level": self.level,
            "experience": self.experience,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "skills": self.skills,
            "personality": self.personality,
            "performance": self.performance,
            "is_active": self.is_active,
            "ai_personality": self.ai_personality,
            "decision_style": self.decision_style,
            "metadata": self.metadata,
            "authority_level": self.get_authority_level(),
            "decision_weight": self.get_decision_weight()
        }
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any

class CompanyType(Enum):
    """公司类型"""
    CENTRALIZED = "centralized"  # 集权公司
    DECENTRALIZED = "decentralized"  # 去中心化公司

@dataclass
class Company:
    """公司数据模型"""
    id: str
    name: str
    company_type: CompanyType
    funds: int  # 资金
    size: int  # 公司规模（员工数量）
    created_at: datetime
    updated_at: Optional[datetime] = None
    description: Optional[str] = None
    
    # 公司属性
    productivity: float = 1.0  # 生产力指数
    innovation: float = 1.0  # 创新指数
    efficiency: float = 1.0  # 效率指数
    
    # 公司状态
    is_active: bool = True
    
    # 额外数据
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.updated_at is None:
            self.updated_at = datetime.now()
        if self.metadata is None:
            self.metadata = {}
    
    def update_funds(self, amount: int):
        """更新资金"""
        self.funds = max(0, self.funds + amount)
        self.updated_at = datetime.now()
    
    def get_hierarchy_depth(self) -> int:
        """获取公司层级深度"""
        if self.company_type == CompanyType.CENTRALIZED:
            return 3  # CEO-经理-员工
        else:
            return 1  # 扁平化结构
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "company_type": self.company_type.value,
            "funds": self.funds,
            "size": self.size,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "description": self.description,
            "productivity": self.productivity,
            "innovation": self.innovation,
            "efficiency": self.efficiency,
            "is_active": self.is_active,
            "metadata": self.metadata
        }
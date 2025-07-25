from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List

class DecisionType(Enum):
    """决策类型"""
    STRATEGIC = "strategic"  # 战略决策
    OPERATIONAL = "operational"  # 运营决策
    TACTICAL = "tactical"  # 战术决策
    COLLABORATIVE = "collaborative"  # 协作决策
    EMERGENCY = "emergency"  # 紧急决策

class DecisionStatus(Enum):
    """决策状态"""
    PENDING = "pending"  # 待处理
    IN_PROGRESS = "in_progress"  # 进行中
    COMPLETED = "completed"  # 已完成
    REJECTED = "rejected"  # 被拒绝
    CANCELLED = "cancelled"  # 已取消

@dataclass
class Decision:
    """决策数据模型"""
    id: str
    company_id: str
    employee_id: str
    decision_type: DecisionType
    content: str  # 决策内容
    created_at: datetime
    
    # 决策属性
    importance: int = 1  # 重要度 (1-3)
    urgency: int = 1  # 紧急度 (1-3)
    status: DecisionStatus = DecisionStatus.PENDING
    
    # AI相关信息
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    cost: float = 0.0
    
    # 决策结果
    outcome: Optional[str] = None
    impact_score: Optional[float] = None
    
    # 时间记录
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # 投票相关（用于去中心化公司）
    votes_for: int = 0
    votes_against: int = 0
    abstentions: int = 0
    voters: Optional[List[str]] = None  # 投票员工ID列表
    vote_details: Optional[Dict[str, str]] = None  # 投票详情 {employee_id: vote_type}
    
    # 额外数据
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.voters is None:
            self.voters = []
        if self.vote_details is None:
            self.vote_details = {}
        if self.metadata is None:
            self.metadata = {}
    
    def add_vote(self, employee_id: str, vote_type: str):
        """添加投票"""
        if employee_id in self.voters:
            return False  # 已经投过票
        
        self.voters.append(employee_id)
        self.vote_details[employee_id] = vote_type
        
        if vote_type == "for":
            self.votes_for += 1
        elif vote_type == "against":
            self.votes_against += 1
        else:
            self.abstentions += 1
        
        return True
    
    def get_vote_result(self) -> str:
        """获取投票结果"""
        total_votes = self.votes_for + self.votes_against + self.abstentions
        if total_votes == 0:
            return "no_votes"
        
        if self.votes_for > self.votes_against:
            return "approved"
        elif self.votes_against > self.votes_for:
            return "rejected"
        else:
            return "tied"
    
    def get_approval_rate(self) -> float:
        """获取支持率"""
        total_decisive_votes = self.votes_for + self.votes_against
        if total_decisive_votes == 0:
            return 0.0
        return self.votes_for / total_decisive_votes
    
    def start_execution(self):
        """开始执行决策"""
        self.status = DecisionStatus.IN_PROGRESS
        self.started_at = datetime.now()
    
    def complete_execution(self, outcome: str, impact_score: float = None):
        """完成执行决策"""
        self.status = DecisionStatus.COMPLETED
        self.completed_at = datetime.now()
        self.outcome = outcome
        if impact_score is not None:
            self.impact_score = impact_score
    
    def reject_decision(self, reason: str = None):
        """拒绝决策"""
        self.status = DecisionStatus.REJECTED
        self.completed_at = datetime.now()
        if reason:
            self.metadata["rejection_reason"] = reason
    
    def cancel_decision(self, reason: str = None):
        """取消决策"""
        self.status = DecisionStatus.CANCELLED
        self.completed_at = datetime.now()
        if reason:
            self.metadata["cancellation_reason"] = reason
    
    def get_priority_score(self) -> float:
        """获取优先级评分"""
        return (self.importance * 0.6) + (self.urgency * 0.4)
    
    def get_execution_time(self) -> Optional[float]:
        """获取执行时间（秒）"""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "company_id": self.company_id,
            "employee_id": self.employee_id,
            "decision_type": self.decision_type.value,
            "content": self.content,
            "created_at": self.created_at.isoformat(),
            "importance": self.importance,
            "urgency": self.urgency,
            "status": self.status.value,
            "ai_provider": self.ai_provider,
            "ai_model": self.ai_model,
            "cost": self.cost,
            "outcome": self.outcome,
            "impact_score": self.impact_score,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "votes_for": self.votes_for,
            "votes_against": self.votes_against,
            "abstentions": self.abstentions,
            "voters": self.voters,
            "vote_details": self.vote_details,
            "metadata": self.metadata,
            "vote_result": self.get_vote_result(),
            "approval_rate": self.get_approval_rate(),
            "priority_score": self.get_priority_score(),
            "execution_time": self.get_execution_time()
        }
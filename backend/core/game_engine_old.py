import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import random
import json

from .ai_client import AIClient, AIProvider
from .cache_manager import cache_manager
from .stream_manager import stream_manager
from models.company import Company, CompanyType
from models.employee import Employee, Role
from models.decision import Decision, DecisionType

logger = logging.getLogger(__name__)

class GameState(Enum):
    """游戏状态"""
    INITIALIZING = "initializing"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"

@dataclass
class GameEvent:
    """游戏事件"""
    id: str
    type: str
    timestamp: datetime
    company_id: Optional[str]
    description: str
    data: Dict[str, Any]

class GameEngine:
    """游戏引擎核心类"""
    
    def __init__(self):
        self.state = GameState.INITIALIZING
        self.companies: Dict[str, Company] = {}
        self.employees: Dict[str, Employee] = {}
        self.decisions: List[Decision] = []
        self.events: List[GameEvent] = []
        self.ai_client = AIClient()
        
        # 游戏配置
        self.config = {
            "step_interval": 30,  # 游戏步进间隔（秒）
            "base_funding_rate": 1000,  # 基础资金获取率
            "max_companies": 10,  # 最大公司数量
            "decision_timeout": 60,  # 决策超时时间（秒）
        }
        
        self.current_step = 0
        self.last_step_time = datetime.now()
    
    async def initialize(self):
        """初始化游戏引擎"""
        logger.info("Initializing game engine...")
        
        # 创建初始公司
        await self._create_initial_companies()
        
        self.state = GameState.RUNNING
        self.last_step_time = datetime.now()
        
        logger.info("Game engine initialized successfully")
    
    async def shutdown(self):
        """关闭游戏引擎"""
        logger.info("Shutting down game engine...")
        self.state = GameState.STOPPED
        logger.info("Game engine shutdown completed")
    
    async def step(self) -> List[GameEvent]:
        """执行游戏步进"""
        if self.state != GameState.RUNNING:
            return []
        
        step_events = []
        self.current_step += 1
        current_time = datetime.now()
        
        logger.info(f"Executing game step {self.current_step}")
        
        try:
            # 1. 资金分配
            funding_events = await self._distribute_funding()
            step_events.extend(funding_events)
            
            # 2. AI决策处理
            decision_events = await self._process_ai_decisions()
            step_events.extend(decision_events)
            
            # 3. 市场事件
            market_events = await self._generate_market_events()
            step_events.extend(market_events)
            
            # 4. 公司状态更新
            status_events = await self._update_company_status()
            step_events.extend(status_events)
            
            self.last_step_time = current_time
            
            # 添加步进完成事件
            step_complete_event = GameEvent(
                id=f"step_{self.current_step}",
                type="step_complete",
                timestamp=current_time,
                company_id=None,
                description=f"游戏步进 {self.current_step} 完成",
                data={
                    "step": self.current_step,
                    "companies_count": len(self.companies),
                    "total_events": len(step_events)
                }
            )
            step_events.append(step_complete_event)
            
        except Exception as e:
            logger.error(f"Error in game step {self.current_step}: {e}")
            error_event = GameEvent(
                id=f"error_{self.current_step}",
                type="step_error",
                timestamp=current_time,
                company_id=None,
                description=f"游戏步进 {self.current_step} 出现错误: {str(e)}",
                data={"error": str(e)}
            )
            step_events.append(error_event)
        
        # 保存事件到历史记录
        self.events.extend(step_events)
        
        # 更新缓存
        try:
            # 缓存游戏状态
            await cache_manager.cache_game_stats(self.get_game_stats())
            
            # 缓存事件并发布到流
            for event in step_events:
                event_dict = event.__dict__
                await cache_manager.add_game_event(event_dict)
                # 发布到实时流
                await stream_manager.add_game_event(event_dict)
            
            # 批量缓存公司数据并发布更新通知
            companies = list(self.companies.values())
            await cache_manager.bulk_cache_companies(companies)
            
            # 发布公司状态更新到流
            for company in companies:
                await stream_manager.add_company_update(
                    company.id, 
                    'status_update',
                    {
                        'step': self.current_step,
                        'funds': company.funds,
                        'size': company.size,
                        'is_active': company.is_active,
                        'productivity': company.productivity,
                        'innovation': company.innovation,
                        'efficiency': company.efficiency
                    }
                )
            
            # 缓存游戏状态快照
            game_state = {
                'step': self.current_step,
                'companies_count': len(self.companies),
                'employees_count': len(self.employees),
                'total_funds': sum(company.funds for company in companies),
                'active_companies': len([c for c in companies if c.is_active]),
                'timestamp': datetime.now().isoformat()
            }
            await cache_manager.cache_game_state_snapshot(self.current_step, game_state)
            
            # 缓存步骤结果
            step_stats = {
                'events_count': len(step_events),
                'companies_processed': len(companies),
                'decisions_made': len([e for e in step_events if e.type in ['hierarchical_decision', 'collective_decision']])
            }
            events_data = [event.__dict__ for event in step_events]
            await cache_manager.cache_step_results(self.current_step, events_data, step_stats)
                
        except Exception as e:
            logger.error(f"Error updating cache during game step: {e}")
        
        return step_events
    
    async def _create_initial_companies(self):
        """创建初始公司"""
        # 创建集权公司
        centralized_company = Company(
            id="company_centralized_001",
            name="集权科技公司",
            company_type=CompanyType.CENTRALIZED,
            funds=50000,
            size=15,
            created_at=datetime.now()
        )
        
        # 创建去中心化公司
        decentralized_company = Company(
            id="company_decentralized_001",
            name="去中心化创新公司",
            company_type=CompanyType.DECENTRALIZED,
            funds=50000,
            size=12,
            created_at=datetime.now()
        )
        
        self.companies[centralized_company.id] = centralized_company
        self.companies[decentralized_company.id] = decentralized_company
        
        # 为每个公司创建员工
        await self._create_employees_for_company(centralized_company)
        await self._create_employees_for_company(decentralized_company)
    
    async def _create_employees_for_company(self, company: Company):
        """为公司创建员工"""
        if company.company_type == CompanyType.CENTRALIZED:
            # 集权公司：CEO-经理-员工结构
            # 1个CEO
            ceo = Employee(
                id=f"{company.id}_ceo",
                company_id=company.id,
                name=f"{company.name}_CEO",
                role=Role.CEO,
                level=3,
                experience=100
            )
            self.employees[ceo.id] = ceo
            
            # 3个经理
            for i in range(3):
                manager = Employee(
                    id=f"{company.id}_manager_{i}",
                    company_id=company.id,
                    name=f"{company.name}_经理_{i+1}",
                    role=Role.MANAGER,
                    level=2,
                    experience=60
                )
                self.employees[manager.id] = manager
            
            # 其余为员工
            remaining_employees = company.size - 4
            for i in range(remaining_employees):
                employee = Employee(
                    id=f"{company.id}_employee_{i}",
                    company_id=company.id,
                    name=f"{company.name}_员工_{i+1}",
                    role=Role.EMPLOYEE,
                    level=1,
                    experience=30
                )
                self.employees[employee.id] = employee
        
        else:  # DECENTRALIZED
            # 去中心化公司：全部为员工，扁平化结构
            for i in range(company.size):
                employee = Employee(
                    id=f"{company.id}_employee_{i}",
                    company_id=company.id,
                    name=f"{company.name}_成员_{i+1}",
                    role=Role.EMPLOYEE,
                    level=2,
                    experience=50
                )
                self.employees[employee.id] = employee
    
    async def _distribute_funding(self) -> List[GameEvent]:
        """分配资金"""
        events = []
        
        for company in self.companies.values():
            # 根据公司规模计算资金增长
            funding_amount = self.config["base_funding_rate"] * (company.size / 10)
            
            # 添加随机因素
            funding_amount *= random.uniform(0.8, 1.2)
            funding_amount = int(funding_amount)
            
            company.funds += funding_amount
            
            event = GameEvent(
                id=f"funding_{company.id}_{self.current_step}",
                type="funding_received",
                timestamp=datetime.now(),
                company_id=company.id,
                description=f"{company.name} 获得资金 {funding_amount}",
                data={
                    "amount": funding_amount,
                    "total_funds": company.funds
                }
            )
            events.append(event)
        
        return events
    
    async def _process_ai_decisions(self) -> List[GameEvent]:
        """处理AI决策"""
        events = []
        
        for company in self.companies.values():
            company_employees = [emp for emp in self.employees.values() 
                               if emp.company_id == company.id]
            
            if company.company_type == CompanyType.CENTRALIZED:
                # 集权公司：分层决策
                decision_events = await self._process_centralized_decisions(company, company_employees)
            else:
                # 去中心化公司：集体决策
                decision_events = await self._process_decentralized_decisions(company, company_employees)
            
            events.extend(decision_events)
        
        return events
    
    async def _process_centralized_decisions(self, company: Company, employees: List[Employee]) -> List[GameEvent]:
        """处理集权公司决策"""
        events = []
        
        # 找到CEO
        ceo = next((emp for emp in employees if emp.role == Role.CEO), None)
        if not ceo:
            return events
        
        # CEO做出战略决策
        strategic_decision = await self._make_ai_decision(
            company, ceo, DecisionType.STRATEGIC,
            "作为CEO，请为公司制定下一步战略决策。考虑当前市场环境和公司资源。"
        )
        
        if strategic_decision:
            events.append(GameEvent(
                id=f"decision_{company.id}_{self.current_step}_strategic",
                type="decision_made",
                timestamp=datetime.now(),
                company_id=company.id,
                description=f"{company.name} CEO 做出战略决策",
                data=asdict(strategic_decision)
            ))
        
        # 经理们做出运营决策
        managers = [emp for emp in employees if emp.role == Role.MANAGER]
        for manager in managers:
            operational_decision = await self._make_ai_decision(
                company, manager, DecisionType.OPERATIONAL,
                f"作为经理，根据CEO的战略决策，制定具体的运营计划。CEO决策：{strategic_decision.content if strategic_decision else '暂无'}"
            )
            
            if operational_decision:
                events.append(GameEvent(
                    id=f"decision_{company.id}_{manager.id}_{self.current_step}",
                    type="decision_made",
                    timestamp=datetime.now(),
                    company_id=company.id,
                    description=f"{company.name} 经理 {manager.name} 做出运营决策",
                    data=asdict(operational_decision)
                ))
        
        return events
    
    async def _process_decentralized_decisions(self, company: Company, employees: List[Employee]) -> List[GameEvent]:
        """处理去中心化公司决策"""
        events = []
        
        # 所有员工参与决策
        decision_proposals = []
        
        for employee in employees[:5]:  # 限制参与决策的员工数量，避免过多API调用
            proposal = await self._make_ai_decision(
                company, employee, DecisionType.COLLABORATIVE,
                "作为去中心化公司的成员，请提出你对公司下一步发展的建议和决策。"
            )
            
            if proposal:
                decision_proposals.append(proposal)
        
        # 模拟投票过程（少数服从多数）
        if decision_proposals:
            # 简化处理：随机选择一个提案作为最终决策
            final_decision = random.choice(decision_proposals)
            
            events.append(GameEvent(
                id=f"decision_{company.id}_{self.current_step}_collaborative",
                type="collaborative_decision",
                timestamp=datetime.now(),
                company_id=company.id,
                description=f"{company.name} 通过集体决策做出决定",
                data={
                    "final_decision": asdict(final_decision),
                    "total_proposals": len(decision_proposals)
                }
            ))
        
        return events
    
    async def _make_ai_decision(
        self, 
        company: Company, 
        employee: Employee, 
        decision_type: DecisionType, 
        prompt: str
    ) -> Optional[Decision]:
        """让AI做决策"""
        try:
            # 构建上下文信息
            context = {
                "company_info": {
                    "name": company.name,
                    "type": company.company_type.value,
                    "funds": company.funds,
                    "size": company.size
                },
                "employee_info": {
                    "name": employee.name,
                    "role": employee.role.value,
                    "level": employee.level,
                    "experience": employee.experience
                }
            }
            
            # 调用AI API
            ai_response = await self.ai_client.call_ai(
                prompt=prompt,
                provider=AIProvider.OPENAI,  # 可以配置化
                context=context,
                temperature=0.7,
                max_tokens=500
            )
            
            # 创建决策记录
            decision = Decision(
                id=f"decision_{company.id}_{employee.id}_{datetime.now().timestamp()}",
                company_id=company.id,
                employee_id=employee.id,
                decision_type=decision_type,
                content=ai_response.content,
                created_at=datetime.now(),
                ai_provider=ai_response.provider.value,
                ai_model=ai_response.model,
                cost=ai_response.cost
            )
            
            self.decisions.append(decision)
            
            # 发布决策事件到流
            await stream_manager.add_decision_event(decision.to_dict())
            
            return decision
            
        except Exception as e:
            logger.error(f"Error making AI decision: {e}")
            return None
    
    async def _generate_market_events(self) -> List[GameEvent]:
        """生成市场事件"""
        events = []
        
        # 随机生成市场事件
        if random.random() < 0.3:  # 30%概率生成市场事件
            market_events = [
                "新技术突破影响市场格局",
                "政策变化带来新的商业机会",
                "竞争对手推出新产品",
                "供应链出现波动",
                "客户需求发生变化"
            ]
            
            event_description = random.choice(market_events)
            
            event = GameEvent(
                id=f"market_{self.current_step}",
                type="market_event",
                timestamp=datetime.now(),
                company_id=None,
                description=event_description,
                data={"impact": random.uniform(-0.2, 0.2)}
            )
            events.append(event)
        
        return events
    
    async def _update_company_status(self) -> List[GameEvent]:
        """更新公司状态"""
        events = []
        
        for company in self.companies.values():
            # 更新公司状态逻辑
            old_funds = company.funds
            
            # 简单的资金消耗模拟
            operating_cost = company.size * 100  # 每个员工100资金维护成本
            company.funds = max(0, company.funds - operating_cost)
            
            if company.funds != old_funds:
                event = GameEvent(
                    id=f"status_update_{company.id}_{self.current_step}",
                    type="company_status_update",
                    timestamp=datetime.now(),
                    company_id=company.id,
                    description=f"{company.name} 支付运营成本 {operating_cost}",
                    data={
                        "operating_cost": operating_cost,
                        "remaining_funds": company.funds
                    }
                )
                events.append(event)
        
        return events
    
    # 公共接口方法
    def get_companies(self) -> List[Company]:
        """获取所有公司"""
        return list(self.companies.values())
    
    def get_company(self, company_id: str) -> Optional[Company]:
        """获取特定公司"""
        return self.companies.get(company_id)
    
    def get_employees(self, company_id: str = None) -> List[Employee]:
        """获取员工列表"""
        if company_id:
            return [emp for emp in self.employees.values() if emp.company_id == company_id]
        return list(self.employees.values())
    
    def get_recent_decisions(self, company_id: str = None, limit: int = 50) -> List[Decision]:
        """获取最近的决策"""
        decisions = self.decisions
        if company_id:
            decisions = [d for d in decisions if d.company_id == company_id]
        
        return sorted(decisions, key=lambda x: x.created_at, reverse=True)[:limit]
    
    def get_recent_events(self, company_id: str = None, limit: int = 100) -> List[GameEvent]:
        """获取最近的事件"""
        events = self.events
        if company_id:
            events = [e for e in events if e.company_id == company_id]
        
        return sorted(events, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def get_game_stats(self) -> Dict[str, Any]:
        """获取游戏统计信息"""
        return {
            "current_step": self.current_step,
            "state": self.state.value,
            "companies_count": len(self.companies),
            "employees_count": len(self.employees),
            "decisions_count": len(self.decisions),
            "events_count": len(self.events),
            "ai_stats": self.ai_client.get_stats(),
            "last_step_time": self.last_step_time.isoformat()
        }
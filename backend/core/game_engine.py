import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import random
import json
import uuid
import math

from .ai_client import AIClient, AIProvider
from .cache_manager import cache_manager
from .stream_manager import stream_manager
from models.company import Company, CompanyType
from models.employee import Employee, Role
from models.decision import Decision, DecisionType, DecisionStatus

logger = logging.getLogger(__name__)

class GameState(Enum):
    """游戏状态"""
    INITIALIZING = "initializing"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    ROUND_ENDED = "round_ended"

class GameMode(Enum):
    """游戏模式"""
    AUTO = "auto"  
    MANUAL = "manual"  

class RoundPhase(Enum):
    """轮次阶段"""
    FUNDING = "funding"  
    AI_DECISIONS = "ai_decisions"  
    MARKET_EVENTS = "market_events"  
    STATUS_UPDATE = "status_update"  
    ROUND_COMPLETE = "round_complete"  

@dataclass
class GameEvent:
    """游戏事件"""
    id: str
    type: str
    timestamp: datetime
    company_id: Optional[str]
    description: str
    data: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "type": self.type,
            "timestamp": self.timestamp.isoformat(),
            "company_id": self.company_id,
            "description": self.description,
            "data": self.data
        }

class GameEngine:
    """游戏引擎核心类 - 轮次制版本"""
    
    # 中文姓名库
    SURNAMES = [
        "李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴",
        "徐", "孙", "朱", "马", "胡", "郭", "林", "何", "高", "罗",
        "郑", "梁", "谢", "韩", "唐", "尹", "冯", "于", "董", "萧"
    ]
    
    GIVEN_NAMES = [
        "伟", "明", "杰", "娜", "芳", "宇", "超", "安", "欣", "浩",
        "洁", "晨", "丹", "莉", "艳", "乐", "辉", "瑞", "智", "清",
        "靖", "群", "鹏", "东", "恒", "阳", "宁", "海", "勇", "海"
    ]
    
    # AI性格类型
    AI_PERSONALITIES = [
        "分析型", "创新型", "实用型", "合作型", "领导型",
        "谨慎型", "积极型", "平衡型", "精确型", "灵活型",
        "耐心型", "高效型", "理性型", "情感型", "挑战型"
    ]
    
    # 决策风格
    DECISION_STYLES = [
        "数据驱动", "直觉导向", "合作导向", "结果导向",
        "风险偏好", "稳健优先", "创新导向", "传统导向",
        "民主参与", "专制决定", "精益导向", "快速策略"
    ]
    
    def __init__(self):
        self.state = GameState.INITIALIZING
        self.mode = GameMode.AUTO  # 默认自动模式
        self.companies: Dict[str, Company] = {}
        self.employees: Dict[str, Employee] = {}
        self.decisions: List[Decision] = []
        self.events: List[GameEvent] = []
        self.ai_client = AIClient()
        
        # 游戏配置
        self.config = {
            "round_interval": 30,  # 轮次间隔（秒）
            "base_funding_rate": 1000,  # 基础资金获取率
            "max_companies": 10,  # 最大公司数量
            "decision_timeout": 60,  # 决策超时时间（秒）
            "ai_request_delay": 2,  # AI请求间隔（秒）
        }
        
        self.current_round = 0
        self.current_phase = RoundPhase.FUNDING
        self.last_round_time = datetime.now()
        self.auto_round_task = None
        
        # AI请求队列和处理状态
        self.ai_request_queue = []
        self.ai_processing = False
        
        # 用于生成唯一员工名字的集合
        self.used_names = set()
    
    async def initialize(self, auto_start=True):
        logger.info("Initializing game engine...")
        
        # 清空使用的名字集合
        self.used_names.clear()
        
        # 创建初始公司
        await self._create_initial_companies()
        
        # 根据参数决定是否自动开始游戏
        if auto_start:
            self.state = GameState.RUNNING
            self.current_round = 0  
            if self.mode == GameMode.AUTO:
                await self.start_auto_rounds()
        else:
            # 初始化完成但不自动开始
            self.state = GameState.STOPPED
            self.current_round = 0  
        
        self.last_round_time = datetime.now()
        
        logger.info(f"Game engine initialized successfully, auto_start: {auto_start}, state: {self.state.value}")
    
    async def _create_initial_companies(self):
        self.companies.clear()
        
        logger.info("Created empty company list for initial state")
    
    def _generate_unique_name(self, company_name: str, role: Role) -> str:
        max_attempts = 100
        for _ in range(max_attempts):
            surname = random.choice(self.SURNAMES)
            given_name = random.choice(self.GIVEN_NAMES)
            if random.random() < 0.3:
                given_name += random.choice(self.GIVEN_NAMES)
            
            full_name = f"{surname}{given_name}"
            
            if full_name not in self.used_names:
                self.used_names.add(full_name)
                return full_name
        
        base_name = f"{random.choice(self.SURNAMES)}{random.choice(self.GIVEN_NAMES)}"
        counter = 1
        while f"{base_name}{counter}" in self.used_names:
            counter += 1
        final_name = f"{base_name}{counter}"
        self.used_names.add(final_name)
        return final_name
    
    def _generate_ai_personality(self) -> str:
        """生成AI性格描述"""
        personality = random.choice(self.AI_PERSONALITIES)
        traits = []
        
        if personality == "分析型":
            traits.extend(["喜欢深入分析数据", "重视逻辑思考", "谨慎做决定"])
        elif personality == "创新型":
            traits.extend(["富有创造力", "善于提出新想法", "喜欢挑战传统"])
        elif personality == "实用型":
            traits.extend(["注重实际效果", "偏好可行方案", "高效执行者"])
        elif personality == "合作型":
            traits.extend(["善于团队合作", "重视沟通协调", "能倒听他人意见"])
        elif personality == "领导型":
            traits.extend(["具有领导才能", "善于激励他人", "能够做出困难决定"])
        else:
            traits.extend(["工作认真负责", "具有专业精神", "能够快速适应"])
        
        # 随机选择部分特征
        selected_traits = random.sample(traits, min(2, len(traits)))
        return f"{personality}、{'、'.join(selected_traits)}"
    
    def _generate_decision_style(self) -> str:
        """生成决策风格"""
        return random.choice(self.DECISION_STYLES)
    
    async def shutdown(self):
        """关闭游戏引擎"""
        logger.info("Shutting down game engine...")
        self.state = GameState.STOPPED
        
        # 停止自动轮次
        if self.auto_round_task:
            self.auto_round_task.cancel()
        
        logger.info("Game engine shutdown completed")
    
    async def start_auto_rounds(self):
        """启动自动轮次"""
        if self.mode != GameMode.AUTO:
            return
            
        self.auto_round_task = asyncio.create_task(self._auto_round_loop())
    
    async def stop_auto_rounds(self):
        """停止自动轮次"""
        if self.auto_round_task:
            self.auto_round_task.cancel()
            self.auto_round_task = None
    
    async def set_mode(self, mode: GameMode):
        """设置游戏模式"""
        self.mode = mode
        if mode == GameMode.AUTO:
            await self.start_auto_rounds()
        else:
            await self.stop_auto_rounds()
    
    async def _auto_round_loop(self):
        """自动轮次循环"""
        while self.state == GameState.RUNNING and self.mode == GameMode.AUTO:
            try:
                await self.execute_round()
                await asyncio.sleep(self.config["round_interval"])
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in auto round loop: {e}")
                await asyncio.sleep(5)  
    
    async def execute_round(self) -> List[GameEvent]:
        """执行游戏轮次"""
        if self.state != GameState.RUNNING:
            return []
        
        round_events = []
        self.current_round += 1
        current_time = datetime.now()
        
        logger.info(f"Executing game round {self.current_round}")
        
        try:
            # 轮次开始事件
            round_start_event = GameEvent(
                id=f"round_start_{self.current_round}",
                type="round_start",
                timestamp=current_time,
                company_id=None,
                description=f"游戏轮次 {self.current_round} 开始",
                data={
                    "round": self.current_round,
                    "mode": self.mode.value,
                    "companies_count": len(self.companies)
                }
            )
            round_events.append(round_start_event)
            
            # 执行轮次的各个阶段
            for phase in [RoundPhase.FUNDING, RoundPhase.AI_DECISIONS, RoundPhase.MARKET_EVENTS, RoundPhase.STATUS_UPDATE]:
                self.current_phase = phase
                phase_events = await self._execute_phase(phase)
                round_events.extend(phase_events)
                
                # 发布阶段完成事件
                phase_event = GameEvent(
                    id=f"phase_{self.current_round}_{phase.value}",
                    type="phase_complete",
                    timestamp=datetime.now(),
                    company_id=None,
                    description=f"轮次 {self.current_round} 阶段 {phase.value} 完成",
                    data={
                        "round": self.current_round,
                        "phase": phase.value,
                        "events_count": len(phase_events)
                    }
                )
                round_events.append(phase_event)
            
            self.current_phase = RoundPhase.ROUND_COMPLETE
            self.last_round_time = current_time
            
            # 添加轮次完成事件
            round_complete_event = GameEvent(
                id=f"round_{self.current_round}",
                type="round_complete",
                timestamp=current_time,
                company_id=None,
                description=f"游戏轮次 {self.current_round} 完成",
                data={
                    "round": self.current_round,
                    "companies_count": len(self.companies),
                    "total_events": len(round_events),
                    "mode": self.mode.value
                }
            )
            round_events.append(round_complete_event)
            
        except Exception as e:
            logger.error(f"Error in game round {self.current_round}: {e}")
            error_event = GameEvent(
                id=f"error_{self.current_round}",
                type="round_error",
                timestamp=current_time,
                company_id=None,
                description=f"游戏轮次 {self.current_round} 出现错误: {str(e)}",
                data={"error": str(e)}
            )
            round_events.append(error_event)
        
        # 保存事件到历史记录
        self.events.extend(round_events)
        
        # 更新缓存和实时流
        await self._update_cache_and_streams(round_events)
        
        return round_events
    
    async def _execute_phase(self, phase: RoundPhase) -> List[GameEvent]:
        """执行轮次阶段"""
        phase_events = []
        
        logger.info(f"Executing phase: {phase.value}")
        
        # 检查游戏是否被暂停或停止
        if self.state != GameState.RUNNING:
            # 返回一个空事件列表，不执行阶段
            pause_event = GameEvent(
                id=f"phase_paused_{self.current_round}_{phase.value}_{datetime.now().timestamp()}",
                type="phase_paused",
                timestamp=datetime.now(),
                company_id=None,
                description=f"由于游戏已暂停，跳过阶段 {phase.value}",
                data={"phase": phase.value, "round": self.current_round}
            )
            return [pause_event]
        
        if phase == RoundPhase.FUNDING:
            phase_events = await self._distribute_funding()
        elif phase == RoundPhase.AI_DECISIONS:
            phase_events = await self._process_ai_decisions_staged()
        elif phase == RoundPhase.MARKET_EVENTS:
            phase_events = await self._generate_market_events()
        elif phase == RoundPhase.STATUS_UPDATE:
            phase_events = await self._update_company_status()
        
        return phase_events
    
    async def _process_ai_decisions_staged(self) -> List[GameEvent]:
        """分阶段处理AI决策，避免并发请求"""
        events = []
        
        # 为每个公司生成决策请求
        for company in self.companies.values():
            if not company.is_active:
                continue
                
            company_employees = [emp for emp in self.employees.values() if emp.company_id == company.id]
            
            if company.company_type == CompanyType.CENTRALIZED:
                # 集权公司：分层决策
                events.extend(await self._process_hierarchical_decisions_staged(company, company_employees))
            else:
                # 去中心化公司：集体决策
                events.extend(await self._process_collaborative_decisions_staged(company, company_employees))
        
        return events
    
    async def _process_hierarchical_decisions_staged(self, company: Company, employees: List[Employee]) -> List[GameEvent]:
        """分阶段处理集权公司的层级决策"""
        events = []
        
        # 按级别分组
        ceo_employees = [emp for emp in employees if emp.role == Role.CEO]
        manager_employees = [emp for emp in employees if emp.role == Role.MANAGER]
        regular_employees = [emp for emp in employees if emp.role == Role.EMPLOYEE]
        
        # 1. 员工决策
        for employee in regular_employees[:3]:  # 限制员工决策数量
            decision = await self._make_ai_decision_with_delay(employee, company, "operational")
            events.append(self._create_decision_event(decision, company, "employee_decision"))
        
        # 2. 经理决策
        for manager in manager_employees:
            decision = await self._make_ai_decision_with_delay(manager, company, "managerial")
            events.append(self._create_decision_event(decision, company, "manager_decision"))
        
        # 3. CEO决策
        if ceo_employees:
            ceo = ceo_employees[0]
            decision = await self._make_ai_decision_with_delay(ceo, company, "executive")
            events.append(self._create_decision_event(decision, company, "ceo_decision"))
        
        # 创建层级决策完成事件
        hierarchical_event = GameEvent(
            id=f"hierarchical_decision_{company.id}_{self.current_round}",
            type="hierarchical_decision",
            timestamp=datetime.now(),
            company_id=company.id,
            description=f"{company.name} 完成层级决策",
            data={
                "company_type": "centralized",
                "ceo_decisions": len(ceo_employees),
                "manager_decisions": len(manager_employees),
                "employee_decisions": min(len(regular_employees), 3),
                "total_decisions": len(ceo_employees) + len(manager_employees) + min(len(regular_employees), 3)
            }
        )
        events.append(hierarchical_event)
        
        return events
    
    async def _process_collaborative_decisions_staged(self, company: Company, employees: List[Employee]) -> List[GameEvent]:
        """分阶段处理去中心化公司的协作决策"""
        events = []
        
        # 随机选择5个员工参与决策
        participating_employees = random.sample(employees, min(5, len(employees)))
        
        # 分阶段为每个员工生成决策
        for employee in participating_employees:
            decision = await self._make_ai_decision_with_delay(employee, company, "collaborative")
            events.append(self._create_decision_event(decision, company, "collaborative_proposal"))
        
        # 创建协作决策完成事件
        collaborative_event = GameEvent(
            id=f"collaborative_decision_{company.id}_{self.current_round}",
            type="collaborative_decision",
            timestamp=datetime.now(),
            company_id=company.id,
            description=f"{company.name} 通过集体决策做出决定",
            data={
                "company_type": "decentralized",
                "participating_employees": len(participating_employees),
                "total_proposals": len(participating_employees)
            }
        )
        events.append(collaborative_event)
        
        return events
    
    async def _make_ai_decision_with_delay(self, employee: Employee, company: Company, decision_type: str) -> Decision:
        """带延迟的AI决策调用"""
        # 检查游戏是否被暂停或停止
        if self.state != GameState.RUNNING:
            # 返回一个默认的决策，不调用AI
            return Decision(
                id=f"paused_decision_{company.id}_{employee.id}_{self.current_round}_{datetime.now().timestamp()}",
                company_id=company.id,
                employee_id=employee.id,
                decision_type=DecisionType(decision_type) if decision_type in [e.value for e in DecisionType] else DecisionType.COLLABORATIVE,
                content=f"由于游戏已暂停，{employee.name}暂停决策过程",
                created_at=datetime.now(),
                ai_provider=None,
                ai_model=None,
                cost=0.0
            )
            
        # 添加延迟以避免并发
        await asyncio.sleep(self.config["ai_request_delay"])
        
        if self.state != GameState.RUNNING:
            return Decision(
                id=f"paused_decision_{company.id}_{employee.id}_{self.current_round}_{datetime.now().timestamp()}",
                company_id=company.id,
                employee_id=employee.id,
                decision_type=DecisionType(decision_type) if decision_type in [e.value for e in DecisionType] else DecisionType.COLLABORATIVE,
                content=f"由于游戏已暂停，{employee.name}暂停决策过程",
                created_at=datetime.now(),
                ai_provider=None,
                ai_model=None,
                cost=0.0
            )
        
        # 构建决策上下文
        context = {
            "company_info": {
                "name": company.name,
                "type": company.company_type.value,
                "funds": company.funds,
                "size": company.size,
                "round": self.current_round
            },
            "employee_info": {
                "name": employee.name,
                "role": employee.role.value,
                "level": employee.level,
                "experience": employee.experience
            },
            "decision_history": [
                {
                    "content": d.content,
                    "type": d.decision_type.value,
                    "timestamp": d.created_at.isoformat()
                }
                for d in self.decisions[-5:]  # 最近5个决策
            ]
        }
        
        # 构建AI提示
        prompt = self._build_decision_prompt(employee, company, decision_type, context)
        
        # 调用AI
        ai_response = await self.ai_client.call_ai(
            prompt=prompt,
            provider=AIProvider.MOONSHOT,
            temperature=0.7,
            max_tokens=200,
            context=context
        )
        
        # 创建决策记录
        decision = Decision(
            id=f"decision_{company.id}_{employee.id}_{self.current_round}{datetime.now().timestamp()}",
            company_id=company.id,
            employee_id=employee.id,
            decision_type=DecisionType(decision_type) if decision_type in [e.value for e in DecisionType] else DecisionType.COLLABORATIVE,
            content=ai_response.content,
            created_at=datetime.now(),
            ai_provider=ai_response.provider.value,
            ai_model=ai_response.model,
            cost=ai_response.cost,
            # 添加员工AI属性
            employee_ai_personality=getattr(employee, 'ai_personality', None),
            employee_decision_style=getattr(employee, 'decision_style', None),
            employee_role=employee.role.value,
            employee_level=employee.level,
            employee_experience=employee.experience
        )
        
        # 为去中心化公司添加模拟投票
        if company.company_type.value == 'decentralized':
            self._simulate_voting_for_decision(decision, company)
        
        self.decisions.append(decision)
        return decision
    
    def _build_decision_prompt(self, employee: Employee, company: Company, decision_type: str, context: Dict) -> str:
        """构建AI决策提示 - 角色扮演模式"""
        
        # 获取员工的AI性格和决策风格
        ai_personality = getattr(employee, 'ai_personality', '理性型、具有专业精神、工作认真负责')
        decision_style = getattr(employee, 'decision_style', '数据驱动')
        
        # 根据角色构建不同的提示
        role_context = self._get_role_context(employee.role.value, company.company_type.value)
        
        # 构建决策历史摘要
        decision_history = context.get('decision_history', [])
        history_summary = self._build_history_summary(decision_history)
        
        # 构建角色扮演提示
        base_prompt = f"""
# 角色设定
你是{company.name}的{employee.role.value} {employee.name}。

## 个人特质
- 性格特点：{ai_personality}
- 决策风格：{decision_style}
- 职业等级：{employee.level}级
- 工作经验：{employee.experience}点

## 公司环境
- 公司名称：{company.name}
- 组织类型：{company.company_type.value}（{self._get_company_type_description(company.company_type.value)}）
- 当前资金：${company.funds:,}
- 团队规模：{company.size}人
- 游戏轮次：第{self.current_round}轮

## 角色职责
{role_context}

## 决策类型
当前需要做出的决策类型：{decision_type}

## 近期决策历史
{history_summary}

## 任务要求
请以{employee.name}的身份，结合你的{ai_personality}和{decision_style}的特点，在{company.company_type.value}公司环境下，做出一个符合{employee.role.value}角色的商业决策。

决策要求：
1. 体现你的个人性格特点和决策风格
2. 符合{employee.role.value}的职责范围
3. 考虑{company.company_type.value}公司的组织特点
4. 具有实际可操作性
5. 简洁明了（30-50字）

请直接给出决策内容，以第一人称表述：
        """
        
        return base_prompt
    
    def _get_role_context(self, role: str, company_type: str) -> str:
        """获取角色上下文描述"""
        role_contexts = {
            'ceo': {
                'centralized': '作为集权公司的CEO，你拥有最终决策权，需要制定公司战略方向，管理高层团队，对公司整体绩效负责。',
                'decentralized': '作为去中心化公司的协调者，你需要促进团队协作，确保信息流通，支持员工自主决策。'
            },
            'manager': {
                'centralized': '作为中层管理者，你需要执行CEO的战略决策，管理团队，协调部门间合作，向上汇报工作进展。',
                'decentralized': '作为去中心化组织的引导者，你需要支持团队成员，促进跨部门协作，确保项目顺利推进。'
            },
            'employee': {
                'centralized': '作为一线员工，你需要执行上级分配的任务，在职责范围内提出建议，努力完成个人目标。',
                'decentralized': '作为自主工作者，你有更大的决策自由度，需要主动承担责任，积极参与团队决策。'
            }
        }
        return role_contexts.get(role, {}).get(company_type, '请根据你的职位做出合适的决策。')
    
    def _get_company_type_description(self, company_type: str) -> str:
        """获取公司类型描述"""
        descriptions = {
            'centralized': '层级分明的传统组织结构，决策权集中在高层',
            'decentralized': '扁平化的现代组织结构，决策权分散到各层级'
        }
        return descriptions.get(company_type, '组织结构')
    
    def _build_history_summary(self, decision_history: List[Dict]) -> str:
        """构建决策历史摘要"""
        if not decision_history:
            return "暂无近期决策历史"
        
        summary = "近期决策回顾：\n"
        for i, decision in enumerate(decision_history[-3:], 1):
            summary += f"{i}. {decision.get('content', '无内容')}\n"
        
        return summary
    
    def _simulate_voting_for_decision(self, decision: Decision, company: Company):
        """为去中心化公司的决策模拟投票过程"""
        # 获取公司员工数量
        company_employees = [e for e in self.employees.values() if e.company_id == company.id]
        voter_count = len(company_employees)
        
        if voter_count == 0:
            return
        
        # 随机生成投票结果（模拟真实投票场景）
        import random
        
        # 根据决策重要性和紧急度调整投票倾向
        base_approval_rate = 0.6  # 基础支持率60%
        
        # 重要决策可能获得更多支持
        if decision.importance >= 2:
            base_approval_rate += 0.1
        
        # 紧急决策可能获得更多支持
        if decision.urgency >= 2:
            base_approval_rate += 0.1
        
        # 限制支持率在合理范围内
        base_approval_rate = max(0.3, min(0.8, base_approval_rate))
        
        # 随机选择3-5个员工参与投票
        participating_voters = min(random.randint(3, 5), voter_count)
        
        for i in range(participating_voters):
            # 根据支持率随机生成投票
            if random.random() < base_approval_rate:
                decision.add_vote(f"voter_{i}", "for")
            elif random.random() < 0.2:  # 20%的弃权率
                decision.add_vote(f"voter_{i}", "abstain")
            else:
                decision.add_vote(f"voter_{i}", "against")
        
        # 根据投票结果更新决策状态
        vote_result = decision.get_vote_result()
        if vote_result == "approved":
            decision.status = DecisionStatus.COMPLETED
            decision.completed_at = datetime.now()
        elif vote_result == "rejected":
            decision.status = DecisionStatus.REJECTED
            decision.completed_at = datetime.now()
        else:  # 平票情况
            # 随机决定批准或拒绝
            import random
            if random.choice([True, False]):
                decision.status = DecisionStatus.COMPLETED
                vote_result = "approved (tie broken randomly)"
            else:
                decision.status = DecisionStatus.REJECTED
                vote_result = "rejected (tie broken randomly)"
            decision.completed_at = datetime.now()
            # 记录平票随机结果
            decision.vote_tie_break = vote_result
    
    def _create_decision_event(self, decision: Decision, company: Company, event_type: str) -> GameEvent:
        """创建决策事件"""
        return GameEvent(
            id=f"{event_type}_{decision.id}",
            type=event_type,
            timestamp=decision.created_at,
            company_id=company.id,
            description=f"{company.name} 做出决策: {decision.content[:30]}...",
            data={
                "decision_id": decision.id,
                "employee_id": decision.employee_id,
                "decision_type": decision.decision_type.value,
                "content": decision.content,
                "ai_provider": decision.ai_provider,
                "ai_model": decision.ai_model,
                "cost": decision.cost
            }
        )
    
    async def _update_cache_and_streams(self, events: List[GameEvent]):
        """更新缓存和实时流"""
        try:
            # 缓存游戏状态
            await cache_manager.cache_game_stats(self.get_game_stats())
            
            # 缓存事件并发布到流
            for event in events:
                event_dict = event.__dict__.copy()
                # 处理datetime对象
                if isinstance(event_dict.get('timestamp'), datetime):
                    event_dict['timestamp'] = event_dict['timestamp'].isoformat()
                await cache_manager.add_game_event(event_dict)
                # 发布到实时流
                await stream_manager.add_game_event(event_dict)
            
            # 缓存决策数据
            decisions_data = []
            for decision in self.decisions[-10:]:  
                decision_dict = {
                    'id': decision.id,
                    'company_id': decision.company_id,
                    'employee_id': decision.employee_id,
                    'decision_type': decision.decision_type.value,
                    'content': decision.content,
                    'created_at': decision.created_at.isoformat(),
                    'ai_provider': decision.ai_provider,
                    'ai_model': decision.ai_model,
                    'cost': decision.cost
                }
                decisions_data.append(decision_dict)
            
            await cache_manager.cache_decisions(decisions_data)
            
            # 批量缓存公司数据
            companies = list(self.companies.values())
            await cache_manager.bulk_cache_companies(companies)
            
            # 缓存AI统计信息
            await cache_manager.cache_ai_stats(self.ai_client.call_stats)
            
            logger.info(f"Cached {len(events)} events, {len(decisions_data)} decisions, {len(companies)} companies")
            
        except Exception as e:
            logger.error(f"Error updating cache: {e}")
    
    async def reset_game(self):
        """重置游戏"""
        logger.info("Resetting game...")
        
        # 停止自动轮次
        if self.auto_round_task:
            self.auto_round_task.cancel()
            self.auto_round_task = None
        
        # 清空所有数据
        self.companies.clear()
        self.employees.clear()
        self.decisions.clear()
        self.events.clear()
        
        # 重置游戏状态
        self.current_round = 0
        self.current_phase = RoundPhase.FUNDING
        self.last_round_time = datetime.now()
        self.ai_client.call_stats = {
            "total_calls": 0,
            "total_cost": 0.0,
            "provider_stats": {}
        }
        
        # 清空缓存
        await cache_manager.clear_game_cache()
        
        # 重新初始化
        await self.initialize()
        
        # 发布重置事件
        reset_event = GameEvent(
            id=f"game_reset_{datetime.now().timestamp()}",
            type="game_reset",
            timestamp=datetime.now(),
            company_id=None,
            description="游戏已重置",
            data={"timestamp": datetime.now().isoformat()}
        )
        
        self.events.append(reset_event)
        await self._update_cache_and_streams([reset_event])
        
        logger.info("Game reset completed")

    # 创建公司并允许指定组织类型
    async def create_company(self, name: str, company_type: str, size: int = 10, funds: int = 50000):
        """创建公司
        Args:
            name: 公司名称
            company_type: 公司类型 ('centralized' 或 'decentralized')
            size: 公司规模
            funds: 初始资金
        """
        # 验证公司类型
        if company_type not in ['centralized', 'decentralized']:
            raise ValueError("公司类型必须是 'centralized' 或 'decentralized'")

        # 创建公司
        company_id = f"company_{uuid.uuid4().hex[:8]}"
        company = Company(
            id=company_id,
            name=name,
            company_type=CompanyType(company_type),
            funds=funds,
            size=size,
            created_at=datetime.now()
        )

        self.companies[company.id] = company
        await self._create_employees_for_company(company)

        # 发布公司创建事件
        event = GameEvent(
            id=f"company_created_{company.id}",
            type="company_created",
            timestamp=datetime.now(),
            company_id=company.id,
            description=f"创建公司: {company.name}",
            data={
                "company_id": company.id,
                "name": company.name,
                "type": company.company_type.value,
                "size": company.size,
                "funds": company.funds
            }
        )
        self.events.append(event)
        await self._update_cache_and_streams([event])

        return company

    # 允许自定义员工属性
    async def create_employee(self, company_id: str, name: str, role: str, level: int,
                            experience: int, ai_personality: str, decision_style: str):
        """创建员工
        Args:
            company_id: 公司ID
            name: 员工姓名
            role: 员工角色 ('ceo', 'manager', 'employee')
            level: 职业等级 (1-3)
            experience: 工作经验
            ai_personality: AI性格描述
            decision_style: 决策风格
        """
        # 验证公司存在
        if company_id not in self.companies:
            raise ValueError(f"公司ID不存在: {company_id}")

        # 验证角色
        if role not in [r.value for r in Role]:
            raise ValueError(f"无效的角色: {role}")

        # 验证等级范围
        if not 1 <= level <= 3:
            raise ValueError("职业等级必须在1-3之间")

        company = self.companies[company_id]
        employee_id = f"{company_id}_{role}_{uuid.uuid4().hex[:4]}"

        # 创建员工
        employee = Employee(
            id=employee_id,
            company_id=company_id,
            name=name,
            role=Role(role),
            level=level,
            experience=experience
        )

        # 设置自定义属性
        employee.ai_personality = ai_personality
        employee.decision_style = decision_style

        self.employees[employee.id] = employee
        company.size += 1  # 增加公司规模

        # 发布员工创建事件
        event = GameEvent(
            id=f"employee_created_{employee.id}",
            type="employee_created",
            timestamp=datetime.now(),
            company_id=company_id,
            description=f"{company.name} 雇佣了 {name} 作为 {role}",
            data={
                "employee_id": employee.id,
                "name": name,
                "role": role,
                "level": level,
                "experience": experience
            }
        )
        self.events.append(event)
        await self._update_cache_and_streams([event])

        return employee

    async def _create_employees_for_company(self, company: Company):
        """为公司创建员工"""
        if company.company_type == CompanyType.CENTRALIZED:
            ceo = Employee(
                id=f"{company.id}_ceo",
                company_id=company.id,
                name=self._generate_unique_name(company.name, Role.CEO),
                role=Role.CEO,
                level=3,
                experience=100
            )
            # 设置AI性格和决策风格
            ceo.ai_personality = self._generate_ai_personality()
            ceo.decision_style = self._generate_decision_style()
            self.employees[ceo.id] = ceo
            
            for i in range(3):
                manager = Employee(
                    id=f"{company.id}_manager_{i}",
                    company_id=company.id,
                    name=self._generate_unique_name(company.name, Role.MANAGER),
                    role=Role.MANAGER,
                    level=2,
                    experience=60
                )
                # 设置AI性格和决策风格
                manager.ai_personality = self._generate_ai_personality()
                manager.decision_style = self._generate_decision_style()
                self.employees[manager.id] = manager
            
            # 其余为员工
            remaining_employees = max(0, company.size - 4)  
            for i in range(remaining_employees):
                employee = Employee(
                    id=f"{company.id}_employee_{i}",
                    company_id=company.id,
                    name=self._generate_unique_name(company.name, Role.EMPLOYEE),
                    role=Role.EMPLOYEE,
                    level=1,
                    experience=30
                )
                # 设置AI性格和决策风格
                employee.ai_personality = self._generate_ai_personality()
                employee.decision_style = self._generate_decision_style()
                self.employees[employee.id] = employee
        
        else:  
            # 去中心化公司：全部为员工，扁平化结构
            for i in range(company.size):
                employee = Employee(
                    id=f"{company.id}_employee_{i}",
                    company_id=company.id,
                    name=self._generate_unique_name(company.name, Role.EMPLOYEE),
                    role=Role.EMPLOYEE,
                    level=2,
                    experience=50
                )
                # 设置AI性格和决策风格
                employee.ai_personality = self._generate_ai_personality()
                employee.decision_style = self._generate_decision_style()
                self.employees[employee.id] = employee
    
    async def _distribute_funding(self) -> List[GameEvent]:
        """分配资金"""
        events = []
        
        for company in self.companies.values():
            if not company.is_active:
                continue
                
            # 根据公司规模计算资金增长
            funding_amount = self.config["base_funding_rate"] * (company.size / 10)
            
            # 添加随机因素
            funding_amount *= random.uniform(0.8, 1.2)
            funding_amount = int(funding_amount)
            
            # 添加数值有效性检查
            if not isinstance(funding_amount, (int, float)) or not math.isfinite(funding_amount):
                logger.warning(f"Invalid funding_amount calculated: {funding_amount}")
                funding_amount = 0
            
            company.funds += funding_amount
            
            event = GameEvent(
                id=f"funding_{company.id}_{self.current_round}",
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
    
    async def _generate_market_events(self) -> List[GameEvent]:
        """生成市场事件"""
        events = []
        
        # 随机生成市场事件
        market_events = [
            "市场需求增长",
            "新技术突破",
            "竞争对手进入",
            "政策变化",
            "经济波动"
        ]
        
        if random.random() < 0.3:  
            event_type = random.choice(market_events)
            event = GameEvent(
                id=f"market_{self.current_round}_{datetime.now().timestamp()}",
                type="market_event",
                timestamp=datetime.now(),
                company_id=None,
                description=f"市场事件: {event_type}",
                data={
                    "event_type": event_type,
                    "round": self.current_round
                }
            )
            events.append(event)
        
        return events
    
    async def _update_company_status(self) -> List[GameEvent]:
        """更新公司状态"""
        events = []
        
        # 添加基于决策的成本计算
        await self._apply_decision_costs(events)
        
        # 添加每轮总结机制
        await self._apply_round_summary_penalty(events)
        
        for company in self.companies.values():
            if not company.is_active:
                continue
                
            # 计算运营成本
            operating_cost = company.size * 100  # 每人100基础成本
            company.funds -= operating_cost
            
            # 确保资金不为负
            if company.funds < 0:
                company.funds = 0
            
            event = GameEvent(
                id=f"status_update_{company.id}_{self.current_round}",
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
        
        # 检查公司是否破产
        await self._check_bankruptcies(events)
        
        # 检查游戏是否结束
        await self._check_game_end(events)
        
        return events
    
    async def _apply_decision_costs(self, events: List[GameEvent]):
        """根据决策的时间、成功率和成本应用决策费用"""
        # 按公司分组决策
        decisions_by_company = {}
        for decision in self.decisions:
            if decision.company_id not in decisions_by_company:
                decisions_by_company[decision.company_id] = []
            decisions_by_company[decision.company_id].append(decision)
        
        # 为每个公司的决策计算成本
        for company_id, decisions in decisions_by_company.items():
            if company_id not in self.companies:
                continue
                
            company = self.companies[company_id]
            if not company.is_active:
                continue
            
            total_decision_cost = 0
            
            for decision in decisions:
                # 基础成本就是决策本身产生的成本
                base_cost = decision.cost if decision.cost else 0
                
                # 添加数值有效性检查
                if not isinstance(base_cost, (int, float)) or not math.isfinite(base_cost):
                    logger.warning(f"Invalid base_cost for decision {decision.id}: {base_cost}")
                    base_cost = 0
                
                # 计算决策成功率影响因子
                success_factor = 1.0
                if decision.status == DecisionStatus.COMPLETED:
                    # 成功决策成本降低
                    success_factor = 0.8
                elif decision.status == DecisionStatus.REJECTED:
                    # 失败决策成本增加
                    success_factor = 1.5
                
                # 添加因子有效性检查
                if not isinstance(success_factor, (int, float)) or not math.isfinite(success_factor):
                    logger.warning(f"Invalid success_factor for decision {decision.id}: {success_factor}")
                    success_factor = 1.0
                
                # 计算时间影响因子（越早的决策影响越小）
                time_factor = 1.0
                if decision.created_at:
                    # 计算决策创建时间与当前时间的差值
                    time_diff = datetime.now() - decision.created_at
                    # 超过1轮的决策影响减半
                    if time_diff.total_seconds() > self.config["round_interval"]:
                        time_factor = 0.5
                
                # 添加因子有效性检查
                if not isinstance(time_factor, (int, float)) or not math.isfinite(time_factor):
                    logger.warning(f"Invalid time_factor for decision {decision.id}: {time_factor}")
                    time_factor = 1.0
                
                # 计算最终成本
                decision_cost = base_cost * success_factor * time_factor
                
                # 添加最终成本有效性检查
                if not isinstance(decision_cost, (int, float)) or not math.isfinite(decision_cost):
                    logger.warning(f"Invalid decision_cost for decision {decision.id}: {decision_cost}")
                    decision_cost = 0
                
                total_decision_cost += decision_cost
            
            # 添加总成本有效性检查
            if not isinstance(total_decision_cost, (int, float)) or not math.isfinite(total_decision_cost):
                logger.warning(f"Invalid total_decision_cost for company {company_id}: {total_decision_cost}")
                total_decision_cost = 0
            
            # 从公司资金中扣除决策成本，确保不会导致负数资金
            deduction = int(total_decision_cost)
            company.funds = max(0, company.funds - deduction)
            
            # 添加决策成本事件
            if deduction > 0:
                event = GameEvent(
                    id=f"decision_cost_{company.id}_{self.current_round}",
                    type="decision_cost_applied",
                    timestamp=datetime.now(),
                    company_id=company.id,
                    description=f"{company.name} 支付决策相关费用 {deduction}",
                    data={
                        "decision_cost": deduction,
                        "remaining_funds": company.funds,
                        "decision_count": len(decisions)
                    }
                )
                events.append(event)
    
    async def _apply_round_summary_penalty(self, events: List[GameEvent]):
        """应用每轮总结惩罚机制 - 表现最差的公司会被扣除至少1000资金"""
        if len(self.companies) <= 1:
            return  # 只剩一个或没有公司时不执行惩罚
            
        # 确定表现最差的公司（资金最少的活跃公司）
        active_companies = [c for c in self.companies.values() if c.is_active]
        if len(active_companies) <= 1:
            return  # 只剩一个或没有活跃公司时不执行惩罚
            
        # 按资金排序，找到资金最少的公司
        weakest_company = min(active_companies, key=lambda c: c.funds)
        
        # 计算惩罚金额 - 至少1000，或者是公司当前资金的较大比例（让惩罚更明显）
        penalty_amount = max(1000, int(weakest_company.funds * 0.3))  # 至少1000，或者当前资金的30%
        
        # 添加数值有效性检查
        if not isinstance(penalty_amount, (int, float)) or not math.isfinite(penalty_amount):
            logger.warning(f"Invalid penalty_amount calculated: {penalty_amount}")
            penalty_amount = 1000
            
        # 确保惩罚金额不超过公司当前资金，防止负数
        penalty_amount = min(penalty_amount, weakest_company.funds)
        
        # 应用惩罚
        weakest_company.funds = max(0, weakest_company.funds - penalty_amount)
        
        # 创建惩罚事件
        penalty_event = GameEvent(
            id=f"round_penalty_{weakest_company.id}_{self.current_round}",
            type="round_penalty_applied",
            timestamp=datetime.now(),
            company_id=weakest_company.id,
            description=f"{weakest_company.name} 在本轮中表现最差，被扣除资金 {penalty_amount}",
            data={
                "penalty_amount": penalty_amount,
                "remaining_funds": weakest_company.funds,
                "company_name": weakest_company.name
            }
        )
        events.append(penalty_event)
        
        logger.info(f"Weakest company {weakest_company.name} penalized with {penalty_amount} funds")
    
    async def _check_bankruptcies(self, events: List[GameEvent]):
        """检查公司是否破产"""
        for company in self.companies.values():
            if company.is_active and company.funds <= 0:
                # 公司破产
                company.is_active = False
                company.funds = 0
                
                # 发布破产事件
                event = GameEvent(
                    id=f"bankruptcy_{company.id}_{self.current_round}",
                    type="company_bankruptcy",
                    timestamp=datetime.now(),
                    company_id=company.id,
                    description=f"{company.name} 公司因资金耗尽而破产",
                    data={
                        "company_id": company.id,
                        "company_name": company.name,
                        "final_funds": company.funds
                    }
                )
                events.append(event)
                
                logger.info(f"Company {company.name} has gone bankrupt")
    
    async def _check_game_end(self, events: List[GameEvent]):
        """检查游戏是否结束（只剩一个活跃公司）"""
        active_companies = [c for c in self.companies.values() if c.is_active]
        
        # 如果活跃公司少于等于1个，则游戏结束
        if len(active_companies) <= 1:
            # 发布游戏结束事件
            winner = active_companies[0].name if active_companies else "None"
            event = GameEvent(
                id=f"game_end_{self.current_round}",
                type="game_end",
                timestamp=datetime.now(),
                company_id=None,
                description=f"游戏结束！获胜公司: {winner}",
                data={
                    "winner": winner,
                    "active_companies_count": len(active_companies),
                    "total_rounds": self.current_round
                }
            )
            events.append(event)
            
            # 停止游戏
            self.state = GameState.STOPPED
            if self.auto_round_task:
                self.auto_round_task.cancel()
                self.auto_round_task = None
            
            logger.info(f"Game ended. Winner: {winner}")
    
    def get_game_stats(self) -> Dict[str, Any]:
        """获取游戏统计信息"""
        return {
            "status": self.state.value,
            "mode": self.mode.value,
            "current_round": self.current_round,
            "current_phase": self.current_phase.value,
            "last_round_time": self.last_round_time.isoformat(),
            "companies_count": len(self.companies),
            "employees_count": len(self.employees),
            "decisions_count": len(self.decisions),
            "events_count": len(self.events),
            "ai_stats": self.ai_client.call_stats,
            "config": self.config
        }
    
    def get_companies(self) -> List[Company]:
        """获取公司列表"""
        return list(self.companies.values())
    
    def get_company(self, company_id: str) -> Optional[Company]:
        """获取特定公司"""
        return self.companies.get(company_id)
    
    def get_employees(self, company_id: Optional[str] = None) -> List[Employee]:
        """获取员工列表"""
        if company_id:
            return [emp for emp in self.employees.values() if emp.company_id == company_id]
        return list(self.employees.values())
    
    def get_decisions(self) -> List[Decision]:
        """获取决策列表"""
        return self.decisions
    
    def get_events(self) -> List[GameEvent]:
        """获取事件列表"""
        return self.events
    
    def get_recent_events(self, count: int = 10) -> List[GameEvent]:
        """获取最近的事件"""
        return self.events[-count:] if len(self.events) >= count else self.events
    
    def get_recent_decisions(self, count: int = 10) -> List[Decision]:
        """获取最近的决策"""
        return self.decisions[-count:] if len(self.decisions) >= count else self.decisions
    
    # 状态控制方法
    def pause(self):
        """暂停游戏"""
        self.state = GameState.PAUSED
        if self.auto_round_task:
            self.auto_round_task.cancel()
            self.auto_round_task = None
    
    def resume(self):
        """恢复游戏"""
        if self.current_round == 0:
            # 如果是第一次开始游戏，设置状态为运行
            self.state = GameState.RUNNING
            # 如果是自动模式，启动自动轮次
            if self.mode == GameMode.AUTO:
                asyncio.create_task(self.start_auto_rounds())
        else:
            # 如果是恢复已暂停的游戏
            self.state = GameState.RUNNING
            if self.mode == GameMode.AUTO:
                asyncio.create_task(self.start_auto_rounds())
    
    def stop(self):
        """停止游戏"""
        self.state = GameState.STOPPED
        if self.auto_round_task:
            self.auto_round_task.cancel()
            self.auto_round_task = None
    
    async def _process_customer_purchases(self) -> List[GameEvent]:
        """处理客户购买行为"""
        events = []
        
        for customer in self.customers.values():
            # 检查客户是否可以购买
            if not customer.can_purchase(self.current_round):
                continue
            
            # 查找可以购买的公司产品
            available_companies = list(self.companies.values())
            if not available_companies:
                continue
                
            # 根据客户类型确定购买策略
            if customer.customer_type == CustomerType.PRICE_SENSITIVE:
                # 客户A：寻找价格最低的公司
                available_companies.sort(key=lambda c: c.funds)  # 简化处理，以公司资金作为价格参考
                selected_company = available_companies[0] if available_companies else None
                purchase_quantity = customer.purchase_quantity
            else:  # CustomerType.PREMIUM
                # 客户B：寻找"高端"公司（这里以资金最多的公司为例）
                available_companies.sort(key=lambda c: c.funds, reverse=True)
                selected_company = available_companies[0] if available_companies else None
                purchase_quantity = customer.purchase_quantity
            
            # 如果找到合适的公司且公司有足够的"商品"（这里简化处理）
            if selected_company:
                # 更新客户上次购买轮次
                customer.last_purchase_round = self.current_round
                customer.current_inventory += purchase_quantity
                
                # 公司获得收入（简化处理）
                revenue = purchase_quantity * 100  # 每个单位100元
                
                # 添加数值有效性检查
                if not isinstance(revenue, (int, float)) or not math.isfinite(revenue):
                    logger.warning(f"Invalid revenue calculated: {revenue}")
                    revenue = 0
                
                selected_company.funds += revenue
                
                # 创建购买事件
                purchase_event = GameEvent(
                    id=f"customer_purchase_{customer.id}_{self.current_round}",
                    type="customer_purchase",
                    timestamp=datetime.now(),
                    company_id=selected_company.id,
                    description=f"{customer.name} 从 {selected_company.name} 购买了 {purchase_quantity} 个商品",
                    data={
                        "customer_id": customer.id,
                        "customer_name": customer.name,
                        "company_id": selected_company.id,
                        "company_name": selected_company.name,
                        "quantity": purchase_quantity,
                        "revenue": revenue,
                        "customer_type": customer.customer_type.value
                    }
                )
                events.append(purchase_event)
        
        return events

'use client';

import { useToast } from '@/components/ui/toast';

export interface GameEvent {
  type: string;
  description: string;
  timestamp: string;
  company_id?: string;
  employee_id?: string;
  severity?: 'info' | 'warning' | 'success' | 'error';
  data?: any;
}

export interface Company {
  id: string;
  name: string;
  type: 'centralized' | 'decentralized';
}

export interface Employee {
  id: string;
  name: string;
  role: 'ceo' | 'manager' | 'employee';
  company_id: string;
}

export class NotificationService {
  private addToast: (toast: any) => void;
  private companies: Company[] = [];
  private employees: Employee[] = [];
  private mutedEvents: Set<string> = new Set();
  private eventHistory: GameEvent[] = [];

  constructor(addToast: (toast: any) => void) {
    this.addToast = addToast;
  }

  updateCompanies(companies: Company[]) {
    this.companies = companies;
  }

  updateEmployees(employees: Employee[]) {
    this.employees = employees;
  }

  muteEventType(eventType: string) {
    this.mutedEvents.add(eventType);
  }

  unmuteEventType(eventType: string) {
    this.mutedEvents.delete(eventType);
  }

  processEvent(event: GameEvent) {
    // 添加到历史记录
    this.eventHistory.push(event);
    
    // 保持历史记录在合理范围内
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }

    // 检查是否被静音
    if (this.mutedEvents.has(event.type)) {
      return;
    }

    // 根据事件类型处理不同的通知
    switch (event.type) {
      case 'round_start':
        this.handleRoundStart(event);
        break;
      case 'round_complete':
        this.handleRoundComplete(event);
        break;
      case 'decision':
        this.handleDecision(event);
        break;
      case 'funding':
        this.handleFunding(event);
        break;
      case 'communication':
        this.handleCommunication(event);
        break;
      case 'action':
        this.handleAction(event);
        break;
      case 'game_reset':
        this.handleGameReset(event);
        break;
      case 'phase_complete':
        this.handlePhaseComplete(event);
        break;
      case 'company_update':
        this.handleCompanyUpdate(event);
        break;
      case 'employee_update':
        this.handleEmployeeUpdate(event);
        break;
      case 'error':
        this.handleError(event);
        break;
      default:
        this.handleGenericEvent(event);
    }
  }

  private handleRoundStart(event: GameEvent) {
    const roundNumber = event.data?.round || '未知';
    this.addToast({
      type: 'info',
      title: '新轮次开始',
      message: `游戏轮次 ${roundNumber} 开始！`,
      duration: 3000
    });
  }

  private handleRoundComplete(event: GameEvent) {
    const roundNumber = event.data?.round || '未知';
    const eventsCount = event.data?.total_events || 0;
    this.addToast({
      type: 'success',
      title: '轮次完成',
      message: `轮次 ${roundNumber} 完成，共处理 ${eventsCount} 个事件`,
      duration: 4000
    });
  }

  private handleDecision(event: GameEvent) {
    const company = this.getCompanyById(event.company_id);
    const employee = this.getEmployeeById(event.employee_id);
    
    const severity = event.severity || 'info';
    let title = '新决策';
    let message = event.description;

    if (company && employee) {
      title = `${company.name} - ${employee.name}`;
      message = `${employee.role === 'ceo' ? 'CEO' : employee.role === 'manager' ? '经理' : '员工'} 做出了新决策`;
    }

    this.addToast({
      type: severity,
      title,
      message,
      duration: 5000,
      action: {
        label: '查看详情',
        onClick: () => this.showEventDetails(event)
      }
    });
  }

  private handleFunding(event: GameEvent) {
    const company = this.getCompanyById(event.company_id);
    const amount = event.data?.amount || 0;
    
    this.addToast({
      type: 'info',
      title: '资金分配',
      message: `${company?.name || '公司'} 获得了 $${amount.toLocaleString()} 资金`,
      duration: 4000
    });
  }

  private handleCommunication(event: GameEvent) {
    const company = this.getCompanyById(event.company_id);
    
    this.addToast({
      type: 'info',
      title: '团队沟通',
      message: `${company?.name || '公司'} 内部发生了沟通`,
      duration: 3000
    });
  }

  private handleAction(event: GameEvent) {
    const company = this.getCompanyById(event.company_id);
    const severity = event.severity || 'info';
    
    this.addToast({
      type: severity,
      title: '行动执行',
      message: `${company?.name || '公司'} 执行了一项行动`,
      duration: 4000
    });
  }

  private handleGameReset(event: GameEvent) {
    this.addToast({
      type: 'warning',
      title: '游戏重置',
      message: '游戏已重置，所有数据已清空',
      duration: 6000
    });
  }

  private handlePhaseComplete(event: GameEvent) {
    const phase = event.data?.phase || '未知阶段';
    const roundNumber = event.data?.round || '未知';
    
    // 只显示重要阶段的通知
    if (phase === 'ai_decisions' || phase === 'funding') {
      this.addToast({
        type: 'info',
        title: '阶段完成',
        message: `轮次 ${roundNumber} - ${this.getPhaseDisplayName(phase)} 完成`,
        duration: 2000
      });
    }
  }

  private handleCompanyUpdate(event: GameEvent) {
    const company = this.getCompanyById(event.company_id);
    
    // 只在重要变更时通知
    if (event.data?.funds_change && Math.abs(event.data.funds_change) > 10000) {
      const change = event.data.funds_change;
      this.addToast({
        type: change > 0 ? 'success' : 'warning',
        title: '资金变化',
        message: `${company?.name || '公司'} 资金${change > 0 ? '增加' : '减少'} $${Math.abs(change).toLocaleString()}`,
        duration: 4000
      });
    }
  }

  private handleEmployeeUpdate(event: GameEvent) {
    const employee = this.getEmployeeById(event.employee_id);
    const company = this.getCompanyById(event.company_id);
    
    // 只在状态重要变更时通知
    if (event.data?.status_change && event.data.status_change.from !== event.data.status_change.to) {
      const statusFrom = event.data.status_change.from;
      const statusTo = event.data.status_change.to;
      
      if (statusTo === 'thinking' || statusTo === 'deciding') {
        this.addToast({
          type: 'info',
          title: '员工状态',
          message: `${company?.name || '公司'} 的 ${employee?.name || '员工'} 正在${statusTo === 'thinking' ? '思考' : '决策'}`,
          duration: 3000
        });
      }
    }
  }

  private handleError(event: GameEvent) {
    this.addToast({
      type: 'error',
      title: '系统错误',
      message: event.description || '发生了未知错误',
      duration: 8000
    });
  }

  private handleGenericEvent(event: GameEvent) {
    // 对于未知事件类型，只在明确要求时显示
    if (event.severity === 'error' || event.severity === 'warning') {
      this.addToast({
        type: event.severity,
        title: '系统通知',
        message: event.description,
        duration: 5000
      });
    }
  }

  private getCompanyById(id?: string): Company | undefined {
    if (!id) return undefined;
    return this.companies.find(c => c.id === id);
  }

  private getEmployeeById(id?: string): Employee | undefined {
    if (!id) return undefined;
    return this.employees.find(e => e.id === id);
  }

  private getPhaseDisplayName(phase: string): string {
    switch (phase) {
      case 'funding': return '资金分配';
      case 'ai_decisions': return 'AI决策';
      case 'market_events': return '市场事件';
      case 'status_update': return '状态更新';
      default: return phase;
    }
  }

  private showEventDetails(event: GameEvent) {
    // 这里可以实现显示事件详情的功能
    console.log('Event details:', event);
  }

  getEventHistory(limit = 50): GameEvent[] {
    return this.eventHistory.slice(-limit);
  }

  getEventStats(): { total: number; byType: Record<string, number> } {
    const stats = {
      total: this.eventHistory.length,
      byType: {} as Record<string, number>
    };

    this.eventHistory.forEach(event => {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
    });

    return stats;
  }
}

export default NotificationService;
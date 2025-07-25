'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Clock, User, TrendingUp, CheckCircle, XCircle, Circle } from 'lucide-react';

interface Decision {
  id: string;
  decision_type: string;
  content: string;
  created_at: string;
  employee_name: string;
  employee_role: string;
  status: string;
  importance: number;
  urgency: number;
  ai_provider?: string;
  cost?: number;
  votes_for?: number;
  votes_against?: number;
  abstentions?: number;
  vote_result?: string;
  approval_rate?: number;
  voters?: string[];
  vote_details?: Record<string, string>;
}

interface DecisionPanelProps {
  companyId: string;
}

export function DecisionPanel({ companyId }: DecisionPanelProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [employees, setEmployees] = useState<Record<string, {name: string, role: string}>>({});

  useEffect(() => {
    loadDecisions();
    loadEmployees();
  }, [companyId]);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/simulation/decisions?company_id=${companyId}&limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        setDecisions(data.decisions || []);
        setError(null);
      } else {
        setError('Failed to load decisions');
      }
    } catch (err) {
      setError('Error loading decisions');
      console.error('Error loading decisions:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadEmployees = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/employees`);
      if (response.ok) {
        const data = await response.json();
        const employeeMap: Record<string, {name: string, role: string}> = {};
        data.employees?.forEach((emp: any) => {
          employeeMap[emp.id] = { name: emp.name, role: emp.role };
        });
        setEmployees(employeeMap);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const getDecisionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'strategic': '战略决策',
      'operational': '运营决策',
      'tactical': '战术决策',
      'collaborative': '协作决策',
      'emergency': '紧急决策'
    };
    return types[type] || type;
  };

  const getDecisionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'strategic': 'bg-purple-100 text-purple-800',
      'operational': 'bg-blue-100 text-blue-800',
      'tactical': 'bg-green-100 text-green-800',
      'collaborative': 'bg-orange-100 text-orange-800',
      'emergency': 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': '待处理',
      'in_progress': '进行中',
      'completed': '已完成',
      'rejected': '被拒绝',
      'cancelled': '已取消'
    };
    return labels[status] || status;
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      'ceo': 'CEO',
      'manager': '经理',
      'employee': '员工'
    };
    return roles[role] || role;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatCost = (cost: number) => {
    return cost.toFixed(4);
  };
  
  const handleDoubleClick = (decision: Decision) => {
    setSelectedDecision(decision);
    setShowVoteModal(true);
  };
  
  const getVoteTypeLabel = (voteType: string) => {
    switch (voteType) {
      case 'for':
        return '支持';
      case 'against':
        return '反对';
      case 'abstain':
        return '弃权';
      default:
        return voteType;
    }
  };
  
  const getVoteTypeColor = (voteType: string) => {
    switch (voteType) {
      case 'for':
        return 'bg-green-100 text-green-800';
      case 'against':
        return 'bg-red-100 text-red-800';
      case 'abstain':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">决策历史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">决策历史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
          <Button onClick={loadDecisions} size="sm" className="mt-2">
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>决策历史</span>
        </CardTitle>
        <CardDescription>
          AI智能决策记录与执行状态
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {decisions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              暂无决策记录
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {decisions.map((decision) => (
                <div
                  key={decision.id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors cursor-pointer"
                  onDoubleClick={() => handleDoubleClick(decision)}
                  title="双击查看详细投票情况"
                >
                  {/* 决策头部信息 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary"
                        className={getDecisionTypeColor(decision.decision_type)}
                      >
                        {getDecisionTypeLabel(decision.decision_type)}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(decision.status)}
                        <span className="text-xs text-muted-foreground">
                          {getStatusLabel(decision.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{getRoleLabel(decision.employee_role)}</span>
                    </div>
                  </div>
                  
                  {/* 决策内容 */}
                  <div className="text-sm">
                    <p className="line-clamp-3">{decision.content}</p>
                  </div>
                  
                  {/* 决策指标 */}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>重要度: {decision.importance}/3</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>紧急度: {decision.urgency}/3</span>
                    </div>
                    {decision.ai_provider && (
                      <div className="flex items-center space-x-1">
                        <Brain className="h-3 w-3" />
                        <span>{decision.ai_provider}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 投票信息（去中心化公司） */}
                  {decision.votes_for !== undefined && (
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-green-600">
                        支持: {decision.votes_for}
                      </span>
                      <span className="text-red-600">
                        反对: {decision.votes_against}
                      </span>
                      {decision.vote_result && (
                        <Badge variant="outline" className="text-xs">
                          {decision.vote_result === 'approved' ? '通过' : 
                           decision.vote_result === 'rejected' ? '拒绝' : '平票'}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* 时间和成本 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDateTime(decision.created_at)}</span>
                    {decision.cost && decision.cost > 0 && (
                      <span>成本: ${formatCost(decision.cost)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      {/* 投票详情模态框 */}
      {showVoteModal && selectedDecision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowVoteModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">决策信息</h3>
              <button 
                onClick={() => setShowVoteModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 决策信息 */}
              <div>
                <h4 className="font-medium text-base text-gray-700 mb-3">决策信息</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-2"><span className="font-medium text-gray-700">类型:</span> <span className="ml-2">{getDecisionTypeLabel(selectedDecision.decision_type)}</span></div>
                  <div className="mb-2"><span className="font-medium text-gray-700">员工:</span> <span className="ml-2">{selectedDecision.employee_name} ({getRoleLabel(selectedDecision.employee_role)})</span></div>
                  <div><span className="font-medium text-gray-700">时间:</span> <span className="ml-2">{formatDateTime(selectedDecision.created_at)}</span></div>
                </div>
              </div>
              
              {/* 决策内容 */}
              <div>
                <h4 className="font-medium text-base text-gray-700 mb-3">决策内容</h4>
                <div className="bg-blue-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                  <div className="whitespace-pre-wrap">{selectedDecision.content}</div>
                </div>
              </div>
              
              {/* 投票统计 */}
              <div>
                <h4 className="font-medium text-base text-gray-700 mb-3">投票统计</h4>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-green-600 font-bold text-2xl">{selectedDecision.votes_for || 0}</div>
                    <div className="text-green-600 text-sm font-medium">支持</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-red-600 font-bold text-2xl">{selectedDecision.votes_against || 0}</div>
                    <div className="text-red-600 text-sm font-medium">反对</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-gray-600 font-bold text-2xl">{selectedDecision.abstentions || 0}</div>
                    <div className="text-gray-600 text-sm font-medium">弃权</div>
                  </div>
                </div>
                
                {/* 投票结果 */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-700">结果: </span>
                      <span className="font-bold text-lg">
                        {selectedDecision.vote_result === 'approved' ? '通过' : 
                         selectedDecision.vote_result === 'rejected' ? '被拒绝' : 
                         selectedDecision.vote_result === 'tied' ? '平票' : '无投票'}
                      </span>
                    </div>
                    {selectedDecision.approval_rate !== undefined && (
                      <div className="text-gray-600 font-medium">
                        通过率: {(selectedDecision.approval_rate * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 投票人详情 */}
              {selectedDecision.vote_details && Object.keys(selectedDecision.vote_details).length > 0 && (
                <div>
                  <h4 className="font-medium text-base text-gray-700 mb-3">投票人详情</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedDecision.vote_details).map(([employeeId, voteType]) => {
                      const employee = employees[employeeId];
                      return (
                        <div key={employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{employee?.name || employeeId}</span>
                            <span className="text-gray-500 ml-2 text-sm">({employee?.role || '未知'})</span>
                          </div>
                          <span className={`font-bold px-2 py-1 rounded text-sm ${getVoteTypeColor(voteType)}`}>
                            {getVoteTypeLabel(voteType)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* 无投票信息 */}
              {(!selectedDecision.vote_details || Object.keys(selectedDecision.vote_details).length === 0) && (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <div className="text-gray-500 text-sm font-medium">该决策暂无投票记录</div>
                  <div className="text-gray-400 text-xs mt-1">可能是非协作决策或尚未开始投票</div>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <button 
                onClick={() => setShowVoteModal(false)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
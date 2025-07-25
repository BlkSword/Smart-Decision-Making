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
  vote_result?: string;
}

interface DecisionPanelProps {
  companyId: string;
}

export function DecisionPanel({ companyId }: DecisionPanelProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDecisions();
  }, [companyId]);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/decisions?company_id=${companyId}&limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        setDecisions(data);
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
                  className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
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
    </Card>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Building, 
  Users, 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Target, 
  Activity,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: 'ceo' | 'manager' | 'employee';
  status: 'active' | 'thinking' | 'deciding' | 'idle';
  company_id: string;
  performance: number;
  decisions_made: number;
  success_rate: number;
  current_task?: string;
  last_activity: string;
}

interface Decision {
  id: string;
  type: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'tied';
  employee_id: string;
  company_id: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  impact_score: number;
  votes_for: number;
  votes_against: number;
  abstentions: number;
  vote_result: string;
  approval_rate: number;
}

interface Company {
  id: string;
  name: string;
  type: 'centralized' | 'decentralized';
  funds: number;
  size: number;
  status: 'active' | 'inactive';
  employees: Employee[];
  performance_score: number;
  market_share: number;
  growth_rate: number;
  active_decisions: number;
  total_decisions: number;
  success_rate: number;
}

interface CompanyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({
  isOpen,
  onClose,
  companyId
}) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // 模拟数据加载
  useEffect(() => {
    if (isOpen && companyId) {
      loadCompanyDetails();
    }
  }, [isOpen, companyId]);

  const loadCompanyDetails = async () => {
    if (!companyId) return;
    
    setLoading(true);
    
    try {
      // 获取公司详情
      const companyResponse = await fetch(`/api/companies/${companyId}`);
      if (!companyResponse.ok) {
        if (companyResponse.status === 404) {
          throw new Error('公司不存在');
        }
        throw new Error(`获取公司信息失败: ${companyResponse.status}`);
      }
      
      const companyData = await companyResponse.json();
      
      // 获取公司员工
      const employeesResponse = await fetch(`/api/employees?company_id=${companyId}`);
      const employeesData = employeesResponse.ok ? await employeesResponse.json() : [];
      
      // 构建完整的公司数据
      const company: Company = {
        id: companyData.id,
        name: companyData.name,
        type: companyData.company_type,
        funds: companyData.funds,
        size: companyData.size,
        status: companyData.is_active ? 'active' : 'inactive',
        employees: employeesData.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          role: emp.role,
          status: emp.status || 'active',
          company_id: emp.company_id,
          performance: emp.performance || 0,
          decisions_made: emp.decisions_made || 0,
          success_rate: emp.success_rate || 0,
          current_task: emp.current_task || '待分配',
          last_activity: emp.updated_at || new Date().toISOString()
        })),
        performance_score: companyData.productivity * 100,
        market_share: Math.floor(Math.random() * 50) + 10, // 可以后续添加到数据库
        growth_rate: Math.floor(Math.random() * 20) + 5, // 可以后续添加到数据库
        active_decisions: 0, // 将通过决策数据计算
        total_decisions: 0, // 将通过决策数据计算
        success_rate: 0 // 将通过决策数据计算
      };
      
      setCompany(company);
      
      // 获取公司相关决策
      const decisionsResponse = await fetch(`/api/simulation/decisions?company_id=${companyId}`);
      if (decisionsResponse.ok) {
        const decisionsData = await decisionsResponse.json();
        
        // 确保 decisions 数组存在
        const decisionsArray = Array.isArray(decisionsData.decisions) ? decisionsData.decisions : [];
        
        const decisions: Decision[] = decisionsArray.map((decision: any) => {
          // 根据投票结果确定决策状态
          let finalStatus = 'pending'; // 默认状态设为待处理
          
          // 如果有投票数据，根据投票结果决定状态
          if (decision && decision.vote_result) {
            const voteResult = decision.vote_result;
            if (voteResult === 'approved') {
              finalStatus = 'approved';
            } else if (voteResult === 'rejected') {
              finalStatus = 'rejected';
            } else if (voteResult === 'tied') {
              finalStatus = 'tied';
            }
          }
          
          return {
            id: decision.id || Math.random().toString(36).substr(2, 9),
            type: decision.decision_type || '未知类型',
            content: decision.content || '无内容',
            status: finalStatus,
            employee_id: decision.employee_id || '',
            company_id: decision.company_id || companyId,
            timestamp: decision.created_at || new Date().toISOString(),
            priority: decision.importance > 2 ? 'high' : decision.importance > 1 ? 'medium' : 'low',
            impact_score: decision.impact_score || 0,
            votes_for: decision.votes_for || 0,
            votes_against: decision.votes_against || 0,
            abstentions: decision.abstentions || 0,
            vote_result: decision.vote_result || 'no_votes',
            approval_rate: decision.approval_rate || 0
          };
        });
        
        setDecisions(decisions);
        
        // 更新公司的决策统计
        const activeDecisions = decisions.filter(d => d.status === 'pending').length;
        const totalDecisions = decisions.length;
        const successfulDecisions = decisions.filter(d => d.status === 'approved').length;
        const successRate = totalDecisions > 0 ? Math.round((successfulDecisions / totalDecisions) * 100) : 0;
        
        setCompany(prev => prev ? {
          ...prev,
          active_decisions: activeDecisions,
          total_decisions: totalDecisions,
          success_rate: successRate
        } : null);
      } else {
        console.error('Error fetching decisions:', decisionsResponse.status);
        setDecisions([]);
      }
      
    } catch (error) {
      console.error('Error loading company details:', error);
      // 不在这里显示错误，就让用户知道加载失败即可
      setCompany(null);
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="w-4 h-4 text-green-500" />;
      case 'thinking':
        return <Brain className="w-4 h-4 text-blue-500" />;
      case 'deciding':
        return <Target className="w-4 h-4 text-orange-500" />;
      case 'idle':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'thinking':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'deciding':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'idle':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDecisionStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'tied':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}秒前`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}分钟前`;
    } else {
      return `${Math.floor(diffSeconds / 3600)}小时前`;
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>加载中</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">加载公司详情...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!company) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>错误</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-500">公司数据加载失败</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            {company.name} - 详细信息
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="employees">员工详情</TabsTrigger>
            <TabsTrigger value="decisions">决策历史</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 基本信息 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">公司类型</span>
                    <Badge variant="outline">
                      {company.type === 'centralized' ? '集权型' : '去中心化'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">资金</span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <AnimatedNumber 
                        value={company.funds} 
                        formatValue={(value) => value.toLocaleString()}
                      />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">规模</span>
                    <span>{company.size}人</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">状态</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(company.status)}
                      <Badge className={getStatusColor(company.status)}>
                        {company.status === 'active' ? '活跃' : '不活跃'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 性能指标 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">性能指标</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>绩效评分</span>
                      <span>{company.performance_score}%</span>
                    </div>
                    <Progress value={company.performance_score} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>市场份额</span>
                      <span>{company.market_share}%</span>
                    </div>
                    <Progress value={company.market_share} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>增长率</span>
                      <span>{company.growth_rate}%</span>
                    </div>
                    <Progress value={company.growth_rate} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>成功率</span>
                      <span>{company.success_rate}%</span>
                    </div>
                    <Progress value={company.success_rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 决策统计 */}
            <Card>
              <CardHeader>
                <CardTitle>决策统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      <AnimatedNumber value={company.active_decisions} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      活跃决策
                    </p>

                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      <AnimatedNumber value={company.total_decisions} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      总决策数
                    </p>

                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      <AnimatedNumber 
                        value={company.success_rate} 
                        suffix="%"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">成功率</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="employees" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {company.employees.length > 0 ? (
                  company.employees.map((employee) => (
                    <Card key={employee.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(employee.status)}
                              <div>
                                <div className="font-medium">{employee.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {employee.role === 'ceo' ? 'CEO' : 
                                   employee.role === 'manager' ? '经理' : '员工'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(employee.status)}>
                              {employee.status === 'active' ? '活跃' :
                               employee.status === 'thinking' ? '思考中' :
                               employee.status === 'deciding' ? '决策中' : '空闲'}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">绩效：</span>
                            <span className="font-medium">{employee.performance}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">决策数：</span>
                            <span className="font-medium">{employee.decisions_made}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">成功率：</span>
                            <span className="font-medium">{employee.success_rate}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">当前任务：</span>
                            <span className="font-medium">{employee.current_task}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          最后活动：{formatTime(employee.last_activity)}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无员工数据
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="decisions" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {decisions.length > 0 ? (
                  decisions.map((decision) => (
                    <Card key={decision.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{decision.type}</Badge>
                              <Badge className={getPriorityColor(decision.priority)}>
                                {decision.priority === 'high' ? '高优先级' :
                                 decision.priority === 'medium' ? '中优先级' : '低优先级'}
                              </Badge>
                            </div>
                            <div className="text-sm mb-2">{decision.content}</div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>{formatTime(decision.timestamp)} • 影响分数: {decision.impact_score}</div>
                              {(decision.votes_for > 0 || decision.votes_against > 0 || decision.abstentions > 0) && (
                                <div className="flex items-center gap-4">
                                  <span className="text-green-600">支持: {decision.votes_for}</span>
                                  <span className="text-red-600">反对: {decision.votes_against}</span>
                                  {decision.abstentions > 0 && (
                                    <span className="text-gray-600">弃权: {decision.abstentions}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getDecisionStatusIcon(decision.status)}
                            <Badge variant="outline">
                              {decision.status === 'pending' ? '待处理' :
                               decision.status === 'approved' ? '已批准' : 
                               decision.status === 'rejected' ? '已拒绝' : 
                               decision.status === 'tied' ? '平票' : '未知状态'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无决策历史
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
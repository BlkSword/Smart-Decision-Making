'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  status: 'pending' | 'approved' | 'rejected';
  employee_id: string;
  company_id: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  impact_score: number;
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
    setLoading(true);
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 模拟公司数据
    const mockCompany: Company = {
      id: companyId,
      name: companyId === 'comp1' ? '科技创新公司' : '数据科技',
      type: companyId === 'comp1' ? 'centralized' : 'decentralized',
      funds: Math.floor(Math.random() * 100000) + 50000,
      size: Math.floor(Math.random() * 50) + 20,
      status: 'active',
      employees: [
        {
          id: 'emp1',
          name: '张CEO',
          role: 'ceo',
          status: 'thinking',
          company_id: companyId,
          performance: 92,
          decisions_made: 45,
          success_rate: 87,
          current_task: '分析市场战略',
          last_activity: new Date(Date.now() - 5000).toISOString()
        },
        {
          id: 'emp2',
          name: '李经理',
          role: 'manager',
          status: 'active',
          company_id: companyId,
          performance: 88,
          decisions_made: 32,
          success_rate: 79,
          current_task: '产品开发规划',
          last_activity: new Date(Date.now() - 12000).toISOString()
        },
        {
          id: 'emp3',
          name: '王员工',
          role: 'employee',
          status: 'deciding',
          company_id: companyId,
          performance: 75,
          decisions_made: 18,
          success_rate: 83,
          current_task: '技术方案评估',
          last_activity: new Date(Date.now() - 8000).toISOString()
        }
      ],
      performance_score: 85,
      market_share: 23,
      growth_rate: 12,
      active_decisions: 3,
      total_decisions: 95,
      success_rate: 82
    };

    // 模拟决策数据
    const mockDecisions: Decision[] = [
      {
        id: 'dec1',
        type: '产品决策',
        content: '增加AI功能模块的研发投入',
        status: 'pending',
        employee_id: 'emp1',
        company_id: companyId,
        timestamp: new Date(Date.now() - 30000).toISOString(),
        priority: 'high',
        impact_score: 85
      },
      {
        id: 'dec2',
        type: '市场策略',
        content: '扩大海外市场布局',
        status: 'approved',
        employee_id: 'emp2',
        company_id: companyId,
        timestamp: new Date(Date.now() - 120000).toISOString(),
        priority: 'medium',
        impact_score: 72
      },
      {
        id: 'dec3',
        type: '技术投资',
        content: '购买先进的云计算基础设施',
        status: 'rejected',
        employee_id: 'emp3',
        company_id: companyId,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        priority: 'low',
        impact_score: 45
      }
    ];

    setCompany(mockCompany);
    setDecisions(mockDecisions);
    setLoading(false);
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
                      {company.funds.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">规模</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {company.size} 人
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">状态</span>
                    <Badge className={getStatusColor(company.status)}>
                      {company.status === 'active' ? '活跃' : '非活跃'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              {/* 性能指标 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">性能指标</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">综合评分</span>
                      <span className="text-sm font-medium">{company.performance_score}%</span>
                    </div>
                    <Progress value={company.performance_score} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">市场份额</span>
                      <span className="text-sm font-medium">{company.market_share}%</span>
                    </div>
                    <Progress value={company.market_share} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">增长率</span>
                      <span className="text-sm font-medium flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {company.growth_rate}%
                      </span>
                    </div>
                    <Progress value={company.growth_rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 决策统计 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">决策统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {company.active_decisions}
                    </div>
                    <div className="text-sm text-muted-foreground">进行中</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {company.total_decisions}
                    </div>
                    <div className="text-sm text-muted-foreground">总决策数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {company.success_rate}%
                    </div>
                    <div className="text-sm text-muted-foreground">成功率</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {company.employees.length}
                    </div>
                    <div className="text-sm text-muted-foreground">AI Agent</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="employees" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {company.employees.map((employee) => (
                  <Card key={employee.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(employee.status)}
                            <span className="font-medium">{employee.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {employee.role === 'ceo' ? 'CEO' : 
                             employee.role === 'manager' ? '经理' : '员工'}
                          </Badge>
                          <Badge className={getStatusColor(employee.status)}>
                            {employee.status === 'active' ? '活跃' :
                             employee.status === 'thinking' ? '思考中' :
                             employee.status === 'deciding' ? '决策中' : '空闲'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(employee.last_activity)}
                        </div>
                      </div>
                      
                      {employee.current_task && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-muted-foreground">当前任务：</span>
                          <span className="text-sm ml-1">{employee.current_task}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">绩效</div>
                          <div className="font-medium">{employee.performance}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">决策数</div>
                          <div className="font-medium">{employee.decisions_made}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">成功率</div>
                          <div className="font-medium">{employee.success_rate}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="decisions" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {decisions.map((decision) => (
                  <Card key={decision.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getDecisionStatusIcon(decision.status)}
                          <span className="font-medium">{decision.type}</span>
                          <Badge className={getPriorityColor(decision.priority)}>
                            {decision.priority === 'high' ? '高优先级' :
                             decision.priority === 'medium' ? '中优先级' : '低优先级'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(decision.timestamp)}
                        </div>
                      </div>
                      
                      <p className="text-sm mb-3">{decision.content}</p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            发起人：{company.employees.find(e => e.id === decision.employee_id)?.name}
                          </span>
                          <span className="text-muted-foreground">
                            影响分：{decision.impact_score}
                          </span>
                        </div>
                        <Badge variant="outline">
                          {decision.status === 'pending' ? '待处理' :
                           decision.status === 'approved' ? '已批准' : '已拒绝'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
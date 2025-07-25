'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  Building, 
  TrendingUp, 
  Activity, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Zap,
  Target,
  DollarSign,
  Filter,
  Search,
  Calendar,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  type: 'centralized' | 'decentralized';
  funds: number;
  employees: Employee[];
  status: 'active' | 'inactive';
}

interface Employee {
  id: string;
  name: string;
  role: 'ceo' | 'manager' | 'employee';
  company_id: string;
  status: 'active' | 'thinking' | 'deciding' | 'idle';
}

interface Decision {
  id: string;
  company_id: string;
  employee_id: string;
  type: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

interface TimelineEvent {
  id: string;
  type: 'decision' | 'communication' | 'funding' | 'action' | 'round_start' | 'game_reset';
  company_id?: string;
  employee_id?: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  data?: any;
}

interface TimelineScreenProps {
  companies: Company[];
  decisions: Decision[];
  wsEvents: any[];
}

const TimelineScreen: React.FC<TimelineScreenProps> = ({
  companies = [],
  decisions = [],
  wsEvents = []
}) => {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 处理WebSocket事件转换为时间线事件
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    
    // 处理WebSocket事件
    wsEvents.forEach(event => {
      if (event.type && event.description) {
        events.push({
          id: event.id || `ws_${Date.now()}_${Math.random()}`,
          type: event.type,
          company_id: event.company_id,
          employee_id: event.employee_id,
          description: event.description,
          timestamp: event.timestamp || new Date().toISOString(),
          severity: event.severity || 'info',
          data: event.data
        });
      }
    });
    
    // 处理决策
    decisions.forEach(decision => {
      const company = companies.find(c => c.id === decision.company_id);
      const employee = company?.employees.find(e => e.id === decision.employee_id);
      
      events.push({
        id: `decision_${decision.id}`,
        type: 'decision',
        company_id: decision.company_id,
        employee_id: decision.employee_id,
        description: `${employee?.name || '未知员工'} 在 ${company?.name || '未知公司'} 做出决策: ${decision.content}`,
        timestamp: decision.timestamp,
        severity: decision.status === 'approved' ? 'success' : decision.status === 'rejected' ? 'error' : 'info',
        data: decision
      });
    });
    
    // 过滤和排序
    let filteredEvents = events;
    
    // 公司过滤
    if (selectedCompany) {
      filteredEvents = filteredEvents.filter(event => event.company_id === selectedCompany);
    }
    
    // 类型过滤
    if (!selectedFilters.includes('all')) {
      filteredEvents = filteredEvents.filter(event => selectedFilters.includes(event.type));
    }
    
    // 搜索过滤
    if (searchTerm) {
      filteredEvents = filteredEvents.filter(event => 
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 时间范围过滤
    if (timeRange !== 'all') {
      const now = new Date();
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
      const cutoff = new Date(now.getTime() - (hours * 60 * 60 * 1000));
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) >= cutoff
      );
    }
    
    // 按时间排序（最新的在前）
    return filteredEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [companies, decisions, wsEvents, selectedFilters, searchTerm, selectedCompany, timeRange]);

  // 公司统计
  const companyStats = useMemo(() => {
    return companies.map(company => {
      const companyEvents = timelineEvents.filter(event => event.company_id === company.id);
      const recentDecisions = companyEvents.filter(event => 
        event.type === 'decision' && 
        new Date(event.timestamp) > new Date(Date.now() - 30 * 60 * 1000)
      ).length;
      
      return {
        ...company,
        eventCount: companyEvents.length,
        recentDecisions
      };
    });
  }, [companies, timelineEvents]);

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'decision': return <Target className="w-4 h-4" />;
      case 'funding': return <DollarSign className="w-4 h-4" />;
      case 'communication': return <Users className="w-4 h-4" />;
      case 'action': return <Zap className="w-4 h-4" />;
      case 'round_start': return <Clock className="w-4 h-4" />;
      case 'game_reset': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'border-green-500 bg-green-50';
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* 顶部控制面板 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">AI商战时间线</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className="w-4 h-4 mr-1" />
                {autoRefresh ? '实时更新' : '手动更新'}
              </Button>
            </div>
          </div>
          
          {/* 过滤器和搜索 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 事件类型过滤 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">事件类型</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'decision', 'funding', 'communication', 'action'].map(type => (
                  <Button
                    key={type}
                    variant={selectedFilters.includes(type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (type === 'all') {
                        setSelectedFilters(['all']);
                      } else {
                        setSelectedFilters(prev => 
                          prev.includes(type) 
                            ? prev.filter(f => f !== type)
                            : [...prev.filter(f => f !== 'all'), type]
                        );
                      }
                    }}
                  >
                    {type === 'all' ? '全部' : 
                     type === 'decision' ? '决策' :
                     type === 'funding' ? '资金' :
                     type === 'communication' ? '沟通' : '行动'}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* 公司过滤 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">公司</label>
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(e.target.value || null)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">全部公司</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 时间范围 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">时间范围</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">全部时间</option>
                <option value="1h">最近1小时</option>
                <option value="6h">最近6小时</option>
                <option value="24h">最近24小时</option>
              </select>
            </div>
            
            {/* 搜索 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索事件..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 公司概览 */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  公司概览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companyStats.map(company => (
                    <div
                      key={company.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedCompany === company.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                      onClick={() => setSelectedCompany(selectedCompany === company.id ? null : company.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{company.name}</h3>
                        <Badge variant={company.type === 'centralized' ? 'default' : 'secondary'}>
                          {company.type === 'centralized' ? '集权' : '去中心化'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${company.funds.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {company.employees.length}人
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {company.eventCount}事件
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {company.recentDecisions}新决策
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 时间线主体 */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  事件时间线
                  <Badge variant="outline" className="ml-2">
                    {timelineEvents.length} 事件
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[calc(100vh-400px)] overflow-y-auto">
                  {timelineEvents.length > 0 ? (
                    <div className="space-y-4">
                      {timelineEvents.map((event, index) => {
                        const isExpanded = expandedEvents.has(event.id);
                        const company = companies.find(c => c.id === event.company_id);
                        const employee = company?.employees.find(e => e.id === event.employee_id);
                        
                        return (
                          <div key={event.id} className="relative">
                            {/* 时间线连接线 */}
                            {index < timelineEvents.length - 1 && (
                              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300"></div>
                            )}
                            
                            {/* 事件卡片 */}
                            <div className={`flex items-start gap-4 p-4 rounded-lg border-l-4 ${getSeverityColor(event.severity)}`}>
                              {/* 事件图标 */}
                              <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center">
                                {getEventIcon(event.type)}
                              </div>
                              
                              {/* 事件内容 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {event.type === 'decision' ? '决策' :
                                       event.type === 'funding' ? '资金' :
                                       event.type === 'communication' ? '沟通' :
                                       event.type === 'action' ? '行动' :
                                       event.type === 'round_start' ? '轮次开始' :
                                       event.type === 'game_reset' ? '游戏重置' : '其他'}
                                    </Badge>
                                    {company && (
                                      <Badge variant="secondary" className="text-xs">
                                        {company.name}
                                      </Badge>
                                    )}
                                    {employee && (
                                      <Badge variant="outline" className="text-xs">
                                        {employee.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatTimestamp(event.timestamp)}
                                  </div>
                                </div>
                                
                                <p className="text-sm text-gray-900 mb-2">{event.description}</p>
                                
                                {event.data && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleEventExpansion(event.id)}
                                    className="text-xs"
                                  >
                                    {isExpanded ? (
                                      <><ChevronDown className="w-3 h-3 mr-1" />收起详情</>
                                    ) : (
                                      <><ChevronRight className="w-3 h-3 mr-1" />展开详情</>
                                    )}
                                  </Button>
                                )}
                                
                                {isExpanded && event.data && (
                                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                      {JSON.stringify(event.data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">暂无事件记录</p>
                      <p className="text-sm text-gray-400 mt-2">请启动模拟系统开始记录事件</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineScreen;
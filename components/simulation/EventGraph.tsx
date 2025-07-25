'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Network, 
  Zap, 
  Clock, 
  TrendingUp, 
  Users, 
  Building, 
  Brain, 
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Calendar,
  Activity
} from 'lucide-react';

interface CompanyEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface CompanyDecision {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  approval_rate?: number;
}

interface CompanyProgress {
  id: string;
  name: string;
  type: 'centralized' | 'decentralized';
  isActive: boolean;
  funds: number;
  events: CompanyEvent[];
  decisions: CompanyDecision[];
  x: number;
  y: number;
}

interface EventGraphProps {
  companyId?: string;
  autoUpdate?: boolean;
  showControls?: boolean;
  height?: number;
}

export const EventGraph: React.FC<EventGraphProps> = ({
  companyId,
  autoUpdate = true,
  showControls = true,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [companies, setCompanies] = useState<CompanyProgress[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyProgress | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CompanyEvent | CompanyDecision | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 鼠标拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });

  // 获取数据
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [companiesRes, eventsRes, decisionsRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/simulation/events?limit=50'),
        fetch('/api/simulation/decisions?limit=50')
      ]);
      
      if (!companiesRes.ok || !eventsRes.ok || !decisionsRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const companiesData = await companiesRes.json();
      const eventsData = await eventsRes.json();
      const decisionsData = await decisionsRes.json();
      
      const companies = companiesData || [];
      const events = eventsData.events || eventsData || [];
      const decisions = decisionsData.decisions || decisionsData || [];
      
      // 转换为进度视图格式
      const progressData = companies.map((company: any, index: number) => {
        const companyEvents = events
          .filter((event: any) => event.company_id === company.id)
          .slice(0, 10) // 限制事件数量
          .map((event: any) => ({
            id: event.id,
            type: event.type || 'event',
            title: event.type || 'Event',
            description: event.description || 'No description',
            timestamp: event.timestamp,
            status: 'completed' as const,
            priority: (event.severity || 'low') as any
          }));
          
        const companyDecisions = decisions
          .filter((decision: any) => decision.company_id === company.id)
          .slice(0, 10) // 限制决策数量
          .map((decision: any) => ({
            id: decision.id,
            type: decision.decision_type || 'decision',
            title: decision.decision_type || 'Decision',
            description: decision.content ? decision.content.substring(0, 80) + '...' : 'No description',
            timestamp: decision.created_at,
            status: decision.vote_result === 'approved' ? 'approved' : 
                   decision.vote_result === 'rejected' ? 'rejected' : 'pending' as any,
            priority: decision.importance > 2 ? 'high' : decision.importance > 1 ? 'medium' : 'low' as any,
            approval_rate: decision.approval_rate || 0
          }));
        
        return {
          id: company.id,
          name: company.name,
          type: company.company_type,
          isActive: company.is_active,
          funds: company.funds || 0,
          events: companyEvents,
          decisions: companyDecisions,
          x: 100 + index * 300, // 水平分布
          y: 200 // 固定垂直位置
        };
      });
      
      setCompanies(progressData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // 鼠标事件处理
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setLastPan({ x: panX, y: panY });
  }, [panX, panY]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    
    setPanX(lastPan.x + deltaX);
    setPanY(lastPan.y + deltaY);
  }, [isDragging, dragStart, lastPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(3, prev * zoomFactor)));
  }, []);

  // 控制函数
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev * 0.8, 0.1));
  const handleReset = () => {
    setScale(1);
    setPanX(0);
    setPanY(0);
    setSelectedCompany(null);
    setSelectedEvent(null);
  };

  // 节点点击处理
  const handleCompanyClick = (company: CompanyProgress) => {
    setSelectedCompany(company);
  };

  const handleEventClick = (event: CompanyEvent | CompanyDecision) => {
    setSelectedEvent(event);
  };

  // 获取事件/决策的颜色
  const getItemColor = (item: CompanyEvent | CompanyDecision, type: 'event' | 'decision') => {
    if (type === 'decision') {
      const decision = item as CompanyDecision;
      switch (decision.status) {
        case 'approved': return '#22c55e';
        case 'rejected': return '#ef4444';
        case 'completed': return '#3b82f6';
        default: return '#f59e0b';
      }
    } else {
      switch (item.status) {
        case 'completed': return '#22c55e';
        case 'active': return '#3b82f6';
        case 'failed': return '#ef4444';
        default: return '#6b7280';
      }
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  // 初始化
  useEffect(() => {
    fetchData();
    
    if (autoUpdate) {
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [companyId, autoUpdate]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            公司事件进度视图
          </CardTitle>
          <CardDescription>交互式公司事件进度展示</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">加载进度数据...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            公司事件进度视图
          </CardTitle>
          <CardDescription>交互式公司事件进度展示</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline">
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              公司事件进度视图
            </CardTitle>
            <CardDescription>
              拖动查看、缩放交互的公司事件与决策进度展示
            </CardDescription>
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAnimating(!isAnimating)}
              >
                {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MousePointer2 className="h-4 w-4" />
          <span>鼠标拖动平移，滚轮缩放，点击查看详情</span>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 主视图区域 */}
          <div className="lg:col-span-3">
            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-hidden cursor-move"
              style={{ height: `${height}px` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`${-panX} ${-panY} ${800 / scale} ${600 / scale}`}
                className="bg-gradient-to-br from-blue-50 to-indigo-50"
              >
                {/* 背景网格 */}
                <defs>
                  <pattern id="progressGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#progressGrid)" />
                
                {/* 时间轴 */}
                <line 
                  x1="50" 
                  y1="150" 
                  x2={companies.length * 300} 
                  y2="150" 
                  stroke="#94a3b8" 
                  strokeWidth="2"
                />
                
                {/* 公司进度线 */}
                {companies.map((company, companyIndex) => {
                  const companyX = company.x;
                  const companyY = company.y;
                  
                  return (
                    <g key={company.id}>
                      {/* 公司节点 */}
                      <g 
                        className="cursor-pointer"
                        onClick={() => handleCompanyClick(company)}
                      >
                        {/* 公司背景圆 */}
                        <circle
                          cx={companyX}
                          cy={companyY}
                          r="35"
                          fill={company.type === 'centralized' ? '#3b82f6' : '#10b981'}
                          opacity={company.isActive ? 1 : 0.6}
                          stroke={selectedCompany?.id === company.id ? '#f59e0b' : 'none'}
                          strokeWidth={selectedCompany?.id === company.id ? 3 : 0}
                          className={isAnimating ? 'animate-pulse' : ''}
                        />
                        
                        {/* 公司图标 */}
                        <text
                          x={companyX}
                          y={companyY + 5}
                          textAnchor="middle"
                          fontSize="20"
                          fill="white"
                          className="pointer-events-none select-none"
                        >
                          🏢
                        </text>
                        
                        {/* 公司名称 */}
                        <text
                          x={companyX}
                          y={companyY + 55}
                          textAnchor="middle"
                          fontSize="14"
                          fontWeight="bold"
                          fill="#1e293b"
                          className="pointer-events-none select-none"
                        >
                          {company.name}
                        </text>
                        
                        {/* 资金信息 */}
                        <text
                          x={companyX}
                          y={companyY + 75}
                          textAnchor="middle"
                          fontSize="12"
                          fill="#64748b"
                          className="pointer-events-none select-none"
                        >
                          ¥{company.funds.toLocaleString()}
                        </text>
                      </g>
                      
                      {/* 事件和决策时间线 */}
                      <g>
                        {/* 事件 */}
                        {company.events.map((event, eventIndex) => {
                          const eventX = companyX - 100 + eventIndex * 15;
                          const eventY = companyY + 120;
                          
                          return (
                            <g key={event.id}>
                              <circle
                                cx={eventX}
                                cy={eventY}
                                r="8"
                                fill={getItemColor(event, 'event')}
                                className="cursor-pointer hover:r-10 transition-all"
                                onClick={() => handleEventClick(event)}
                              />
                              <text
                                x={eventX}
                                y={eventY + 20}
                                textAnchor="middle"
                                fontSize="8"
                                fill="#64748b"
                                className="pointer-events-none select-none"
                              >
                                {formatTime(event.timestamp).split(' ')[1]}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* 决策 */}
                        {company.decisions.map((decision, decisionIndex) => {
                          const decisionX = companyX - 100 + decisionIndex * 15;
                          const decisionY = companyY + 170;
                          
                          return (
                            <g key={decision.id}>
                              <rect
                                x={decisionX - 8}
                                y={decisionY - 8}
                                width="16"
                                height="16"
                                rx="2"
                                fill={getItemColor(decision, 'decision')}
                                className="cursor-pointer hover:opacity-80 transition-all"
                                onClick={() => handleEventClick(decision)}
                              />
                              <text
                                x={decisionX}
                                y={decisionY + 20}
                                textAnchor="middle"
                                fontSize="8"
                                fill="#64748b"
                                className="pointer-events-none select-none"
                              >
                                {formatTime(decision.timestamp).split(' ')[1]}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* 连接线 */}
                        <line
                          x1={companyX - 100}
                          y1={companyY + 120}
                          x2={companyX + 100}
                          y2={companyY + 120}
                          stroke="#e2e8f0"
                          strokeWidth="2"
                        />
                        <line
                          x1={companyX - 100}
                          y1={companyY + 170}
                          x2={companyX + 100}
                          y2={companyY + 170}
                          stroke="#e2e8f0"
                          strokeWidth="2"
                        />
                      </g>
                      
                      {/* 标签 */}
                      <text
                        x={companyX - 120}
                        y={companyY + 125}
                        fontSize="12"
                        fontWeight="medium"
                        fill="#475569"
                        className="pointer-events-none select-none"
                      >
                        事件
                      </text>
                      <text
                        x={companyX - 120}
                        y={companyY + 175}
                        fontSize="12"
                        fontWeight="medium"
                        fill="#475569"
                        className="pointer-events-none select-none"
                      >
                        决策
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          
          {/* 详情面板 */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* 选中公司详情 */}
              {selectedCompany && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {selectedCompany.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span>类型</span>
                      <Badge variant={selectedCompany.type === 'centralized' ? 'default' : 'secondary'}>
                        {selectedCompany.type === 'centralized' ? '集权式' : '去中心化'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>状态</span>
                      <Badge variant={selectedCompany.isActive ? 'default' : 'secondary'}>
                        {selectedCompany.isActive ? '活跃' : '非活跃'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>资金</span>
                      <span className="font-medium">¥{selectedCompany.funds.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>事件数</span>
                      <span className="font-medium">{selectedCompany.events.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>决策数</span>
                      <span className="font-medium">{selectedCompany.decisions.length}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* 选中事件/决策详情 */}
              {selectedEvent && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {'approval_rate' in selectedEvent ? <Brain className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                      详情
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">{selectedEvent.title}</h4>
                      <p className="text-xs text-gray-600">{selectedEvent.description}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>状态</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedEvent.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>优先级</span>
                        <Badge 
                          variant={selectedEvent.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {selectedEvent.priority}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>时间</span>
                        <span className="text-xs">{formatTime(selectedEvent.timestamp)}</span>
                      </div>
                      {'approval_rate' in selectedEvent && (
                        <div className="flex justify-between text-xs">
                          <span>支持率</span>
                          <span className="text-xs">{Math.round((selectedEvent.approval_rate || 0) * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* 图例 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">图例说明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <span>集权式公司</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <span>去中心化公司</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                      <span>事件（圆形）</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span>决策（方形）</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* 统计信息 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">统计信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>活跃公司</span>
                    <span className="font-medium text-green-600">
                      {companies.filter(c => c.isActive).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>总事件数</span>
                    <span className="font-medium text-blue-600">
                      {companies.reduce((sum, c) => sum + c.events.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>总决策数</span>
                    <span className="font-medium text-purple-600">
                      {companies.reduce((sum, c) => sum + c.decisions.length, 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventGraph;
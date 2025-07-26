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

interface Employee {
  id: string;
  name: string;
  role: 'ceo' | 'manager' | 'employee';
  company_id: string;
  status?: 'active' | 'thinking' | 'deciding' | 'idle';
}

interface CompanyProgress {
  id: string;
  name: string;
  type: 'centralized' | 'decentralized';
  isActive: boolean;
  funds: number;
  events: CompanyEvent[];
  decisions: CompanyDecision[];
  employees: Employee[];
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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
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

  // 可拖动节点状态
  const [draggingNode, setDraggingNode] = useState<{ type: 'company' | 'employee' | 'event', id: string } | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0 });

  // 获取数据
  const fetchData = async () => {
    try {
      setLoading(true);

      const [companiesRes, eventsRes, decisionsRes, employeesRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/simulation/events?limit=50'),
        fetch('/api/simulation/decisions?limit=50'),
        fetch('/api/employees')
      ]);

      if (!companiesRes.ok || !eventsRes.ok || !decisionsRes.ok || !employeesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const companiesData = await companiesRes.json();
      const eventsData = await eventsRes.json();
      const decisionsData = await decisionsRes.json();
      const employeesData = await employeesRes.json();

      const companies = companiesData || [];
      const events = eventsData.events || eventsData || [];
      const decisions = decisionsData.decisions || decisionsData || [];
      const employees = employeesData || [];

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

        const companyEmployees = employees
          .filter((employee: any) => employee.company_id === company.id)
          .map((employee: any) => ({
            id: employee.id,
            name: employee.name,
            role: employee.role || 'employee',
            company_id: employee.company_id,
            status: 'active' as const
          }));

        return {
          id: company.id,
          name: company.name,
          type: company.company_type,
          isActive: company.is_active,
          funds: company.funds || 0,
          events: companyEvents,
          decisions: companyDecisions,
          employees: companyEmployees,
          x: 400 + index * 500, // 水平分布更宽
          y: 300 // 固定垂直位置
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
    if ((event.target as Element).classList.contains('draggable')) {
      // 如果点击的是可拖动元素，则不处理平移
      return;
    }
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setLastPan({ x: panX, y: panY });
  }, [panX, panY]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;

      setPanX(lastPan.x + deltaX);
      setPanY(lastPan.y + deltaY);
    }

    // 处理节点拖动
    if (draggingNode) {
      setCompanies(prev => prev.map(company => {
        if (draggingNode.type === 'company' && company.id === draggingNode.id) {
          return {
            ...company,
            x: company.x + (event.movementX / scale),
            y: company.y + (event.movementY / scale)
          };
        }
        return company;
      }));
    }
  }, [isDragging, dragStart, lastPan, draggingNode, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggingNode(null);
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
    setSelectedEmployee(null);
  };

  // 节点点击处理
  const handleCompanyClick = (company: CompanyProgress) => {
    setSelectedCompany(company);
    setSelectedEvent(null);
    setSelectedEmployee(null);
  };

  const handleEventClick = (event: CompanyEvent | CompanyDecision) => {
    setSelectedEvent(event);
    setSelectedEmployee(null);
  };

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSelectedEvent(null);
  };

  // 节点拖动处理
  const handleNodeMouseDown = (event: React.MouseEvent, type: 'company' | 'employee' | 'event', id: string) => {
    event.stopPropagation();
    setDraggingNode({ type, id });
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

  // 获取员工角色颜色
  const getEmployeeColor = (role: string) => {
    switch (role) {
      case 'ceo': return '#ef4444';
      case 'manager': return '#f59e0b';
      default: return '#6b7280';
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

  // 对集权式公司的员工进行层级排列
  const arrangeEmployeesForCentralizedCompany = (employees: Employee[], companyX: number, companyY: number) => {
    const arrangedEmployees = [];

    // 找到CEO
    const ceo = employees.find(emp => emp.role === 'ceo');
    if (ceo) {
      arrangedEmployees.push({
        ...ceo,
        x: companyX,
        y: companyY
      });
    }

    // 管理层
    const managers = employees.filter(emp => emp.role === 'manager');
    const regularEmployees = employees.filter(emp => emp.role === 'employee');

    // 计算管理层位置（围绕CEO的第一层圆环）
    const managerRadius = 60;
    managers.forEach((manager, index) => {
      const angle = (index / managers.length) * 2 * Math.PI;
      arrangedEmployees.push({
        ...manager,
        x: companyX + managerRadius * Math.cos(angle),
        y: companyY + managerRadius * Math.sin(angle)
      });
    });

    // 计算普通员工位置（围绕管理层的第二层圆环）
    const employeeRadius = 120;
    regularEmployees.forEach((employee, index) => {
      const angle = (index / regularEmployees.length) * 2 * Math.PI;
      arrangedEmployees.push({
        ...employee,
        x: companyX + employeeRadius * Math.cos(angle),
        y: companyY + employeeRadius * Math.sin(angle)
      });
    });

    return arrangedEmployees;
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
                viewBox={`${-panX} ${-panY} ${1200 / scale} ${800 / scale}`}
                className="bg-gradient-to-br from-blue-50 to-indigo-50"
              >
                {/* 背景网格 */}
                <defs>
                  <pattern id="progressGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.5" />
                  </pattern>

                  {/* 添加动态线路的动画定义 */}
                  <marker id="arrowhead" markerWidth="10" markerHeight="7"
                    refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                  </marker>

                  {/* 定义虚线样式 */}
                  <pattern id="companyPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                    <circle cx="4" cy="4" r="3" fill="none" stroke="#3b82f6" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#progressGrid)" />

                {/* 公司节点 */}
                {companies.map((company, companyIndex) => {
                  const companyX = company.x;
                  const companyY = company.y;
                  const employeeCount = company.employees.length;

                  // 根据公司类型计算员工排列
                  let arrangedEmployees = [];
                  if (company.type === 'centralized') {
                    // 集权式公司按层级排列
                    arrangedEmployees = arrangeEmployeesForCentralizedCompany(company.employees, companyX, companyY);
                  } else {
                    // 去中心化公司按圆形排列
                    const radius = 120;
                    arrangedEmployees = company.employees.map((employee, empIndex) => {
                      const angle = (empIndex / employeeCount) * 2 * Math.PI;
                      return {
                        ...employee,
                        x: companyX + radius * Math.cos(angle),
                        y: companyY + radius * Math.sin(angle)
                      };
                    });
                  }

                  return (
                    <g key={company.id}>
                      {/* 公司虚线环 */}
                      <circle
                        cx={companyX}
                        cy={companyY}
                        r="60"
                        fill="none"
                        stroke={company.type === 'centralized' ? '#3b82f6' : '#10b981'}
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity={company.isActive ? 1 : 0.6}
                        className={isAnimating ? 'animate-pulse' : ''}
                        onClick={() => handleCompanyClick(company)}
                      />

                      {/* 公司名称 */}
                      <text
                        x={companyX}
                        y={companyY - 70}
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="bold"
                        fill="#1e293b"
                        className="pointer-events-none select-none"
                      >
                        {company.name}
                      </text>

                      <text
                        x={companyX}
                        y={companyY - 50}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#1e293b"
                        className="pointer-events-none select-none"
                      >
                        ¥{company.funds.toLocaleString()}
                      </text>

                      {/* 员工节点 */}
                      {arrangedEmployees.map((employee) => {
                        return (
                          <g key={employee.id}>
                            {/* 员工节点 */}
                            <circle
                              cx={employee.x}
                              cy={employee.y}
                              r={employee.role === 'ceo' ? 20 : employee.role === 'manager' ? 15 : 12}
                              fill={getEmployeeColor(employee.role)}
                              stroke={selectedEmployee?.id === employee.id ? '#f59e0b' : '#ffffff'}
                              strokeWidth={selectedEmployee?.id === employee.id ? 3 : 1}
                              onClick={() => handleEmployeeClick(employee)}
                              onMouseDown={(e) => handleNodeMouseDown(e, 'employee', employee.id)}
                              className="draggable cursor-move"
                            />

                            {/* 员工名称 */}
                            <text
                              x={employee.x}
                              y={employee.y + (employee.role === 'ceo' ? 30 : employee.role === 'manager' ? 25 : 20)}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#1e293b"
                              className="pointer-events-none select-none"
                            >
                              {employee.name.length > 10 ? employee.name.substring(0, 10) + '...' : employee.name}
                            </text>

                            {/* 员工角色标签 */}
                            <text
                              x={employee.x}
                              y={employee.y}
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight="bold"
                              fill="#ffffff"
                              className="pointer-events-none select-none"
                            >
                              {employee.role.toUpperCase()}
                            </text>

                            {/* 连接线 - 从员工到公司 */}
                            <path
                              d={`M ${employee.x} ${employee.y} Q ${(employee.x + companyX) / 2} ${(employee.y + companyY) / 2 - 30} ${companyX} ${companyY}`}
                              fill="none"
                              stroke="#94a3b8"
                              strokeWidth="1"
                              strokeDasharray="5,5"
                              strokeOpacity="0.6"
                              markerEnd="url(#arrowhead)"
                            >
                              {isAnimating && (
                                <animate
                                  attributeName="stroke-dashoffset"
                                  from="0"
                                  to="40"
                                  dur="3s"
                                  repeatCount="indefinite"
                                />
                              )}
                            </path>
                          </g>
                        );
                      })}

                      {/* 事件和决策节点 - 作为小节点显示在公司周围 */}
                      {[...company.events, ...company.decisions].map((item, itemIndex) => {
                        // 计算事件/决策节点位置（在员工环的外围）
                        const itemCount = company.events.length + company.decisions.length;
                        const outerRadius = 200; // 比员工环再大一些
                        const itemAngle = (itemIndex / itemCount) * 2 * Math.PI;
                        const itemX = companyX + outerRadius * Math.cos(itemAngle);
                        const itemY = companyY + outerRadius * Math.sin(itemAngle);

                        const isDecision = 'approval_rate' in item;

                        return (
                          <g key={item.id}>
                            {/* 事件/决策节点 */}
                            <circle
                              cx={itemX}
                              cy={itemY}
                              r="8"
                              fill={getItemColor(item, isDecision ? 'decision' : 'event')}
                              onClick={() => handleEventClick(item)}
                              onMouseDown={(e) => handleNodeMouseDown(e, 'event', item.id)}
                              className="draggable cursor-move"
                            />

                            {/* 事件/决策时间标签 */}
                            <text
                              x={itemX}
                              y={itemY + 15}
                              textAnchor="middle"
                              fontSize="8"
                              fill="#64748b"
                              className="pointer-events-none select-none"
                            >
                              {formatTime(item.timestamp).split(' ')[1]}
                            </text>

                            {/* 连接线 - 从事件/决策到公司 */}
                            <path
                              d={`M ${itemX} ${itemY} Q ${(itemX + companyX) / 2} ${(itemY + companyY) / 2 + 30} ${companyX} ${companyY}`}
                              fill="none"
                              stroke={isDecision ? "#8b5cf6" : "#22c55e"}
                              strokeWidth="1"
                              strokeDasharray="3,3"
                              strokeOpacity="0.4"
                            >
                              {isAnimating && (
                                <animate
                                  attributeName="stroke-dashoffset"
                                  from="0"
                                  to="30"
                                  dur="4s"
                                  repeatCount="indefinite"
                                />
                              )}
                            </path>
                          </g>
                        );
                      })}
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
                      <span>员工数</span>
                      <span className="font-medium">{selectedCompany.employees.length}</span>
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

              {/* 选中员工详情 */}
              {selectedEmployee && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      员工详情
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">{selectedEmployee.name}</h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>角色</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedEmployee.role === 'ceo' ? 'CEO' :
                            selectedEmployee.role === 'manager' ? '经理' : '员工'}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>状态</span>
                        <Badge
                          variant={selectedEmployee.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {selectedEmployee.status === 'active' ? '活跃' :
                            selectedEmployee.status === 'thinking' ? '思考中' :
                              selectedEmployee.status === 'deciding' ? '决策中' : '空闲'}
                        </Badge>
                      </div>
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
                      <div className="w-4 h-4 border-2 border-blue-500 border-dashed rounded-full"></div>
                      <span>集权式公司</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-green-500 border-dashed rounded-full"></div>
                      <span>去中心化公司</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                      <span>员工</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                      <span>事件</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <span>决策</span>
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
                    <span>总数</span>
                    <span className="font-medium text-orange-600">
                      {companies.reduce((sum, c) => sum + c.employees.length, 0)}
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
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NetworkGraph from './NetworkGraph';
import DecisionFlowVisualizer from './DecisionFlowVisualizer';
import { Play, Pause, RotateCcw, Filter, Search, Maximize2, Activity, Zap } from 'lucide-react';

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

interface ActivityEvent {
  id: string;
  type: 'decision' | 'communication' | 'funding' | 'action';
  company_id: string;
  employee_id?: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'success' | 'error';
}

interface DecisionEvent {
  id: string;
  type: 'initiate' | 'approve' | 'reject' | 'feedback' | 'escalate';
  from_node: string;
  to_node: string;
  timestamp: number;
  description: string;
  decision_id: string;
}

interface SituationScreenProps {
  companies: Company[];
  decisions: Decision[];
  wsEvents: any[];
}

const SituationScreen: React.FC<SituationScreenProps> = ({
  companies = [],
  decisions = [],
  wsEvents = []
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['companies']);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showDecisionFlow, setShowDecisionFlow] = useState(false);
  const [decisionEvents, setDecisionEvents] = useState<DecisionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DecisionEvent | null>(null);
  const [performanceMode, setPerformanceMode] = useState(true);
  const [maxNodes, setMaxNodes] = useState(20);
  const [loadingStage, setLoadingStage] = useState('initial');
  const [showEmployees, setShowEmployees] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // 动态调整性能参数
  useEffect(() => {
    const totalNodes = companies.reduce((sum, c) => sum + c.employees.length + 1, 0) + decisions.length;
    
    if (totalNodes > 200) {
      setMaxNodes(50);
      setPerformanceMode(true);
    } else if (totalNodes > 100) {
      setMaxNodes(100);
    } else {
      setMaxNodes(200);
    }
  }, [companies, decisions]);
  
  // 分步加载网络数据生成
  const generateNetworkData = useCallback(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    // 第一步：只添加公司节点（最快显示）
    companies.forEach(company => {
      nodes.push({
        id: company.id,
        name: company.name,
        type: 'company',
        company_type: company.type,
        status: company.status,
        x: Math.random() * 400 + 200,
        y: Math.random() * 200 + 100
      });
    });

    // 第二步：根据用户选择添加员工节点
    if (showEmployees && selectedFilters.includes('employees')) {
      companies.forEach(company => {
        // 添加员工节点
        company.employees.forEach(employee => {
          nodes.push({
            id: employee.id,
            name: employee.name,
            type: 'employee',
            role: employee.role,
            company_id: employee.company_id,
            status: employee.status
          });

          // 添加公司-员工连接
          links.push({
            source: company.id,
            target: employee.id,
            type: 'hierarchy',
            strength: employee.role === 'ceo' ? 1.0 : employee.role === 'manager' ? 0.8 : 0.6,
            status: 'active'
          });
        });

      // 添加员工之间的层级关系
      const ceo = company.employees.find(e => e.role === 'ceo');
      const managers = company.employees.filter(e => e.role === 'manager');
      const employees = company.employees.filter(e => e.role === 'employee');

      if (company.type === 'centralized') {
        // 集权公司：CEO -> 经理 -> 员工
        if (ceo) {
          managers.forEach(manager => {
            links.push({
              source: ceo.id,
              target: manager.id,
              type: 'hierarchy',
              strength: 0.9,
              status: 'active'
            });
          });

          managers.forEach(manager => {
            employees.forEach(employee => {
              if (Math.random() > 0.5) { // 随机分配员工给经理
                links.push({
                  source: manager.id,
                  target: employee.id,
                  type: 'hierarchy',
                  strength: 0.7,
                  status: 'active'
                });
              }
            });
          });
        }
      } else {
        // 去中心化公司：更多横向连接
        const allEmployees = [...managers, ...employees];
        allEmployees.forEach((emp1, i) => {
          allEmployees.slice(i + 1).forEach(emp2 => {
            if (Math.random() > 0.6) { // 30%概率创建连接
              links.push({
                source: emp1.id,
                target: emp2.id,
                type: 'communication',
                strength: 0.5,
                status: 'active'
              });
            }
          });
        });
      }
    });
  }

    // 第三步：根据用户选择添加决策节点
    if (showDecisions && selectedFilters.includes('decisions')) {
      decisions.forEach(decision => {
        if (decision.status === 'pending' && decision.employee_id) {
          const decisionNodeId = `decision_${decision.id}`;
          
          // 确保发起者存在
          const employeeExists = nodes.some(node => node.id === decision.employee_id);
          if (!employeeExists) {
            console.warn('Decision employee not found:', decision.employee_id);
            return;
          }
          
          nodes.push({
            id: decisionNodeId,
            name: `决策: ${decision.type}`,
            type: 'decision',
            status: 'deciding'
          });

          // 连接决策发起者
          links.push({
            source: decision.employee_id,
            target: decisionNodeId,
            type: 'decision',
            strength: 0.8,
            status: 'active'
          });
        }
      });
    }

    console.log('Generated network data:', { 
      nodesCount: nodes.length, 
      linksCount: links.length, 
      companies: companies.length, 
      decisions: decisions.length 
    });
    
    return { nodes, links };
  }, [companies, decisions, showEmployees, showDecisions, selectedFilters]);

  // 生成决策事件
  useEffect(() => {
    const generateDecisionEvents = () => {
      const events: DecisionEvent[] = [];
      const now = Date.now();
      
      // 从现有数据生成决策事件
      decisions.forEach((decision, index) => {
        const company = companies.find(c => c.id === decision.company_id);
        if (!company) return;
        
        const initiator = company.employees.find(e => e.id === decision.employee_id);
        if (!initiator) return;
        
        // 生成决策发起事件
        events.push({
          id: `event_${decision.id}_initiate`,
          type: 'initiate',
          from_node: initiator.id,
          to_node: `decision_${decision.id}`,
          timestamp: now - (index * 10000) + Math.random() * 5000,
          description: `发起${decision.type}决策`,
          decision_id: decision.id
        });
        
        // 模拟决策流程
        if (company.type === 'centralized') {
          // 集权公司：需要层级审批
          const managers = company.employees.filter(e => e.role === 'manager');
          const ceos = company.employees.filter(e => e.role === 'ceo');
          
          if (initiator.role === 'employee' && managers.length > 0) {
            const manager = managers[Math.floor(Math.random() * managers.length)];
            events.push({
              id: `event_${decision.id}_escalate_manager`,
              type: 'escalate',
              from_node: initiator.id,
              to_node: manager.id,
              timestamp: now - (index * 10000) + 2000 + Math.random() * 3000,
              description: `上报给经理`,
              decision_id: decision.id
            });
            
            if (ceos.length > 0 && Math.random() > 0.6) {
              const ceo = ceos[0];
              events.push({
                id: `event_${decision.id}_escalate_ceo`,
                type: 'escalate',
                from_node: manager.id,
                to_node: ceo.id,
                timestamp: now - (index * 10000) + 5000 + Math.random() * 3000,
                description: `上报给CEO`,
                decision_id: decision.id
              });
            }
          }
        } else {
          // 去中心化公司：协作决策
          const colleagues = company.employees.filter(e => e.id !== initiator.id).slice(0, 3);
          colleagues.forEach((colleague, cIndex) => {
            events.push({
              id: `event_${decision.id}_feedback_${cIndex}`,
              type: 'feedback',
              from_node: colleague.id,
              to_node: initiator.id,
              timestamp: now - (index * 10000) + (cIndex + 1) * 1500 + Math.random() * 2000,
              description: `提供意见反馈`,
              decision_id: decision.id
            });
          });
        }
        
        // 最终决策结果
        const finalResult = Math.random() > 0.7 ? 'approve' : 'reject';
        events.push({
          id: `event_${decision.id}_final`,
          type: finalResult,
          from_node: `decision_${decision.id}`,
          to_node: initiator.id,
          timestamp: now - (index * 10000) + 8000 + Math.random() * 2000,
          description: finalResult === 'approve' ? '决策被批准' : '决策被拒绝',
          decision_id: decision.id
        });
      });
      
      setDecisionEvents(events.sort((a, b) => a.timestamp - b.timestamp));
    };
    
    if (decisions.length > 0 && companies.length > 0) {
      generateDecisionEvents();
    }
  }, [decisions, companies]);
  
  // 生成活动事件
  useEffect(() => {
    const newActivities: ActivityEvent[] = [];

    // 从WebSocket事件生成活动
    wsEvents.forEach((event, index) => {
      newActivities.push({
        id: `ws_${index}`,
        type: event.type || 'info',
        company_id: event.company_id || '',
        employee_id: event.employee_id,
        description: event.message || event.description || '未知事件',
        timestamp: event.timestamp || new Date().toISOString(),
        severity: event.severity || 'info'
      });
    });

    // 从决策生成活动
    decisions.forEach(decision => {
      newActivities.push({
        id: `decision_${decision.id}`,
        type: 'decision',
        company_id: decision.company_id,
        employee_id: decision.employee_id,
        description: `${decision.type}: ${decision.content}`,
        timestamp: decision.timestamp,
        severity: decision.status === 'approved' ? 'success' : 
                 decision.status === 'rejected' ? 'error' : 'warning'
      });
    });

    // 按时间排序
    newActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setActivities(newActivities.slice(0, 50)); // 限制显示最近50条
  }, [wsEvents, decisions]);

  const { nodes, links } = generateNetworkData();

  const filteredActivities = activities.filter(activity => {
    if (selectedFilters.includes('all')) return true;
    return selectedFilters.includes(activity.type);
  });

  const searchedActivities = filteredActivities.filter(activity =>
    activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  const handleFilterToggle = (filter: string) => {
    if (filter === 'all') {
      setSelectedFilters(['all']);
    } else {
      const newFilters = selectedFilters.includes(filter)
        ? selectedFilters.filter(f => f !== filter)
        : [...selectedFilters.filter(f => f !== 'all'), filter];
      
      setSelectedFilters(newFilters.length === 0 ? ['all'] : newFilters);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-full'} ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex flex-col h-full">
        {/* 标题栏 */}
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-4">
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>AI商战态势屏幕</h1>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? '恢复' : '暂停'}
              </Button>
              <Button 
                variant={showDecisionFlow ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDecisionFlow(!showDecisionFlow)}
              >
                <Activity className="w-4 h-4" />
                决策流
              </Button>
              <Button 
                variant={performanceMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPerformanceMode(!performanceMode)}
                title="切换性能模式"
              >
                ⚡ 性能
              </Button>
              <Button 
                variant={showEmployees ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowEmployees(!showEmployees);
                  if (!showEmployees) {
                    setSelectedFilters(prev => [...prev, 'employees']);
                  } else {
                    setSelectedFilters(prev => prev.filter(f => f !== 'employees'));
                  }
                }}
                title="显示/隐藏员工"
              >
                👥 员工
              </Button>
              <Button 
                variant={showDecisions ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowDecisions(!showDecisions);
                  if (!showDecisions) {
                    setSelectedFilters(prev => [...prev, 'decisions']);
                  } else {
                    setSelectedFilters(prev => prev.filter(f => f !== 'decisions'));
                  }
                }}
                title="显示/隐藏决策"
              >
                🎯 决策
              </Button>
              <Button 
                variant={darkMode ? "default" : "outline"}
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                title="切换暗色主题"
              >
                🌙 暗色
              </Button>
              <Button variant="outline" size="sm">
                <RotateCcw className="w-4 h-4" />
                重置
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              {companies.length} 家公司
            </Badge>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              {companies.reduce((sum, c) => sum + c.employees.length, 0)} 个AI Agent
            </Badge>
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              {decisions.filter(d => d.status === 'pending').length} 个决策进行中
            </Badge>
            <Badge variant="outline" className="text-purple-600 border-purple-600">
              <Zap className="w-3 h-3 mr-1" />
              {decisionEvents.length} 个决策事件
            </Badge>
            {performanceMode && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                ⚡ 性能模式 ({maxNodes} 节点)
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* 主要网络图区域 */}
          <div className={`flex-1 relative ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <NetworkGraph
              nodes={nodes}
              links={links}
              width={isFullscreen ? window.innerWidth - 400 : 800}
              height={isFullscreen ? window.innerHeight - 80 : 600}
              onNodeClick={handleNodeClick}
              maxNodes={maxNodes}
              performanceMode={performanceMode}
              enableClustering={nodes.length > 50}
              darkMode={darkMode}
            />
            
            {/* 决策流可视化层 */}
            {showDecisionFlow && (
              <DecisionFlowVisualizer
                width={isFullscreen ? window.innerWidth - 400 : 800}
                height={isFullscreen ? window.innerHeight - 80 : 600}
                nodes={nodes.slice(0, performanceMode ? 50 : nodes.length)}
                links={links.slice(0, performanceMode ? 100 : links.length)}
                decisionEvents={decisionEvents.slice(0, performanceMode ? 20 : decisionEvents.length)}
                onEventClick={setSelectedEvent}
              />
            )}
          </div>

          {/* 右侧活动面板 */}
          <div className={`w-96 border-l flex flex-col ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            {/* 过滤器和搜索 */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center space-x-2 mb-3">
                <Search className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="搜索活动..."
                  className={`flex-1 px-3 py-1 border rounded text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {['all', 'decision', 'communication', 'funding', 'action'].map(filter => (
                  <Button
                    key={filter}
                    variant={selectedFilters.includes(filter) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterToggle(filter)}
                    className="text-xs"
                  >
                    {filter === 'all' ? '全部' : 
                     filter === 'decision' ? '决策' :
                     filter === 'communication' ? '沟通' :
                     filter === 'funding' ? '资金' : '行动'}
                  </Button>
                ))}
              </div>
            </div>

            {/* 活动列表 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-gray-700">
                  实时活动 ({searchedActivities.length})
                </h3>
                
                {searchedActivities.map(activity => (
                  <Card key={activity.id} className={`p-3 border-l-4 ${getSeverityColor(activity.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {activity.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">
                          {activity.description}
                        </p>
                        {activity.company_id && (
                          <p className="text-xs text-gray-500 mt-1">
                            公司: {companies.find(c => c.id === activity.company_id)?.name || activity.company_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                
                {searchedActivities.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p>没有找到匹配的活动</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* 节点信息面板 */}
        {selectedNode && (
          <div className="absolute top-20 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs z-20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{selectedNode.name}</h3>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div>类型: {selectedNode.type}</div>
              {selectedNode.role && (
                <div>角色: {selectedNode.role}</div>
              )}
              <div>状态: {selectedNode.status}</div>
              {selectedNode.company_type && (
                <div>公司类型: {selectedNode.company_type}</div>
              )}
              {selectedNode.funds && (
                <div>资金: ¥{selectedNode.funds.toLocaleString()}</div>
              )}
            </div>
            
            {/* 相关操作 */}
            <div className="mt-3 space-y-1">
              <Button size="sm" variant="outline" className="w-full text-xs">
                查看详情
              </Button>
              {selectedNode.type === 'employee' && (
                <Button size="sm" variant="outline" className="w-full text-xs">
                  查看决策历史
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* 决策事件详情面板 */}
        {selectedEvent && (
          <div className="absolute bottom-20 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm z-20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">决策事件详情</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-medium">事件类型:</span>
                <Badge 
                  variant="outline" 
                  className="ml-2"
                  style={{
                    borderColor: {
                      'initiate': '#3b82f6',
                      'approve': '#10b981',
                      'reject': '#ef4444',
                      'feedback': '#f59e0b',
                      'escalate': '#8b5cf6'
                    }[selectedEvent.type] || '#6b7280'
                  }}
                >
                  {{
                    'initiate': '发起决策',
                    'approve': '批准决策',
                    'reject': '拒绝决策',
                    'feedback': '反馈意见',
                    'escalate': '升级决策'
                  }[selectedEvent.type]}
                </Badge>
              </div>
              <div>
                <span className="font-medium">描述:</span>
                <span className="ml-2">{selectedEvent.description}</span>
              </div>
              <div>
                <span className="font-medium">时间:</span>
                <span className="ml-2">{new Date(selectedEvent.timestamp).toLocaleTimeString()}</span>
              </div>
              <div>
                <span className="font-medium">决策ID:</span>
                <span className="ml-2 font-mono text-xs">{selectedEvent.decision_id}</span>
              </div>
              <div>
                <span className="font-medium">流向:</span>
                <span className="ml-2">{selectedEvent.from_node} → {selectedEvent.to_node}</span>
              </div>
            </div>
            
            {/* 相关操作 */}
            <div className="mt-3 space-y-1">
              <Button size="sm" variant="outline" className="w-full text-xs">
                查看决策全流程
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs">
                高亮相关节点
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SituationScreen;
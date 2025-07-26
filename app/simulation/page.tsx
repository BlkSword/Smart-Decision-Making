'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CompanyCard } from '@/components/simulation/CompanyCard';
import { DecisionPanel } from '@/components/simulation/DecisionPanel';
import { EventsFeed } from '@/components/simulation/EventsFeed';
import { SimulationStats } from '@/components/simulation/SimulationStats';
import { AILogPanel } from '@/components/simulation/AILogPanel';
import { EventGraph } from '@/components/simulation/EventGraph';
import { CreateCompanyModal } from '@/components/simulation/CreateCompanyModal';
import { CompanyDetailsModal } from '@/components/simulation/CompanyDetailsModal';
import { WebSocketConnection } from '@/lib/websocket';
import { Play, Pause, Square, Settings, Plus, RefreshCw, Clock } from 'lucide-react';



interface Company {
  id: string;
  name: string;
  company_type: 'centralized' | 'decentralized';
  funds: number;
  size: number;
  is_active: boolean;
}

interface SimulationStatus {
  status: string;
  mode: string;
  current_round: number;
  current_phase: string;
  last_round_time: string;
  companies_count: number;
  employees_count: number;
  decisions_count: number;
  events_count: number;
  ai_stats?: {
    total_calls: number;
    total_cost: number;
  };
}

// 游戏总结数据接口
interface GameSummary {
  total_rounds: number;
  total_companies: number;
  total_employees: number;
  total_decisions: number;
  total_events: number;
  ai_cost: number;
  ai_calls: number;
  start_time?: string;
  end_time?: string;
  game_duration?: number;
  companies: {
    [key: string]: {
      name: string;
      type: string;
      funds: number;
      employees_count: number;
      decisions_count: number;
      events_count: number;
      avg_employee_level: number;
      total_experience: number;
      is_active: boolean;
    }
  };
}

export default function SimulationPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocketConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsCompanyId, setDetailsCompanyId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [wsError, setWsError] = useState<string | null>(null);
  const [showGameSummary, setShowGameSummary] = useState(false);
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // 初始化WebSocket连接
  useEffect(() => {
    console.log('Initializing WebSocket connection...');

    try {
      const ws = new WebSocketConnection();
      setWsConnection(ws);

      ws.onMessage = (data) => {
        console.log('WebSocket message received:', data.type, data);

        // 处理广播事件
        if (data.type === 'broadcast') {
          console.log('Broadcast received:', data.channel, data.data);

          // 处理游戏事件
          if (data.channel === 'game_events') {
            console.log('Game event received, refreshing data...');
            loadSimulationData(false, false);
          }

          // 处理数据变化通知
          if (data.channel === 'data_changed') {
            console.log('Data changed event received, refreshing data...');
            loadSimulationData(false, false);
          }
        }

        // 处理数据更新响应
        if (data.type === 'data_update') {
          console.log('Data update received, updating UI...');
          if (data.companies) {
            setCompanies(data.companies);
          }
          if (data.simulationStatus) {
            setSimulationStatus(data.simulationStatus);
          }
          setLastUpdateTime(Date.now());
          setError(null);
        }

        // 处理pong响应
        if (data.type === 'pong') {
          console.log('Received pong from server');
        }

        // 处理错误
        if (data.type === 'error') {
          console.error('WebSocket error:', data.message);
          setError(data.message);
        }
      };

      ws.onConnecting = () => {
        console.log('🔗 WebSocket connecting...');
        setWsStatus('connecting');
        setWsError(null);
      };

      ws.onConnect = () => {
        console.log('✅ WebSocket connected successfully!');
        setWsStatus('connected');
        setWsError(null);
        setError(null);
      };

      ws.onError = (error) => {
        console.error('❌ WebSocket connection error:', error);
        setWsStatus('error');
        setWsError('WebSocket connection failed');
        setError('WebSocket connection failed');
      };

      ws.onClose = () => {
        console.log('🔒 WebSocket connection closed');
        setWsStatus('disconnected');
        setWsError(null);
      };

      console.log('WebSocket connection setup complete');
      return () => {
        console.log('Disconnecting WebSocket...');
        ws.disconnect();
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setError('Failed to setup WebSocket connection');
    }
  }, []);

  // 加载模拟数据
  const loadSimulationData = async (isInitial = false, isRefresh = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true);
        setLoading(true);
      } else if (isRefresh) {
        setRefreshing(true);
      }

      // 获取公司列表
      const companiesResponse = await fetch('/api/companies');
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData);
      }

      // 获取模拟状态
      const statusResponse = await fetch('/api/simulation/status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSimulationStatus(statusData);
      }

      setError(null);
      setLastUpdateTime(Date.now());
    } catch (err) {
      setError('Failed to load simulation data');
      console.error('Error loading simulation data:', err);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
        setLoading(false);
      } else if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  // 初始加载数据
  useEffect(() => {
    loadSimulationData(true, false);
  }, []);

  const controlSimulation = async (action: 'start' | 'pause' | 'resume' | 'stop' | 'end') => {
    try {
      // 特殊处理end操作
      if (action === 'end') {
        setSummaryLoading(true);
        const response = await fetch('http://localhost:8000/api/simulation/end', {
          method: 'POST',
        });

        if (response.ok) {
          // 获取游戏总结数据
          const statsData = await response.json();
          setGameSummary(statsData);
          setShowGameSummary(true);
          await loadSimulationData(false, false);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to end simulation');
        }
        setSummaryLoading(false);
        return;
      }

      const response = await fetch(`/api/simulation/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadSimulationData(false, false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || `Failed to ${action} simulation`);
      }
    } catch (err) {
      setError(`Error ${action}ing simulation`);
      console.error(`Error ${action}ing simulation:`, err);
    }
  };

  // 手动轮次
  const manualRound = async () => {
    try {
      const response = await fetch('/api/simulation/round', {
        method: 'POST',
      });

      if (response.ok) {
        await loadSimulationData(false, false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to execute round');
      }
    } catch (err) {
      setError('Error executing manual round');
      console.error('Error executing manual round:', err);
    }
  };

  // 切换游戏模式
  const toggleGameMode = async () => {
    try {
      const newMode = simulationStatus?.mode === 'auto' ? 'manual' : 'auto';
      const response = await fetch('/api/simulation/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: newMode }),
      });

      if (response.ok) {
        await loadSimulationData(false, false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to change mode');
      }
    } catch (err) {
      setError('Error changing game mode');
      console.error('Error changing game mode:', err);
    }
  };

  // 重置游戏
  const resetGame = async () => {
    try {
      const response = await fetch('/api/simulation/reset', {
        method: 'POST',
      });

      if (response.ok) {
        await loadSimulationData(false, false);
        setShowResetConfirm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to reset game');
      }
    } catch (err) {
      setError('Error resetting game');
      console.error('Error resetting game:', err);
    }
  };

  // 处理双击公司
  const handleCompanyDoubleClick = (companyId: string) => {
    setDetailsCompanyId(companyId);
    setShowDetailsModal(true);
  };

  // 处理创建公司成功
  const handleCreateSuccess = () => {
    loadSimulationData(false, false);
  };

  // 处理删除公司
  const handleDeleteCompany = async (companyId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 如果删除的是当前选中的公司，取消选中
        if (selectedCompany === companyId) {
          setSelectedCompany(null);
        }
        // 如果删除的是详情模态框中的公司，关闭模态框
        if (detailsCompanyId === companyId) {
          setShowDetailsModal(false);
          setDetailsCompanyId(null);
        }
        // 重新加载数据
        await loadSimulationData(false, false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to delete company');
      }
    } catch (err) {
      setError('Error deleting company');
      console.error('Error deleting company:', err);
    }
  };

  // 处理关闭详情模态框
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setDetailsCompanyId(null);
  };

  // 处理点击空白处取消选中
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedCompany(null);
    }
  };

  // 加载动画组件
  const LoadingAnimation = () => (
    <div className="container mx-auto p-6">
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );

  if (initialLoading) {
    return <LoadingAnimation />;
  }

  // 添加渲染游戏总结的函数
  const renderGameSummary = () => {
    if (!gameSummary) return null;

    return (
      <Dialog open={showGameSummary} onOpenChange={setShowGameSummary}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>游戏总结</DialogTitle>
            <DialogDescription>
              本轮游戏已完成，以下是详细统计数据
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-1">总轮次</div>
                <div className="text-2xl font-bold">{gameSummary.total_rounds}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-1">参与公司</div>
                <div className="text-2xl font-bold">{gameSummary.total_companies}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-1">员工总数</div>
                <div className="text-2xl font-bold">{gameSummary.total_employees}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-1">决策总数</div>
                <div className="text-2xl font-bold">{gameSummary.total_decisions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-1">AI调用次数</div>
                <div className="text-2xl font-bold">{gameSummary.ai_calls}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-1">AI总费用</div>
                <div className="text-2xl font-bold">${gameSummary.ai_cost.toFixed(4)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold mb-2">公司详情</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(gameSummary.companies).map(([companyId, company]) => (
                <Card key={companyId}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{company.name}</h4>
                        <p className="text-sm text-gray-500 capitalize">
                          {company.type === 'centralized' ? '集权式' : '去中心化'}公司
                        </p>
                      </div>
                      <Badge variant={company.is_active ? "default" : "secondary"}>
                        {company.is_active ? '活跃' : '非活跃'}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">资金:</span>
                        <span className="font-medium ml-1">${company.funds.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">员工数:</span>
                        <span className="font-medium ml-1">{company.employees_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">决策数:</span>
                        <span className="font-medium ml-1">{company.decisions_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">事件数:</span>
                        <span className="font-medium ml-1">{company.events_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowGameSummary(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div
      className="container mx-auto p-6 space-y-6"
      onClick={handleContainerClick}
    >
      {/* 头部控制区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold"> </h1>
          <p className="text-muted-foreground">
            系统控制台
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {simulationStatus && (
            <>
              <Badge variant={simulationStatus.status === 'running' ? 'default' : 'secondary'}>
                {simulationStatus.status === 'running' ? '运行中' :
                  simulationStatus.status === 'paused' ? '已暂停' : '已停止'}
              </Badge>
              <Badge variant="outline">
                {simulationStatus.mode === 'auto' ? '自动模式' : '手动模式'}
              </Badge>
              <Badge variant="outline">
                第{simulationStatus.current_round}轮
              </Badge>
            </>
          )}


          <Button
            onClick={() => loadSimulationData(false, true)}
            size="sm"
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '刷新中...' : '手动刷新'}
          </Button>

          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>最新更新: {new Date(lastUpdateTime).toLocaleTimeString()}</span>
          </div>

          <div className="flex items-center space-x-1 text-sm">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' :
              wsStatus === 'connecting' ? 'bg-yellow-500' :
                wsStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-400'
              }`} />
            <span className={`text-xs ${wsStatus === 'connected' ? 'text-green-600' :
              wsStatus === 'error' ? 'text-red-600' :
                'text-gray-500'
              }`}>
              {wsStatus === 'connected' ? '实时连接' :
                wsStatus === 'connecting' ? '连接中' :
                  wsStatus === 'error' ? '连接失败' :
                    '未连接'}
            </span>
          </div>

          <Button
            onClick={() => controlSimulation('start')}
            disabled={simulationStatus?.status === 'running'}
            size="sm"
          >
            <Play className="h-4 w-4 mr-1" />
            启动
          </Button>

          <Button
            onClick={() => controlSimulation(simulationStatus?.status === 'running' ? 'pause' : 'resume')}
            disabled={simulationStatus?.status === 'stopped'}
            size="sm"
            variant="outline"
          >
            {simulationStatus?.status === 'running' ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                暂停
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-1" />
                暂停
              </>
            )}
          </Button>

          {/* <Button
            onClick={() => controlSimulation('stop')}
            disabled={simulationStatus?.status === 'stopped'}
            size="sm"
            variant="outline"
          >
            <Square className="h-4 w-4 mr-1" />
            停止
          </Button> */}

          {/* 手动轮次控制按钮 */}
          {simulationStatus?.mode === 'manual' && (
            <Button
              onClick={manualRound}
              disabled={simulationStatus?.status !== 'running'}
              size="sm"
              variant="default"
            >
              <Play className="h-4 w-4 mr-1" />
              执行轮次
            </Button>
          )}

          {simulationStatus?.mode === 'auto' && (
            <Button
              onClick={manualRound}
              disabled={simulationStatus?.status !== 'running'}
              size="sm"
              variant="outline"
            >
              手动轮次
            </Button>
          )}

          <Button
            onClick={() => setShowResetConfirm(true)}
            size="sm"
            variant="destructive"
          >
            重置游戏
          </Button>

          <Button
            onClick={() => controlSimulation('end')}
            disabled={simulationStatus?.status === 'stopped' || summaryLoading}
            size="sm"
            variant="outline"
          >
            {summaryLoading ? '结束中...' : '结束'}
          </Button>

        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 统计信息 */}
      <SimulationStats stats={simulationStatus || undefined} autoRefresh={true} />

      {/* 主要内容区域 */}
      <div
        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        onClick={handleContainerClick}
      >
        {/* 公司列表 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">参与公司</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加公司
            </Button>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onClick={handleContainerClick}
          >
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                isSelected={selectedCompany === company.id}
                onClick={() => setSelectedCompany(company.id)}
                onDoubleClick={() => handleCompanyDoubleClick(company.id)}
                onDelete={handleDeleteCompany}
              />
            ))}
          </div>

          {companies.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">暂无公司数据，请先启动模拟系统</p>
                <Button
                  className="mt-4"
                  onClick={() => controlSimulation('start')}
                  disabled={simulationStatus?.status === 'running'}
                >
                  <Play className="h-4 w-4 mr-1" />
                  启动模拟系统
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 侧边栏 1 - 决策面板和事件 */}
        <div
          className="space-y-4"
          onClick={handleContainerClick}
        >
          {/* 决策面板 */}
          {selectedCompany && (
            <DecisionPanel companyId={selectedCompany} />
          )}

          {/* 事件动态 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最新动态</CardTitle>
              <CardDescription>实时事件与决策</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <EventsFeed companyId={selectedCompany} autoRefresh={false} />
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏 2 - AI日志面板 */}
        <div
          className="space-y-4"
          onClick={handleContainerClick}
        >
          <AILogPanel companyId={selectedCompany || undefined} />
        </div>
      </div>

      {/* 实时事件图 */}
      <div className="mt-8">
        <EventGraph
          companyId={selectedCompany || undefined}
          autoUpdate={true}
          showControls={true}
          height={500}
        />
      </div>

      {/* 模态框 */}
      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {detailsCompanyId && (
        <CompanyDetailsModal
          isOpen={showDetailsModal}
          onClose={handleCloseDetailsModal}
          companyId={detailsCompanyId}
        />
      )}

      {/* 重置游戏确认对话框 */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认重置游戏</DialogTitle>
            <DialogDescription>
              重置游戏将会清空所有公司、员工、决策和事件记录，并重新创建初始公司。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={resetGame}
            >
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderGameSummary()}
    </div>
  );
}
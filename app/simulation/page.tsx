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
import { CreateCompanyModal } from '@/components/simulation/CreateCompanyModal';
import { CompanyDetailsModal } from '@/components/simulation/CompanyDetailsModal';
import { WebSocketConnection } from '@/lib/websocket';
import { Play, Pause, Square, Settings, Plus, Network } from 'lucide-react';
import Link from 'next/link';

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

export default function SimulationPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocketConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsCompanyId, setDetailsCompanyId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 初始化WebSocket连接
  useEffect(() => {
    const ws = new WebSocketConnection();
    setWsConnection(ws);

    ws.onMessage = (data) => {
      if (data.channel === 'game_events') {
        // 处理游戏事件
        console.log('Game event received:', data.data);
        // 刷新数据
        loadSimulationData();
      }
    };

    return () => {
      ws.disconnect();
    };
  }, []);

  // 加载模拟数据
  const loadSimulationData = async () => {
    try {
      setLoading(true);
      
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
    } catch (err) {
      setError('Failed to load simulation data');
      console.error('Error loading simulation data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载数据
  useEffect(() => {
    loadSimulationData();
  }, []);

  // 控制模拟
  const controlSimulation = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    try {
      const response = await fetch(`/api/simulation/${action}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadSimulationData();
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
        await loadSimulationData();
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
        await loadSimulationData();
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
        await loadSimulationData();
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
    loadSimulationData();
  };

  // 处理关闭详情模态框
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setDetailsCompanyId(null);
  };

  // 处理点击空白处取消选中
  const handleContainerClick = (e: React.MouseEvent) => {
    // 如果点击的是容器本身（而不是子元素），则取消选中
    if (e.target === e.currentTarget) {
      setSelectedCompany(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading simulation...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="container mx-auto p-6 space-y-6"
      onClick={handleContainerClick}
    >
      {/* 头部控制区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI商战模拟系统</h1>
          <p className="text-muted-foreground">
            轮次制AI商战模拟 - 观察集权与去中心化公司的决策差异
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
          
          <Link href="/situation">
            <Button size="sm" variant="secondary">
              <Network className="h-4 w-4 mr-1" />
              时间线
            </Button>
          </Link>
          
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
                <Play className="h-4 w-4 mr-1" />
                继续
              </>
            )}
          </Button>
          
          <Button
            onClick={() => controlSimulation('stop')}
            disabled={simulationStatus?.status === 'stopped'}
            size="sm"
            variant="outline"
          >
            <Square className="h-4 w-4 mr-1" />
            停止
          </Button>
          
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
              <Play className="h-4 w-4 mr-1" />
              手动轮次
            </Button>
          )}
          
          <Button
            onClick={toggleGameMode}
            disabled={simulationStatus?.status === 'stopped'}
            size="sm"
            variant="outline"
          >
            {simulationStatus?.mode === 'auto' ? '切换到手动' : '切换到自动'}
          </Button>
          
          <Button
            onClick={() => setShowResetConfirm(true)}
            size="sm"
            variant="destructive"
          >
            重置游戏
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
      {simulationStatus && (
        <SimulationStats stats={simulationStatus} />
      )}

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
              />
            ))}
          </div>
          
          {companies.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">暂无公司，请先启动模拟系统</p>
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
              <EventsFeed companyId={selectedCompany} />
            </CardContent>
          </Card>
        </div>
        
        {/* 侧边栏 2 - AI日志面板 */}
        <div 
          className="space-y-4"
          onClick={handleContainerClick}
        >
          <AILogPanel companyId={selectedCompany} />
        </div>
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
    </div>
  );
}
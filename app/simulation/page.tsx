'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompanyCard } from '@/components/simulation/CompanyCard';
import { DecisionPanel } from '@/components/simulation/DecisionPanel';
import { EventsFeed } from '@/components/simulation/EventsFeed';
import { SimulationStats } from '@/components/simulation/SimulationStats';
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
  current_step: number;
  companies_count: number;
  employees_count: number;
  decisions_count: number;
  events_count: number;
}

export default function SimulationPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocketConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // 手动步进
  const manualStep = async () => {
    try {
      const response = await fetch('/api/simulation/step', {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadSimulationData();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to execute step');
      }
    } catch (err) {
      setError('Error executing manual step');
      console.error('Error executing manual step:', err);
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
    <div className="container mx-auto p-6 space-y-6">
      {/* 头部控制区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI商战模拟系统</h1>
          <p className="text-muted-foreground">
            实时观察AI公司的商业决策与竞争过程
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {simulationStatus && (
            <Badge variant={simulationStatus.status === 'running' ? 'default' : 'secondary'}>
              {simulationStatus.status === 'running' ? '运行中' : 
               simulationStatus.status === 'paused' ? '已暂停' : '已停止'}
            </Badge>
          )}
          
          <Link href="/situation">
            <Button size="sm" variant="secondary">
              <Network className="h-4 w-4 mr-1" />
              态势屏幕
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
          
          <Button
            onClick={manualStep}
            disabled={simulationStatus?.status !== 'running'}
            size="sm"
            variant="outline"
          >
            单步执行
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 公司列表 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">参与公司</h2>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              添加公司
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                isSelected={selectedCompany === company.id}
                onClick={() => setSelectedCompany(company.id)}
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

        {/* 侧边栏 */}
        <div className="space-y-4">
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
      </div>
    </div>
  );
}
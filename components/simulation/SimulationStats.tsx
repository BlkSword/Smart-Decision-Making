'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Brain, Activity, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { AnimatedNumber, AnimatedCounter } from '@/components/ui/animated-number';

interface SimulationStats {
  status: string;
  mode: string;
  current_round: number;
  current_phase: string;
  companies_count: number;
  employees_count: number;
  decisions_count: number;
  events_count: number;
  ai_stats?: {
    total_calls: number;
    total_cost: number;
  };
  last_round_time?: string;
}

interface SimulationStatsProps {
  stats?: SimulationStats;
  autoRefresh?: boolean;
}



export function SimulationStats({ stats: initialStats, autoRefresh = true }: SimulationStatsProps) {
  const [stats, setStats] = useState<SimulationStats | null>(initialStats || null);
  const [loading, setLoading] = useState(!initialStats);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [gameStartTime, setGameStartTime] = useState<string | null>(null);

  // 获取模拟状态数据
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 同时获取状态数据和游戏开始时间
      const [statusResponse, eventsResponse] = await Promise.all([
        fetch('/api/simulation/status'),
        fetch('/api/simulation/events?limit=1000') // 获取所有事件，然后找到最早的事件
      ]);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStats(statusData);
        setLastUpdated(new Date());
      } else {
        setError('获取数据失败');
      }
      
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        // 从事件列表中找到最早的事件时间戳作为游戏开始时间
        if (eventsData.events && eventsData.events.length > 0) {
          // 按时间戳排序，找到最早的事件
          const sortedEvents = eventsData.events.sort((a: any, b: any) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setGameStartTime(sortedEvents[0].timestamp);
        }
      }
    } catch (err) {
      setError('网络连接失败');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // 自动刷新功能
  useEffect(() => {
    if (!autoRefresh) return;

    // 初始加载数据（如果没有初始数据）
    if (!initialStats) {
      fetchStats();
    }

    // 设置定时器，每3秒刷新一次
    const interval = setInterval(fetchStats, 3000);

    // 清理定时器
    return () => clearInterval(interval);
  }, [autoRefresh, initialStats]);

  // 格式化函数
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  // 格式化为精确时间显示（用于最后轮次时间）
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '无效时间';
      }
      
      // 返回精确的日期时间格式，与AI调用日志一样准确
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Invalid date string:', dateString);
      return '时间格式错误';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'stopped':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'running': '运行中',
      'paused': '已暂停',
      'stopped': '已停止',
      'initializing': '初始化中'
    };
    return labels[status] || status;
  };

  // 如果没有数据且正在加载，显示加载状态
  if (!stats && loading) {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-center h-16">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>正在加载数据...</span>
          </div>
        </div>
      </div>
    );
  }

  // 如果没有数据且有错误，显示错误状态
  if (!stats && error) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center h-16">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* 系统状态 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">系统状态</span>
            </div>
            <Badge 
              variant="secondary"
              className={getStatusColor(stats.status)}
            >
              {getStatusLabel(stats.status)}
            </Badge>
          </CardContent>
        </Card>

        {/* 当前轮次 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium">当前轮次</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              <AnimatedCounter value={stats.current_round} />
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.current_phase}
            </div>
          </CardContent>
        </Card>

        {/* 公司数量 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">参与公司</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              <AnimatedCounter value={stats.companies_count} />
            </div>
          </CardContent>
        </Card>

        {/* 员工总数 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">总员工数</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              <AnimatedCounter value={stats.employees_count} />
            </div>
          </CardContent>
        </Card>

        {/* 决策总数 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">决策总数</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              <AnimatedCounter value={stats.decisions_count} />
            </div>
          </CardContent>
        </Card>

        {/* AI成本 */}
        {stats.ai_stats && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">AI成本</span>
              </div>
              <div className="text-lg font-bold text-orange-600">
                <AnimatedNumber 
                  value={stats.ai_stats.total_cost} 
                  formatValue={formatCost} 
                  decimals={4}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <AnimatedCounter value={stats.ai_stats.total_calls} suffix=" 次调用" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 游戏模式 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium">游戏模式</span>
            </div>
            <Badge variant="outline" className="text-teal-600 border-teal-300">
              {stats.mode === 'auto' ? '自动模式' : '手动模式'}
            </Badge>
          </CardContent>
        </Card>

        {/* 游戏开始时间 */}
        {gameStartTime && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium">已开始时间</span>
              </div>
              <div className="text-sm text-slate-600">
                {formatDateTime(gameStartTime)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Brain, Activity, Clock, DollarSign } from 'lucide-react';

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
  stats: SimulationStats;
}

export function SimulationStats({ stats }: SimulationStatsProps) {
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* 系统状态 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
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
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">当前轮次</span>
          </div>
          <div className="text-2xl font-bold text-primary">
            {stats.current_round}
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
            {stats.companies_count}
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
            {stats.employees_count}
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
            {stats.decisions_count}
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
              {formatCost(stats.ai_stats.total_cost)}
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.ai_stats.total_calls} 次调用
            </div>
          </CardContent>
        </Card>
      )}

      {/* 游戏模式 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">游戏模式</span>
          </div>
          <Badge variant="outline">
            {stats.mode === 'auto' ? '自动模式' : '手动模式'}
          </Badge>
        </CardContent>
      </Card>

      {/* 最后更新时间 */}
      {stats.last_round_time && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">最后轮次</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(stats.last_round_time)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
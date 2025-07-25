'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, TrendingUp, Building2, Users, Clock } from 'lucide-react';

interface GameEvent {
  id: string;
  type: string;
  timestamp: string;
  company_id?: string;
  description: string;
  data: Record<string, any>;
}

interface EventsFeedProps {
  companyId?: string | null;
  limit?: number;
}

export function EventsFeed({ companyId = null, limit = 20 }: EventsFeedProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [companyId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (companyId) {
        params.append('company_id', companyId);
      }
      params.append('limit', limit.toString());
      
      const response = await fetch(`/api/simulation/events?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setError(null);
      } else {
        setError('Failed to load events');
      }
    } catch (err) {
      setError('Error loading events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'funding_received':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decision_made':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'market_event':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'company_status_update':
        return <Building2 className="h-4 w-4 text-purple-600" />;
      case 'step_complete':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'funding_received': '资金获得',
      'decision_made': '决策制定',
      'collaborative_decision': '协作决策',
      'market_event': '市场事件',
      'company_status_update': '状态更新',
      'step_complete': '步骤完成',
      'step_error': '系统错误'
    };
    return types[type] || type;
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'funding_received': 'bg-green-100 text-green-800',
      'decision_made': 'bg-blue-100 text-blue-800',
      'collaborative_decision': 'bg-indigo-100 text-indigo-800',
      'market_event': 'bg-orange-100 text-orange-800',
      'company_status_update': 'bg-purple-100 text-purple-800',
      'step_complete': 'bg-gray-100 text-gray-800',
      'step_error': 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return '刚刚';
    } else if (diffMins < 60) {
      return `${diffMins} 分钟前`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} 小时前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const formatEventData = (event: GameEvent) => {
    switch (event.type) {
      case 'funding_received':
        return `获得资金 ¥${event.data.amount?.toLocaleString() || 0}`;
      case 'decision_made':
      case 'collaborative_decision':
        return event.data.final_decision?.content || event.description;
      case 'company_status_update':
        return `运营成本 ¥${event.data.operating_cost?.toLocaleString() || 0}`;
      case 'step_complete':
        return `处理了 ${event.data.total_events || 0} 个事件`;
      default:
        return event.description;
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-sm text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600 mb-2">{error}</div>
        <Button onClick={loadEvents} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-1" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-80">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">
            {companyId ? '公司动态' : '全局动态'}
          </span>
          <Button 
            onClick={loadEvents} 
            size="sm" 
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无事件记录
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge 
                      variant="secondary"
                      className={`text-xs ${getEventTypeColor(event.type)}`}
                    >
                      {getEventTypeLabel(event.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(event.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground mb-1">
                    {formatEventData(event)}
                  </p>
                  
                  {event.type === 'market_event' && event.data.impact && (
                    <div className="text-xs text-muted-foreground">
                      市场影响: {(event.data.impact * 100).toFixed(1)}%
                    </div>
                  )}
                  
                  {event.type === 'collaborative_decision' && event.data.total_proposals && (
                    <div className="text-xs text-muted-foreground">
                      收到 {event.data.total_proposals} 个提案
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
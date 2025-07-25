'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  X, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info,
  Clock,
  Users,
  DollarSign,
  Target,
  Zap
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  eventData?: any;
}

interface NotificationPanelProps {
  wsEvents: any[];
  companies: any[];
  isVisible: boolean;
  onToggle: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  wsEvents,
  companies,
  isVisible,
  onToggle
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const processedEvents = useRef<Set<string>>(new Set());

  // 处理WebSocket事件转为通知
  useEffect(() => {
    wsEvents.forEach(event => {
      const eventId = event.id || `${event.type}_${event.timestamp || Date.now()}`;
      
      // 避免重复处理相同事件
      if (processedEvents.current.has(eventId)) {
        return;
      }
      
      processedEvents.current.add(eventId);
      
      const notification = createNotificationFromEvent(event);
      if (notification) {
        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // 保持最近50条
        setUnreadCount(prev => prev + 1);
      }
    });
  }, [wsEvents]);

  const createNotificationFromEvent = (event: any): NotificationItem | null => {
    const timestamp = event.timestamp || new Date().toISOString();
    const eventId = event.id || `${event.type}_${timestamp}`;
    
    const company = companies.find(c => c.id === event.company_id);
    const companyName = company?.name || '未知公司';
    
    switch (event.type) {
      case 'round_start':
        return {
          id: eventId,
          type: 'info',
          title: '新轮次开始',
          message: `游戏轮次 ${event.data?.round || '未知'} 开始`,
          timestamp,
          read: false,
          eventData: event
        };
        
      case 'round_complete':
        return {
          id: eventId,
          type: 'success',
          title: '轮次完成',
          message: `轮次 ${event.data?.round || '未知'} 完成，处理了 ${event.data?.total_events || 0} 个事件`,
          timestamp,
          read: false,
          eventData: event
        };
        
      case 'decision':
        return {
          id: eventId,
          type: event.severity === 'success' ? 'success' : event.severity === 'error' ? 'error' : 'info',
          title: `${companyName} - 新决策`,
          message: event.description || '做出了新决策',
          timestamp,
          read: false,
          eventData: event
        };
        
      case 'funding':
        return {
          id: eventId,
          type: 'info',
          title: '资金分配',
          message: `${companyName} 获得资金 $${event.data?.amount?.toLocaleString() || '未知'}`,
          timestamp,
          read: false,
          eventData: event
        };
        
      case 'phase_complete':
        // 只显示重要阶段
        if (event.data?.phase === 'ai_decisions' || event.data?.phase === 'funding') {
          return {
            id: eventId,
            type: 'info',
            title: '阶段完成',
            message: `${getPhaseDisplayName(event.data?.phase)} 阶段完成`,
            timestamp,
            read: false,
            eventData: event
          };
        }
        return null;
        
      case 'game_reset':
        return {
          id: eventId,
          type: 'warning',
          title: '游戏重置',
          message: '游戏已重置，所有数据已清空',
          timestamp,
          read: false,
          eventData: event
        };
        
      case 'error':
        return {
          id: eventId,
          type: 'error',
          title: '系统错误',
          message: event.description || '发生了未知错误',
          timestamp,
          read: false,
          eventData: event
        };
        
      default:
        // 只显示重要的未知事件
        if (event.severity === 'error' || event.severity === 'warning') {
          return {
            id: eventId,
            type: event.severity,
            title: '系统通知',
            message: event.description || '发生了一个事件',
            timestamp,
            read: false,
            eventData: event
          };
        }
        return null;
    }
  };

  const getPhaseDisplayName = (phase: string): string => {
    switch (phase) {
      case 'funding': return '资金分配';
      case 'ai_decisions': return 'AI决策';
      case 'market_events': return '市场事件';
      case 'status_update': return '状态更新';
      default: return phase;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'error': return 'border-l-red-500 bg-red-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
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

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === id);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  };

  return (
    <div className="relative">
      {/* 通知按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* 通知面板 */}
      {isVisible && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">实时通知</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    全部标为已读
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="space-y-1">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-3 border-l-4 hover:bg-gray-50 cursor-pointer ${
                        getNotificationColor(notification.type)
                      } ${notification.read ? 'opacity-60' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {notification.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="p-0 h-auto hover:bg-transparent"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">暂无通知</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationPanel;
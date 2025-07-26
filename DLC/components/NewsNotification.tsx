"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Newspaper, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Building,
  Users,
  Target,
  Eye,
  DollarSign,
  Zap,
  Clock,
  ChevronRight
} from 'lucide-react';
import { CompetitionEvent } from '@/lib/game/competitionEngine';

interface MarketNews {
  id: string;
  headline: string;
  content: string;
  timestamp: number;
  type: 'positive' | 'negative' | 'neutral';
  isFake?: boolean;
  stockSymbol?: string;
}

interface NewsNotificationProps {
  recentEvents: CompetitionEvent[];
  marketNews: MarketNews[];
  className?: string;
}

interface NotificationItem {
  id: string;
  type: 'event' | 'news';
  title: string;
  content: string;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  icon: React.ReactNode;
  color: string;
  data?: CompetitionEvent | MarketNews;
}

export const NewsNotification: React.FC<NewsNotificationProps> = ({
  recentEvents,
  marketNews,
  className = ""
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // 将事件转换为通知项
  const convertEventToNotification = (event: CompetitionEvent): NotificationItem => {
    const getEventIcon = (type: string) => {
      switch (type) {
        case 'asset_change': return <DollarSign className="w-4 h-4" />;
        case 'building_acquired': return <Building className="w-4 h-4" />;
        case 'company_eliminated': return <AlertTriangle className="w-4 h-4" />;
        case 'hostile_takeover': return <Target className="w-4 h-4" />;
        case 'market_manipulation': return <Zap className="w-4 h-4" />;
        default: return <Newspaper className="w-4 h-4" />;
      }
    };

    const getEventColor = (type: string) => {
      switch (type) {
        case 'asset_change': return 'text-blue-400';
        case 'building_acquired': return 'text-green-400';
        case 'company_eliminated': return 'text-red-400';
        case 'hostile_takeover': return 'text-yellow-400';
        case 'market_manipulation': return 'text-purple-400';
        default: return 'text-gray-400';
      }
    };

    const getPriority = (type: string): 'high' | 'medium' | 'low' => {
      switch (type) {
        case 'company_eliminated':
        case 'hostile_takeover':
          return 'high';
        case 'building_acquired':
        case 'market_manipulation':
          return 'medium';
        default:
          return 'low';
      }
    };

    const getCategory = (type: string): string => {
      switch (type) {
        case 'asset_change': return '财务';
        case 'building_acquired': return '资产';
        case 'company_eliminated': return '竞争';
        case 'hostile_takeover': return '并购';
        case 'market_manipulation': return '市场';
        default: return '通用';
      }
    };

    return {
      id: event.id,
      type: 'event',
      title: getCategory(event.type),
      content: event.description,
      timestamp: event.timestamp,
      priority: getPriority(event.type),
      category: getCategory(event.type),
      icon: getEventIcon(event.type),
      color: getEventColor(event.type),
      data: event
    };
  };

  // 将市场新闻转换为通知项
  const convertNewsToNotification = (news: MarketNews): NotificationItem => {
    const getNewsIcon = (type: string) => {
      switch (type) {
        case 'positive': return <TrendingUp className="w-4 h-4" />;
        case 'negative': return <TrendingDown className="w-4 h-4" />;
        default: return <Newspaper className="w-4 h-4" />;
      }
    };

    const getNewsColor = (type: string) => {
      switch (type) {
        case 'positive': return 'text-green-400';
        case 'negative': return 'text-red-400';
        default: return 'text-gray-400';
      }
    };

    return {
      id: news.id,
      type: 'news',
      title: news.isFake ? '市场传言' : '市场消息',
      content: news.headline,
      timestamp: news.timestamp,
      priority: news.isFake ? 'high' : 'medium',
      category: '股市',
      icon: getNewsIcon(news.type),
      color: getNewsColor(news.type),
      data: news
    };
  };

  // 更新通知列表
  useEffect(() => {
    const eventNotifications = recentEvents.map(convertEventToNotification);
    const newsNotifications = marketNews.slice(-3).map(convertNewsToNotification); // 最新3条新闻

    const allNotifications = [...eventNotifications, ...newsNotifications]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // 最多显示10条

    setNotifications(allNotifications);
  }, [recentEvents, marketNews]);

  // 自动隐藏低优先级通知
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifications(prev => 
        prev.filter(notif => 
          notif.priority === 'high' || 
          (Date.now() - notif.timestamp) < 30000 // 30秒内的通知
        )
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  };

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 3);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 w-80 max-w-sm z-50 ${className}`}>
      <Card className="bg-gray-800 border-gray-600 shadow-2xl">
        <CardContent className="p-0">
          {/* 头部 */}
          <div className="flex items-center justify-between p-3 border-b border-gray-600">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-medium text-sm">实时新闻</span>
              <Badge variant="secondary" className="bg-yellow-600 text-white text-xs">
                {notifications.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                {isMinimized ? <ChevronRight className="w-3 h-3" /> : <X className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* 内容 */}
          {!isMinimized && (
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-1 p-2">
                {displayedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-2 bg-gray-700 rounded-sm border-l-2 ${getPriorityColor(notification.priority)} hover:bg-gray-600 transition-colors`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`${notification.color} mt-0.5`}>
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-xs font-medium">
                              {notification.title}
                            </span>
                            <Badge 
                              variant="outline" 
                              className="text-xs px-1 py-0"
                              style={{ 
                                borderColor: notification.color.replace('text-', ''),
                                color: notification.color.replace('text-', '')
                              }}
                            >
                              {notification.category}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissNotification(notification.id)}
                            className="h-4 w-4 p-0 text-gray-400 hover:text-white"
                          >
                            <X className="w-2 h-2" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-300 mt-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {notification.content}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 显示更多/收起 */}
              {notifications.length > 3 && (
                <div className="p-2 border-t border-gray-600">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAll(!showAll)}
                    className="w-full text-xs text-gray-400 hover:text-white"
                  >
                    {showAll ? (
                      <>收起 <ChevronRight className="w-3 h-3 ml-1 rotate-90" /></>
                    ) : (
                      <>显示全部 ({notifications.length}) <ChevronRight className="w-3 h-3 ml-1" /></>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  TrendingUp, 
  TrendingDown,
  Building,
  DollarSign,
  Target,
  Eye,
  Zap,
  Newspaper
} from 'lucide-react';

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  timestamp: number;
}

interface NewsToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const NewsToast: React.FC<NewsToastProps> = ({ notifications, onDismiss }) => {
  const [visibleNotifications, setVisibleNotifications] = useState<ToastNotification[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications.slice(0, 5)); // 最多显示5个
  }, [notifications]);

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getToastColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'info': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {visibleNotifications.map((notification, index) => (
        <Card 
          key={notification.id} 
          className={`w-80 ${getToastColor(notification.type)} border-2 shadow-lg animate-in slide-in-from-right duration-300`}
          style={{
            animationDelay: `${index * 100}ms`,
            transform: `translateY(${index * 10}px)`
          }}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className={`${getIconColor(notification.type)} mt-0.5 flex-shrink-0`}>
                {getToastIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium text-sm">{notification.title}</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDismiss(notification.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-gray-300 text-xs mt-1">{notification.message}</p>
                <div className="text-gray-500 text-xs mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Toast 管理器
export class ToastManager {
  private static instance: ToastManager;
  private notifications: ToastNotification[] = [];
  private listeners: ((notifications: ToastNotification[]) => void)[] = [];

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  subscribe(listener: (notifications: ToastNotification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  show(notification: Omit<ToastNotification, 'id' | 'timestamp'>) {
    const newNotification: ToastNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    this.notifications.unshift(newNotification);
    this.emit();

    // 自动移除
    const duration = notification.duration || 5000;
    setTimeout(() => {
      this.dismiss(newNotification.id);
    }, duration);
  }

  dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.emit();
  }

  clear() {
    this.notifications = [];
    this.emit();
  }

  // 便捷方法
  success(title: string, message: string, duration?: number) {
    this.show({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration?: number) {
    this.show({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration?: number) {
    this.show({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration?: number) {
    this.show({ type: 'info', title, message, duration });
  }
}

// React Hook for using toast
export const useToast = () => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const toastManager = ToastManager.getInstance();

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setNotifications);
    return unsubscribe;
  }, [toastManager]);

  return {
    notifications,
    show: toastManager.show.bind(toastManager),
    dismiss: toastManager.dismiss.bind(toastManager),
    clear: toastManager.clear.bind(toastManager),
    success: toastManager.success.bind(toastManager),
    error: toastManager.error.bind(toastManager),
    warning: toastManager.warning.bind(toastManager),
    info: toastManager.info.bind(toastManager)
  };
};
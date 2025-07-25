'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Download } from 'lucide-react';

interface AILogEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response' | 'error';
  company_id: string;
  company_name?: string;
  employee_id: string;
  employee_name?: string;
  employee_role?: string;
  request_type: string;
  prompt?: string;
  response?: string;
  error?: string;
  duration?: number;
  model: string;
  provider: string;
  cost: number;
  tokens?: {
    input: number;
    output: number;
  };
  status: 'pending' | 'success' | 'failed';
}

interface DecisionData {
  id: string;
  company_id: string;
  company_name: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  decision_type: string;
  content: string;
  created_at: string;
  ai_provider: string | null;
  ai_model: string | null;
  cost: number;
}

interface AILogPanelProps {
  companyId?: string;
}

export const AILogPanel: React.FC<AILogPanelProps> = ({ companyId }) => {
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AILogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 获取真实决策数据
  const fetchDecisions = async () => {
    try {
      const params = new URLSearchParams();
      if (companyId) {
        params.append('company_id', companyId);
      }
      params.append('limit', '50');
      
      const response = await fetch(`/api/simulation/decisions?${params}`);
      if (response.ok) {
        const data = await response.json();
        return data.decisions;
      }
    } catch (error) {
      console.error('Error fetching decisions:', error);
    }
    return [];
  };
  
  // 将决策数据转换为AI日志格式
  const convertDecisionToLog = (decision: DecisionData): AILogEntry => {
    const hasAIProvider = decision.ai_provider && decision.ai_provider !== null;
    
    return {
      id: decision.id,
      timestamp: decision.created_at,
      type: hasAIProvider ? 'response' : 'error',
      company_id: decision.company_id,
      company_name: decision.company_name,
      employee_id: decision.employee_id,
      employee_name: decision.employee_name,
      employee_role: decision.employee_role,
      request_type: decision.decision_type,
      response: hasAIProvider ? decision.content : undefined,
      error: hasAIProvider ? undefined : decision.content,
      model: decision.ai_model || 'unknown',
      provider: decision.ai_provider || 'none',
      cost: decision.cost,
      status: hasAIProvider ? 'success' : 'failed'
    };
  };

  // 定时获取真实决策数据
  useEffect(() => {
    // 初始加载数据
    const loadDecisions = async () => {
      const decisions = await fetchDecisions();
      const logEntries = decisions.map(convertDecisionToLog);
      setLogs(logEntries);
    };
    
    loadDecisions();

    // 定时刷新数据
    const interval = setInterval(loadDecisions, 5000); // 每5秒刷新

    return () => clearInterval(interval);
  }, [companyId]);

  // 过滤日志
  useEffect(() => {
    let filtered = logs;
    
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.status === filter);
    }
    
    if (companyId) {
      filtered = filtered.filter(log => log.company_id === companyId);
    }
    
    setFilteredLogs(filtered);
  }, [logs, filter, companyId]);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [filteredLogs, autoScroll]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI调用日志
            </CardTitle>
            <CardDescription>
              实时监控AI决策请求与响应
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* 过滤器 */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            全部 ({logs.length})
          </Button>
          <Button
            variant={filter === 'success' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('success')}
          >
            成功 ({logs.filter(l => l.status === 'success').length})
          </Button>
          <Button
            variant={filter === 'failed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('failed')}
          >
            失败 ({logs.filter(l => l.status === 'failed').length})
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea 
          className="h-96" 
          ref={scrollRef}
        >
          <div className="p-4 space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无日志记录
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${getStatusColor(log.status)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium text-sm">
                        {log.company_name} - {log.employee_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.employee_role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatTime(log.timestamp)}</span>
                      {log.duration && (
                        <span>{log.duration}ms</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        请求类型：
                      </span>
                      <span className="text-xs ml-1">{log.request_type}</span>
                    </div>
                    
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        提示词：
                      </span>
                      <p className="text-xs mt-1 bg-gray-50 p-2 rounded">
                        {log.prompt}
                      </p>
                    </div>
                    
                    {log.response && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          AI回复：
                        </span>
                        <p className="text-xs mt-1 bg-blue-50 p-2 rounded">
                          {log.response}
                        </p>
                      </div>
                    )}
                    
                    {log.error && (
                      <div>
                        <span className="text-xs font-medium text-red-600">
                          错误：
                        </span>
                        <p className="text-xs mt-1 bg-red-50 p-2 rounded text-red-700">
                          {log.error}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>模型: {log.model}</span>
                        <span>提供商: {log.provider}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {log.tokens && (
                          <span>
                            Tokens: {log.tokens.input}+{log.tokens.output}
                          </span>
                        )}
                        <span>
                          成本: ${log.cost.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Timer, Zap } from 'lucide-react';

interface AICountdownProps {
  cooldown: number;
  isActive: boolean;
}

export const AICountdown: React.FC<AICountdownProps> = ({ cooldown, isActive }) => {
  // 将冷却时间转换为秒数 (cooldown * 100ms = 实际毫秒)
  const secondsLeft = Math.ceil(cooldown / 10);
  
  // 如果AI已经激活且不在冷却中，则不显示倒计时
  if (isActive && cooldown <= 0) {
    return null;
  }
  
  // 如果AI还未激活，显示初始倒计时
  if (!isActive && cooldown > 0) {
    return (
      <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border-orange-600/50 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-200 flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI激活倒计时
          </CardTitle>
          <Timer className="h-4 w-4 text-orange-400 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-orange-400">
              {secondsLeft}s
            </div>
            <div className="text-xs text-orange-300">
              准备中...
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${((50 - cooldown) / 50) * 100}%` }}
            />
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            AI竞争对手即将开始行动
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // 如果AI已激活且正在冷却，显示下次行动倒计时
  if (isActive && cooldown > 0) {
    return (
      <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-600/50 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-200 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            下次AI行动
          </CardTitle>
          <Timer className="h-4 w-4 text-blue-400 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-400">
              {secondsLeft}s
            </div>
            <div className="text-xs text-blue-300">
              冷却中...
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${((100 - cooldown) / 100) * 100}%` }}
            />
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            AI正在分析市场情况
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return null;
};

export default AICountdown;
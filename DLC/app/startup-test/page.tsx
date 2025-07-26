"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StartupScreen from '@/components/StartupScreen';

export default function StartupTestPage() {
  const [showStartup, setShowStartup] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const handleStartupComplete = () => {
    setShowStartup(false);
    setCompletedCount(prev => prev + 1);
    console.log('Startup completed at:', new Date().toISOString());
  };

  const startTest = () => {
    setShowStartup(true);
    console.log('Starting startup screen at:', new Date().toISOString());
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">🧪 启动屏幕测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-300 mb-2">测试状态:</p>
                <p className="text-green-400">✅ 启动屏幕组件已加载</p>
                <p className="text-blue-400">📊 完成次数: {completedCount}</p>
                <p className="text-yellow-400">🔄 当前状态: {showStartup ? '显示中' : '隐藏'}</p>
              </div>
              <div>
                <p className="text-gray-300 mb-2">测试操作:</p>
                <Button 
                  onClick={startTest}
                  disabled={showStartup}
                  className="w-full mb-2"
                >
                  {showStartup ? '测试进行中...' : '开始测试启动屏幕'}
                </Button>
                <Button 
                  onClick={() => setCompletedCount(0)}
                  variant="outline"
                  className="w-full"
                >
                  重置计数器
                </Button>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">测试说明:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• 点击"开始测试启动屏幕"按钮启动测试</li>
                <li>• 启动屏幕应该在2.5秒后自动关闭</li>
                <li>• 检查浏览器控制台的时间日志</li>
                <li>• 如果启动屏幕卡住，检查JavaScript错误</li>
              </ul>
            </div>
            
            <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500">
              <h3 className="text-lg font-semibold mb-2 text-blue-300">预期行为:</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• 启动屏幕显示RESP-X logo和动画</li>
                <li>• 2秒后开始淡出动画</li>
                <li>• 2.5秒后完全消失并触发完成回调</li>
                <li>• 完成次数应该增加1</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            onClick={() => window.location.href = '/game'}
            className="bg-green-600 hover:bg-green-700"
          >
            返回游戏页面
          </Button>
        </div>
      </div>

      {/* 启动屏幕 */}
      {showStartup && (
        <StartupScreen onComplete={handleStartupComplete} />
      )}
    </div>
  );
}
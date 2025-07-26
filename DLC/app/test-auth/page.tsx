"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CopyButton } from '@/components/ui/copy-button';

export default function TestAuthPage() {
  const [testText, setTestText] = useState('测试复制文本');
  const [message, setMessage] = useState('');

  const handleCopySuccess = () => {
    setMessage('✅ 复制成功！');
  };

  const handleCopyError = (error: string) => {
    setMessage(`❌ 复制失败: ${error}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">🔐 用户认证测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-300">认证页面状态</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-300 mb-2">注册页面:</p>
                  <a 
                    href="/sign-up"
                    className="text-blue-400 hover:text-blue-300 underline"
                    target="_blank"
                  >
                    /sign-up
                  </a>
                </div>
                <div>
                  <p className="text-gray-300 mb-2">登录页面:</p>
                  <a 
                    href="/sign-in"
                    className="text-blue-400 hover:text-blue-300 underline"
                    target="_blank"
                  >
                    /sign-in
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-300">剪贴板功能测试</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="test-text" className="text-gray-300">
                    测试文本:
                  </Label>
                  <Input
                    id="test-text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                    placeholder="输入要复制的文本"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <CopyButton
                    text={testText}
                    onSuccess={handleCopySuccess}
                    onError={handleCopyError}
                  />
                  <Button
                    onClick={() => setMessage('')}
                    variant="outline"
                    size="sm"
                  >
                    清空消息
                  </Button>
                </div>
                {message && (
                  <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                    {message}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-purple-300">修复内容</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>✅ 修复了 globals.css 模块路径错误</li>
                <li>✅ 创建了安全的剪贴板工具函数</li>
                <li>✅ 实现了剪贴板权限错误的优雅处理</li>
                <li>✅ 提供了 execCommand 作为备用方案</li>
                <li>✅ 创建了可重用的复制按钮组件</li>
              </ul>
            </div>

            <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30">
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">使用说明</h3>
              <ul className="text-sm text-yellow-200 space-y-1">
                <li>• 如果浏览器不支持 Clipboard API，会自动使用 execCommand 备用方案</li>
                <li>• 如果权限被拒绝，会显示友好的错误消息</li>
                <li>• 复制成功后按钮会短暂显示"已复制"状态</li>
                <li>• 支持自定义成功和错误回调函数</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            onClick={() => window.location.href = '/game'}
            className="bg-green-600 hover:bg-green-700"
          >
            🎮 返回游戏
          </Button>
        </div>
      </div>
    </div>
  );
}
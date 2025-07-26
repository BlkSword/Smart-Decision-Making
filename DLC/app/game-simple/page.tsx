"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SimpleGamePage() {
  const [message, setMessage] = useState("点击按钮开始游戏！");
  const [score, setScore] = useState(0);

  const handleClick = () => {
    setScore(score + 1);
    setMessage(`游戏进行中... 分数: ${score + 1}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <Card className="w-96 bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-green-400">
            🎮 商业霸主 - 简单版
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-lg">{message}</div>
          <div className="text-3xl font-bold text-yellow-400">
            分数: {score}
          </div>
          <Button 
            onClick={handleClick}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            开始/继续游戏
          </Button>
          <div className="text-sm text-gray-400">
            多智能体商业模拟器测试版
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
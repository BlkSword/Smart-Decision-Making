"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameState } from '@/lib/game/useGameState';
import EliminationCountdown from '@/components/EliminationCountdown';

export default function TestEliminationPage() {
  const { 
    gameState, 
    playerCompany, 
    aiCompanies, 
    eliminationEnabled, 
    gameStartTime, 
    ELIMINATION_GRACE_PERIOD 
  } = useGameState();

  const [testLog, setTestLog] = useState<string[]>([]);

  const addToLog = (message: string) => {
    setTestLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const drainPlayerAssets = () => {
    const player = gameState.companies.find(c => c.isPlayer);
    if (player) {
      // 模拟资产归零的情况
      const newCompanies = gameState.companies.map(c => 
        c.isPlayer ? { ...c, assets: 0 } : c
      );
      addToLog(`玩家资产设为0: ${player.name}`);
    }
  };

  const drainAIAssets = () => {
    const aiCompany = aiCompanies[0];
    if (aiCompany) {
      // 模拟AI资产归零的情况
      const newCompanies = gameState.companies.map(c => 
        c.id === aiCompany.id ? { ...c, assets: 0 } : c
      );
      addToLog(`AI资产设为0: ${aiCompany.name}`);
    }
  };

  useEffect(() => {
    // 监听公司状态变化
    const bankruptCompanies = gameState.companies.filter(c => c.status === 'bankrupt');
    if (bankruptCompanies.length > 0) {
      bankruptCompanies.forEach(company => {
        addToLog(`公司已被淘汰: ${company.name} (${company.isPlayer ? '玩家' : 'AI'})`);
      });
    }
  }, [gameState.companies]);

  const timeSinceStart = gameStartTime ? Date.now() - gameStartTime : 0;
  const isInGracePeriod = gameStartTime ? timeSinceStart < ELIMINATION_GRACE_PERIOD : true;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">🧪 淘汰机制测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 淘汰倒计时 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-300">淘汰机制状态</h3>
              <EliminationCountdown 
                gameStartTime={gameStartTime}
                gracePeriod={ELIMINATION_GRACE_PERIOD}
                eliminationEnabled={eliminationEnabled}
              />
            </div>

            {/* 游戏状态 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-300">当前游戏状态</h3>
                <div className="space-y-2 text-sm">
                  <div>🏁 游戏状态: {gameState.gameStatus}</div>
                  <div>⏰ 游戏时间: {gameStartTime ? Math.floor(timeSinceStart / 1000) : 0}秒</div>
                  <div>🛡️ 保护期: {isInGracePeriod ? '进行中' : '已结束'}</div>
                  <div>⚔️ 淘汰机制: {eliminationEnabled ? '已启用' : '未启用'}</div>
                  <div>🏢 活跃公司: {gameState.companies.filter(c => c.status === 'active').length}</div>
                  <div>💀 破产公司: {gameState.companies.filter(c => c.status === 'bankrupt').length}</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-300">测试控制</h3>
                <div className="space-y-2">
                  <Button 
                    onClick={drainPlayerAssets}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    💰 将玩家资产设为0
                  </Button>
                  <Button 
                    onClick={drainAIAssets}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    🤖 将AI资产设为0
                  </Button>
                  <Button 
                    onClick={() => setTestLog([])}
                    variant="outline"
                    className="w-full"
                  >
                    🧹 清空日志
                  </Button>
                </div>
              </div>
            </div>

            {/* 公司详情 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-cyan-300">公司详情</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameState.companies.map(company => (
                  <div 
                    key={company.id}
                    className={`p-4 rounded-lg border ${ 
                      company.status === 'bankrupt' 
                        ? 'bg-red-900/20 border-red-500/30' 
                        : company.assets <= 0 
                        ? 'bg-yellow-900/20 border-yellow-500/30'
                        : 'bg-blue-900/20 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {company.name} {company.isPlayer ? '(玩家)' : '(AI)'}
                      </h4>
                      <span className={`text-sm px-2 py-1 rounded ${
                        company.status === 'bankrupt' 
                          ? 'bg-red-600/20 text-red-300' 
                          : 'bg-green-600/20 text-green-300'
                      }`}>
                        {company.status === 'bankrupt' ? '破产' : '活跃'}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>💰 资产: ${company.assets.toLocaleString()}</div>
                      <div>👥 员工: {company.employees}</div>
                      <div>🏢 建筑: {company.buildings.length}</div>
                      {company.assets <= 0 && company.status === 'active' && (
                        <div className="text-yellow-300 font-medium">
                          ⚠️ 资产归零，即将被淘汰！
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 测试日志 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-yellow-300">测试日志</h3>
              <div className="bg-gray-700 p-4 rounded-lg max-h-40 overflow-y-auto">
                {testLog.length === 0 ? (
                  <p className="text-gray-400">暂无日志</p>
                ) : (
                  testLog.map((log, index) => (
                    <div key={index} className="text-sm text-gray-300 mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 测试说明 */}
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
              <h3 className="text-lg font-semibold mb-2 text-blue-300">测试说明</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• 修复后的逻辑：资产为0的公司会立即被淘汰，不受保护期限制</li>
                <li>• 保护期只影响胜利条件的判断，不影响资产归零的淘汰</li>
                <li>• 点击测试按钮可以模拟公司资产归零的情况</li>
                <li>• 淘汰会在下次游戏循环（约100ms）后生效</li>
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
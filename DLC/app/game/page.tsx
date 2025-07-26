"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users, DollarSign, Target, MapPin } from 'lucide-react';
import { useGameState } from '@/lib/game/useGameState';
import StockMarketPanel from '@/components/StockMarketPanel';
import { CompetitionPanel } from '@/components/CompetitionPanel';
import { ActionLegend } from '@/components/ActionLegend';
import { NewsNotification } from '@/components/NewsNotification';
import { NewsToast, useToast } from '@/components/NewsToast';
import StartupScreen from '@/components/StartupScreen';
import AICountdown from '@/components/AICountdown';
import EliminationCountdown from '@/components/EliminationCountdown';
import { GameModeConfig, gameModes } from '@/lib/game/gameModes';
import { useRouter } from 'next/navigation';
import GameModeIndicator from '@/components/GameModeIndicator';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import GameChat from '@/components/GameChat';
import { RealTimeAnalysis } from '@/components/RealTimeAnalysis';
import { AcquisitionNotification } from '@/components/AcquisitionNotification';

export default function GamePage() {
  const [showStartup, setShowStartup] = useState(true);
  const [startupTimeout, setStartupTimeout] = useState<NodeJS.Timeout | null>(null);
  const [gameMode, setGameMode] = useState<GameModeConfig | null>(null);
  const [chatMinimized, setChatMinimized] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  
  // 读取游戏模式配置
  useEffect(() => {
    const savedMode = localStorage.getItem('selectedGameMode');
    if (savedMode) {
      try {
        const mode = JSON.parse(savedMode);
        setGameMode(mode);
        console.log('Game mode loaded:', mode);
      } catch (error) {
        console.error('Failed to parse game mode:', error);
        // 使用默认的新手模式
        setGameMode(gameModes[0]);
      }
    } else {
      // 如果没有选择模式，重定向到模式选择页面
      router.push('/game-mode');
      return;
    }
  }, [router]);
  
  // Check if startup screen was already shown in this session
  useEffect(() => {
    const startupShown = sessionStorage.getItem('startupScreenShown');
    if (startupShown) {
      setShowStartup(false);
    } else {
      // Emergency timeout - if startup screen doesn't complete in 10 seconds, force skip
      const emergencyTimeout = setTimeout(() => {
        console.warn('Emergency timeout: Forcing startup screen to complete');
        setShowStartup(false);
        sessionStorage.setItem('startupScreenShown', 'true');
      }, 10000);
      setStartupTimeout(emergencyTimeout);
      
      // Cleanup on unmount
      return () => {
        clearTimeout(emergencyTimeout);
      };
    }
  }, []);
  
  const { 
    gameState, 
    playerCompany, 
    aiCompanies, 
    moveAgent, 
    purchaseBuilding,
    purchaseBuildingWithMovement,
    recruitEmployeeWithMovement,
    selectAgent, 
    selectBuilding, 
    onManipulationExecuted,
    executeHostileTakeover,
    aiDecisionCooldown,
    eliminationEnabled,
    gameStartTime,
    ELIMINATION_GRACE_PERIOD
  } = useGameState(gameMode?.config);
  
  const { notifications, dismiss } = useToast();
  
  // 处理启动屏幕完成
  const handleStartupComplete = () => {
    console.log('Startup screen completed successfully');
    if (startupTimeout) {
      clearTimeout(startupTimeout);
      setStartupTimeout(null);
    }
    setShowStartup(false);
    // Mark startup screen as shown in this session
    sessionStorage.setItem('startupScreenShown', 'true');
  };
  
  // Debug functions (call from browser console)
  if (typeof window !== 'undefined') {
    (window as any).resetStartupScreen = () => {
      sessionStorage.removeItem('startupScreenShown');
      setShowStartup(true);
    };
    (window as any).skipStartupScreen = () => {
      console.log('Manually skipping startup screen');
      handleStartupComplete();
    };
    (window as any).checkStartupStatus = () => {
      console.log('Startup screen status:', { 
        showStartup, 
        sessionStorage: sessionStorage.getItem('startupScreenShown'),
        hasTimeout: !!startupTimeout
      });
    };
  }
  
  // 如果仍在显示启动屏幕，则只显示启动屏幕
  if (showStartup) {
    return <StartupScreen onComplete={handleStartupComplete} />;
  }
  
  // 如果游戏模式还未加载，显示加载状态
  if (!gameMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-black to-cyan-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game mode...</div>
      </div>
    );
  }

  const getBuildingIcon = (type: string) => {
    switch(type) {
      case "trade_center": return "🏢";
      case "hospital": return "🏥";
      case "company": return "🏛️";
      case "real_estate": return "🏘️";
      case "hotel": return "🏨";
      default: return "📍";
    }
  };

  const getBuildingColor = (type: string) => {
    switch(type) {
      case "trade_center": return "#3b82f6";
      case "hospital": return "#ef4444";
      case "company": return "#8b5cf6";
      case "real_estate": return "#10b981";
      case "hotel": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-black to-cyan-900 text-white p-4 relative overflow-hidden">
      {/* DNA背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <svg className="absolute top-10 left-10 w-64 h-64 animate-spin-slow" viewBox="0 0 200 200">
          <path d="M100 25 Q125 50 100 75 Q75 100 100 125 Q125 150 100 175" stroke="#3B82F6" strokeWidth="2" fill="none" />
          <path d="M100 25 Q75 50 100 75 Q125 100 100 125 Q75 150 100 175" stroke="#22D3EE" strokeWidth="2" fill="none" />
          {[...Array(8)].map((_, i) => (
            <line key={i} x1={100 - Math.sin(i * 0.8) * 25} y1={35 + i * 20} x2={100 + Math.sin(i * 0.8) * 25} y2={35 + i * 20} stroke="#60A5FA" strokeWidth="1" opacity="0.6" />
          ))}
          {[...Array(10)].map((_, i) => (
            <circle key={i} cx={100 + Math.cos(i * 0.6) * 20} cy={35 + i * 15} r="2" fill="#93C5FD" />
          ))}
        </svg>
        <svg className="absolute bottom-10 right-10 w-48 h-48 animate-spin-slow" viewBox="0 0 200 200" style={{animationDirection: 'reverse'}}>
          <path d="M100 25 Q125 50 100 75 Q75 100 100 125 Q125 150 100 175" stroke="#10B981" strokeWidth="2" fill="none" />
          <path d="M100 25 Q75 50 100 75 Q125 100 100 125 Q75 150 100 175" stroke="#F59E0B" strokeWidth="2" fill="none" />
          {[...Array(6)].map((_, i) => (
            <circle key={i} cx={100} cy={40 + i * 25} r="3" fill="#34D399" opacity="0.8" />
          ))}
        </svg>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">

        
        {/* AI倒计时提示 */}
        {aiDecisionCooldown > 0 && (
          <div className="mb-4">
            <AICountdown 
              cooldown={aiDecisionCooldown}
              isActive={gameState.currentTurn > 1 || aiDecisionCooldown < 50}
            />
          </div>
        )}
        
        {/* 淘汰机制倒计时 */}
        <div className="mb-4">
          <EliminationCountdown 
            gameStartTime={gameStartTime}
            gracePeriod={ELIMINATION_GRACE_PERIOD}
            eliminationEnabled={eliminationEnabled}
          />
        </div>
        
        {/* 游戏模式指示器 */}
        <div className="mb-4 flex items-center space-x-4">
          <GameModeIndicator gameMode={gameMode} />
          <button
            onClick={() => router.push('/game-mode')}
            className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm rounded-lg transition-colors text-white font-medium border border-blue-500/30 hover:border-blue-400/50"
          >
            更换模式
          </button>
        </div>
        
        {/* 顶部状态栏 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-900/40 via-cyan-900/30 to-blue-800/40 border-blue-400/30 backdrop-blur-sm hover:border-blue-300/50 transition-all duration-300 shadow-lg shadow-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
{t.game.assets}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-cyan-400 drop-shadow-lg" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                ${playerCompany?.assets.toLocaleString()}
              </div>
              <div className="text-xs text-blue-300/70 mt-1">
{t.company.aeroVitaEnterprise}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-green-800/40 border-green-400/30 backdrop-blur-sm hover:border-green-300/50 transition-all duration-300 shadow-lg shadow-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
{t.game.employees}
              </CardTitle>
              <Users className="h-4 w-4 text-green-400 drop-shadow-lg" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent">
                {playerCompany?.employees}
              </div>
              <div className="text-xs text-green-300/70 mt-1">
{t.company.neuralWorkforce}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-900/40 via-violet-900/30 to-purple-800/40 border-purple-400/30 backdrop-blur-sm hover:border-purple-300/50 transition-all duration-300 shadow-lg shadow-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
{t.game.buildings}
              </CardTitle>
              <Building className="h-4 w-4 text-purple-400 drop-shadow-lg" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent">
                {playerCompany?.buildings.length}
              </div>
              <div className="text-xs text-purple-300/70 mt-1">
                Molecular Structures
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-900/40 via-orange-900/30 to-red-800/40 border-red-400/30 backdrop-blur-sm hover:border-red-300/50 transition-all duration-300 shadow-lg shadow-red-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
{t.company.competitor}
              </CardTitle>
              <Target className="h-4 w-4 text-red-400 drop-shadow-lg" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-red-300 to-orange-400 bg-clip-text text-transparent">
                {aiCompanies.length}
              </div>
              <div className="text-xs text-red-300/70 mt-1">
                Hostile Entities
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 2D地图区域 */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40 border-cyan-400/30 backdrop-blur-sm hover:border-cyan-300/50 transition-all duration-300 shadow-lg shadow-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-cyan-200 flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                  <MapPin className="h-5 w-5 text-cyan-400 drop-shadow-lg" />
                  Neural Network Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-gradient-to-br from-slate-800/50 to-blue-900/50 rounded-lg overflow-hidden border border-cyan-500/30 backdrop-blur-sm" style={{ height: '400px' }}>
                  {/* 地图背景网格 */}
                  <svg className="absolute inset-0 w-full h-full">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#22D3EE" strokeWidth="1" opacity="0.2"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                  
                  {/* 移动连线 */}
                  {gameState.agents.map((agent) => {
                    if (agent.status === 'moving' && agent.target) {
                      // 根据行动类型决定线条颜色
                      const getLineColor = () => {
                        switch (agent.actionType) {
                          case 'purchase_building': return '#ffffff'; // 白色
                          case 'recruit_employee': return '#3b82f6'; // 蓝色
                          case 'attack': return '#ef4444'; // 红色
                          case 'intelligence': return '#f59e0b'; // 黄色
                          default: return '#6b7280'; // 灰色
                        }
                      };
                      
                      return (
                        <svg
                          key={`line-${agent.id}`}
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={{ zIndex: 1 }}
                        >
                          <line
                            x1={agent.x}
                            y1={agent.y}
                            x2={agent.target.x}
                            y2={agent.target.y}
                            stroke={getLineColor()}
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity="0.8"
                          />
                          {/* 箭头 */}
                          <defs>
                            <marker
                              id={`arrowhead-${agent.id}`}
                              markerWidth="10"
                              markerHeight="7"
                              refX="9"
                              refY="3.5"
                              orient="auto"
                            >
                              <polygon
                                points="0 0, 10 3.5, 0 7"
                                fill={getLineColor()}
                                opacity="0.8"
                              />
                            </marker>
                          </defs>
                          <line
                            x1={agent.x}
                            y1={agent.y}
                            x2={agent.target.x}
                            y2={agent.target.y}
                            stroke={getLineColor()}
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity="0.8"
                            markerEnd={`url(#arrowhead-${agent.id})`}
                          />
                        </svg>
                      );
                    }
                    return null;
                  })}
                  
                  {/* 建筑物 */}
                  {gameState.buildings.map((building) => (
                    <div
                      key={building.id}
                      className="absolute cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        left: building.x,
                        top: building.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2
                      }}
                      title={`${building.name} (Level ${building.level})${building.owner ? ' - 已占有' : ''}`}
                      onClick={() => selectBuilding(building)}
                    >
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                          building.owner === 'player' ? 'ring-2 ring-green-400' : 
                          building.owner ? 'ring-2 ring-red-400' : ''
                        }`}
                        style={{ backgroundColor: getBuildingColor(building.type) }}
                      >
                        {getBuildingIcon(building.type)}
                      </div>
                    </div>
                  ))}
                  
                  {/* 智能体 */}
                  {gameState.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="absolute cursor-pointer"
                      style={{
                        left: agent.x,
                        top: agent.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 3
                      }}
                      onClick={() => selectAgent(agent)}
                      title={`Agent ${agent.id} - ${agent.company} (${agent.status})${agent.actionType ? ` - ${agent.actionType}` : ''}`}
                    >
                      <div className={`w-4 h-4 rounded-full ${
                        agent.company === 'player' ? 'bg-green-500' : 'bg-red-500'
                      } ${agent.status === 'moving' ? 'animate-pulse' : ''} ${
                        gameState.selectedAgent?.id === agent.id ? 'ring-2 ring-yellow-400' : ''
                      }`}></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* 股市行情面板 */}
            <StockMarketPanel
              stockMarket={gameState.stockMarket}
              companyId="player"
              companyAssets={playerCompany?.assets || 0}
              onManipulationExecuted={onManipulationExecuted}
            />
            
            {/* 竞争态势面板 */}
            <CompetitionPanel
              gameState={gameState}
              playerCompany={playerCompany}
              aiCompanies={aiCompanies}
              onHostileTakeover={executeHostileTakeover}
            />
            
            {/* 实时分析面板 */}
            <RealTimeAnalysis
              gameState={gameState}
              playerCompany={playerCompany}
            />
            
            {/* 行动指南 */}
            <ActionLegend />
          </div>

          {/* 控制面板 */}
          <div className="space-y-4">
            {/* 公司管理 */}
            <Card className="bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-indigo-800/40 border-indigo-400/30 backdrop-blur-sm hover:border-indigo-300/50 transition-all duration-300 shadow-lg shadow-indigo-500/20">
              <CardHeader>
                <CardTitle className="text-indigo-200 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                  Company Matrix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/30 transition-all duration-300 border border-blue-400/30"
                  onClick={() => {
                    // 去贸易中心招聘员工
                    const tradeCenter = gameState.buildings.find(b => b.type === 'trade_center');
                    if (tradeCenter) {
                      recruitEmployeeWithMovement(tradeCenter.id, 'player');
                    }
                  }}
                  disabled={!playerCompany || playerCompany.assets < 50000}
                >
                  🧬 Neural Recruit (¥50,000)
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/30 transition-all duration-300 border border-green-400/30"
                  onClick={() => {
                    if (gameState.selectedBuilding && !gameState.selectedBuilding.owner) {
                      purchaseBuildingWithMovement(gameState.selectedBuilding.id, 'player');
                    }
                  }}
                  disabled={!gameState.selectedBuilding || !!gameState.selectedBuilding.owner}
                >
                  🏗️ Acquire Structure
                </Button>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/30 transition-all duration-300 border border-purple-400/30">
                  🔬 R&D Innovation
                </Button>
                {gameState.selectedBuilding && (
                  <div className="mt-4 p-3 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-lg border border-indigo-400/30 backdrop-blur-sm">
                    <h4 className="font-medium mb-2 text-indigo-200">{gameState.selectedBuilding.name}</h4>
                    <div className="text-sm text-indigo-300/80">
                      <div>Level: {gameState.selectedBuilding.level}</div>
                      <div>Revenue: ${gameState.selectedBuilding.income.toLocaleString()}/turn</div>
                      <div>Owner: {gameState.selectedBuilding.owner || 'Unoccupied'}</div>
                      <div>Type: {gameState.selectedBuilding.type}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 智能体控制 */}
            <Card className="bg-gradient-to-br from-orange-900/40 via-amber-900/30 to-orange-800/40 border-orange-400/30 backdrop-blur-sm hover:border-orange-300/50 transition-all duration-300 shadow-lg shadow-orange-500/20">
              <CardHeader>
                <CardTitle className="text-orange-200 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                  Neural Agent Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg shadow-orange-500/30 transition-all duration-300 border border-orange-400/30"
                  onClick={() => {
                    if (gameState.selectedAgent && gameState.selectedAgent.company === 'player') {
                      const tradeCenter = gameState.buildings.find(b => b.type === 'trade_center');
                      if (tradeCenter) {
                        moveAgent(gameState.selectedAgent.id, tradeCenter.x, tradeCenter.y, 'move');
                      }
                    }
                  }}
                  disabled={!gameState.selectedAgent || gameState.selectedAgent.company !== 'player'}
                >
                  🚀 Deploy to Trade Hub
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/30 transition-all duration-300 border border-red-400/30"
                  onClick={() => {
                    if (gameState.selectedAgent && gameState.selectedAgent.company === 'player') {
                      // 攻击最近的敌方建筑
                      const enemyBuildings = gameState.buildings.filter(b => b.owner && b.owner !== 'player');
                      if (enemyBuildings.length > 0) {
                        const targetBuilding = enemyBuildings[0]; // 简单选择第一个
                        moveAgent(gameState.selectedAgent.id, targetBuilding.x, targetBuilding.y, 'attack', targetBuilding.id);
                      }
                    }
                  }}
                  disabled={!gameState.selectedAgent || gameState.selectedAgent.company !== 'player'}
                >
                  ⚡ Execute Hostile Action
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 shadow-lg shadow-yellow-500/30 transition-all duration-300 border border-yellow-400/30"
                  onClick={() => {
                    if (gameState.selectedAgent && gameState.selectedAgent.company === 'player') {
                      // 去敌方公司收集情报
                      const enemyCompanyBuildings = gameState.buildings.filter(b => b.type === 'company' && b.owner && b.owner !== 'player');
                      if (enemyCompanyBuildings.length > 0) {
                        const targetBuilding = enemyCompanyBuildings[0];
                        moveAgent(gameState.selectedAgent.id, targetBuilding.x, targetBuilding.y, 'intelligence', targetBuilding.id);
                      }
                    }
                  }}
                  disabled={!gameState.selectedAgent || gameState.selectedAgent.company !== 'player'}
                >
                  🔍 Gather Intelligence
                </Button>
                {gameState.selectedAgent && (
                  <div className="mt-4 p-3 bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-lg border border-orange-400/30 backdrop-blur-sm">
                    <h4 className="font-medium mb-2 text-orange-200">Neural Agent {gameState.selectedAgent.id}</h4>
                    <div className="text-sm text-orange-300/80">
                      <div>🤝 Negotiation: {gameState.selectedAgent.skills.negotiation}</div>
                      <div>🕵️ Espionage: {gameState.selectedAgent.skills.espionage}</div>
                      <div>📊 Management: {gameState.selectedAgent.skills.management}</div>
                      <div>⚡ Status: {gameState.selectedAgent.status}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 竞争对手状态 */}
            <Card className="bg-gradient-to-br from-red-900/40 via-rose-900/30 to-red-800/40 border-red-400/30 backdrop-blur-sm hover:border-red-300/50 transition-all duration-300 shadow-lg shadow-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-200 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                  Threat Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiCompanies.map((competitor) => (
                    <div key={competitor.id} className="flex justify-between items-center p-3 bg-gradient-to-br from-red-900/50 to-rose-900/50 rounded-lg border border-red-400/30 backdrop-blur-sm hover:border-red-300/50 transition-all duration-300">
                      <div>
                        <div className="font-medium text-red-200">{competitor.name}</div>
                        <div className="text-sm text-red-300/80">
                          ${competitor.assets.toLocaleString()}
                        </div>
                        <div className="text-xs text-red-400/70">
                          {competitor.type === 'centralized' ? '🏛️ Centralized' : '🌐 Decentralized'}
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full animate-pulse ${
                        competitor.status === 'active' ? 'bg-red-400 shadow-lg shadow-red-500/50' : 'bg-gray-500'
                      }`}></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* 新闻通知 */}
      <NewsNotification
        recentEvents={gameState.recentEvents}
        marketNews={gameState.stockMarket.getMarketNews()}
      />
      
      {/* Toast 通知 */}
      <NewsToast
        notifications={notifications}
        onDismiss={dismiss}
      />
      
      {/* 收购通知 */}
      <AcquisitionNotification
        gameState={gameState}
        playerCompany={playerCompany}
        onHostileTakeover={executeHostileTakeover}
      />
      
      {/* Chat System */}
      <GameChat
        roomId="single-player"
        isMinimized={chatMinimized}
        onToggleMinimize={() => setChatMinimized(!chatMinimized)}
        className={chatMinimized ? '' : 'fixed bottom-4 right-4 w-80 h-96 z-50'}
      />
    </div>
  );
}
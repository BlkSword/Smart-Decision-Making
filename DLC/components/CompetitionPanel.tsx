"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Activity,
  Users,
  Building,
  DollarSign,
  Zap
} from 'lucide-react';
import { Company, GameState } from '@/lib/game/useGameState';
import { CompetitionEvent, CompetitionAnalytics } from '@/lib/game/competitionEngine';

interface CompetitionPanelProps {
  gameState: GameState;
  playerCompany: Company | undefined;
  aiCompanies: Company[];
  onHostileTakeover: (companyId: string) => any;
}

export const CompetitionPanel: React.FC<CompetitionPanelProps> = ({
  gameState,
  playerCompany,
  aiCompanies,
  onHostileTakeover
}) => {
  const { analytics, recentEvents, winner, victoryReason, gameStatus } = gameState;

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'bankrupt': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'asset_change': return <TrendingUp className="w-4 h-4" />;
      case 'building_acquired': return <Building className="w-4 h-4" />;
      case 'company_eliminated': return <AlertTriangle className="w-4 h-4" />;
      case 'hostile_takeover': return <Target className="w-4 h-4" />;
      case 'market_manipulation': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
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

  // 游戏结束界面
  if (gameStatus !== 'playing') {
    return (
      <Card className="bg-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            游戏结束
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${gameStatus === 'victory' ? 'text-green-400' : 'text-red-400'}`}>
              {gameStatus === 'victory' ? '🎉 胜利!' : '💀 失败'}
            </div>
            <div className="text-gray-300 mt-2">
              {winner?.name} {victoryReason}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">最终资产</div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(playerCompany?.assets || 0)}
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">市场份额</div>
              <div className="text-lg font-bold text-white">
                {Math.round(analytics.marketShare.player || 0)}%
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            重新开始
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-600">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          竞争态势
        </CardTitle>
        <CardDescription className="text-gray-400">
          实时竞争分析与企业对抗 • 一旦购买整家企业即可消灭竞争对手
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-700">
            <TabsTrigger value="overview" className="text-white">概览</TabsTrigger>
            <TabsTrigger value="companies" className="text-white">企业</TabsTrigger>
            <TabsTrigger value="events" className="text-white">事件</TabsTrigger>
            <TabsTrigger value="analytics" className="text-white">分析</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Elimination Prediction Alert */}
            {(() => {
              const activeCompanies = gameState.companies.filter(c => c.status === 'active');
              const vulnerableCompanies = activeCompanies.filter(c => 
                !c.isPlayer && 
                playerCompany && 
                playerCompany.assets >= c.assets * 1.2
              );
              
              if (vulnerableCompanies.length > 0) {
                return (
                  <div className="bg-gradient-to-r from-red-900/50 to-rose-900/50 p-4 rounded-lg border border-red-400/30 mb-4">
                    <div className="flex items-center gap-2 text-red-200 font-semibold mb-2">
                      <Target className="w-5 h-5" />
                      🎯 收购机会！
                    </div>
                    <div className="text-red-100 text-sm">
                      你现在有足够资金收购 {vulnerableCompanies.length} 家企业，立即消灭竞争对手！
                    </div>
                  </div>
                );
              }
              
              if (activeCompanies.length === 2) {
                return (
                  <div className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 p-4 rounded-lg border border-yellow-400/30 mb-4">
                    <div className="flex items-center gap-2 text-yellow-200 font-semibold mb-2">
                      <Trophy className="w-5 h-5" />
                      🏆 决战时刻！
                    </div>
                    <div className="text-yellow-100 text-sm">
                      只剩最后一个竞争对手，收购即可获得胜利！
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-700 p-3 rounded">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Activity className="w-4 h-4" />
                  竞争强度
                </div>
                <div className="text-lg font-bold text-white">
                  {Math.round(analytics.competitionIntensity)}%
                </div>
                <Progress 
                  value={analytics.competitionIntensity} 
                  className="h-2 mt-1"
                />
              </div>
              
              <div className="bg-gray-700 p-3 rounded">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="w-4 h-4" />
                  存活企业
                </div>
                <div className="text-lg font-bold text-white">
                  {gameState.companies.filter(c => c.status === 'active').length}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {gameState.companies.filter(c => c.status === 'bankrupt').length} 已出局
                </div>
              </div>
              
              <div className="bg-gray-700 p-3 rounded">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                  资产增长
                </div>
                <div className="text-lg font-bold text-white">
                  {formatCurrency(analytics.averageAssetGrowth)}
                </div>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded">
              <h4 className="text-white font-semibold mb-3">市场份额分布</h4>
              <div className="space-y-2">
                {Object.entries(analytics.marketShare).map(([companyId, share]) => {
                  const company = gameState.companies.find(c => c.id === companyId);
                  if (!company) return null;
                  
                  return (
                    <div key={companyId} className="flex items-center justify-between">
                      <span className="text-violet-200">{company.name}</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(company.status)}`} />
                        <span className="text-white font-medium">{Math.round(share)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            {gameState.companies.map(company => (
              <div key={company.id} className="bg-gradient-to-br from-violet-900/50 to-purple-900/50 p-4 rounded-lg border border-violet-400/30 hover:border-violet-300/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(company.status)}`} />
                    <span className="text-violet-200 font-semibold">{company.name}</span>
                    {company.isPlayer && (
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                        👤 Player
                      </Badge>
                    )}
                  </div>
                  <span className="text-violet-300/70">{company.type === 'centralized' ? '🏛️ Centralized' : '🌐 Decentralized'}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-violet-400/70">Assets</div>
                    <div className="text-violet-200 font-medium">{formatCurrency(company.assets)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-violet-400/70">Employees</div>
                    <div className="text-violet-200 font-medium">{company.employees}</div>
                  </div>
                  <div>
                    <div className="text-sm text-violet-400/70">Buildings</div>
                    <div className="text-violet-200 font-medium">{company.buildings.length}</div>
                  </div>
                </div>

                {!company.isPlayer && company.status === 'active' && playerCompany && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-violet-400/70">收购成本 (120%):</span>
                      <span className="text-violet-200 font-medium">{formatCurrency(Math.floor(company.assets * 1.2))}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-violet-400/70">收购后资产:</span>
                      <span className="text-violet-200 font-medium">{formatCurrency(playerCompany.assets - Math.floor(company.assets * 1.2))}</span>
                    </div>
                    <Button
                      onClick={() => {
                        if (window.confirm(`确定要收购 ${company.name} 吗？\n\n收购成本: ${formatCurrency(Math.floor(company.assets * 1.2))}\n收购后，该企业将被完全消灭并出局！`)) {
                          onHostileTakeover(company.id);
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white border-red-400/30 shadow-lg shadow-red-500/30 transition-all duration-300"
                      disabled={playerCompany.assets < company.assets * 1.2}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      {playerCompany.assets >= company.assets * 1.2 ? '💀 立即消灭企业' : '⚡ 资金不足'}
                    </Button>
                  </div>
                )}
                {company.status === 'bankrupt' && (
                  <div className="bg-gradient-to-r from-red-900/50 to-rose-900/50 p-3 rounded-lg border border-red-400/30">
                    <div className="flex items-center gap-2 text-red-200 font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      💀 企业已出局
                    </div>
                    <div className="text-red-100/70 text-sm mt-1">
                      该企业已被收购，所有资产已转移
                    </div>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="events" className="space-y-3">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {recentEvents.length > 0 ? (
                recentEvents.map((event, index) => (
                  <div key={event.id} className="bg-gradient-to-br from-violet-900/50 to-purple-900/50 p-3 rounded-lg border border-violet-400/30 flex items-start gap-3">
                    <div className={`${getEventColor(event.type)} mt-1`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-violet-200 text-sm">{event.description}</div>
                      <div className="text-violet-400/70 text-xs mt-1">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    {event.impact > 0 && (
                      <div className="text-yellow-400 text-sm font-medium">
                        {formatCurrency(event.impact)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-violet-400/70 py-8">
                  No competition events yet
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 p-4 rounded-lg border border-green-400/30">
                <h4 className="text-green-200 font-semibold mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-green-400" />
                  Building Control
                </h4>
                <div className="space-y-2">
                  {Object.entries(analytics.buildingControl).map(([companyId, control]) => {
                    const company = gameState.companies.find(c => c.id === companyId);
                    if (!company) return null;
                    
                    return (
                      <div key={companyId} className="flex items-center justify-between">
                        <span className="text-green-200 text-sm">{company.name}</span>
                        <span className="text-white font-medium">{Math.round(control)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 p-4 rounded-lg border border-blue-400/30">
                <h4 className="text-blue-200 font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-400" />
                  Asset Growth
                </h4>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {analytics.averageAssetGrowth > 0 ? '+' : ''}{formatCurrency(analytics.averageAssetGrowth)}
                  </div>
                  <div className="text-sm text-blue-300/70">Average Change</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-900/50 to-purple-900/50 p-4 rounded-lg border border-violet-400/30">
              <h4 className="text-violet-200 font-semibold mb-3">Competition Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-violet-300/70">Market Activity</div>
                  <Progress value={analytics.competitionIntensity} className="h-2 mt-1" />
                  <div className="text-xs text-violet-400/70 mt-1">
                    {Math.round(analytics.competitionIntensity)}% Active
                  </div>
                </div>
                <div>
                  <div className="text-sm text-violet-300/70">Investment Risk</div>
                  <Progress value={analytics.riskLevel} className="h-2 mt-1" />
                  <div className="text-xs text-violet-400/70 mt-1">
                    {Math.round(analytics.riskLevel)}% Risk
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
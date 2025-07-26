"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Activity,
  Users,
  Building,
  DollarSign,
  Trophy,
  Clock,
  Zap,
  Shield,
  Flame
} from 'lucide-react';
import { Company, GameState } from '@/lib/game/useGameState';

interface RealTimeAnalysisProps {
  gameState: GameState;
  playerCompany: Company | undefined;
}

interface EliminationPrediction {
  companyId: string;
  companyName: string;
  survivalProbability: number;
  timeToElimination: number; // in minutes
  threats: string[];
  assets: number;
}

interface MarketTrend {
  timestamp: number;
  totalAssets: number;
  competitionIntensity: number;
  activeCompanies: number;
}

export const RealTimeAnalysis: React.FC<RealTimeAnalysisProps> = ({
  gameState,
  playerCompany
}) => {
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [eliminationPredictions, setEliminationPredictions] = useState<EliminationPrediction[]>([]);

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const calculateEliminationPredictions = (): EliminationPrediction[] => {
    const activeCompanies = gameState.companies.filter(c => c.status === 'active');
    const totalAssets = activeCompanies.reduce((sum, c) => sum + c.assets, 0);
    
    return activeCompanies.map(company => {
      const threats: string[] = [];
      let survivalProbability = 100;
      let timeToElimination = Infinity;
      
      // Check if company can be acquired by others
      activeCompanies.forEach(other => {
        if (other.id !== company.id && other.assets >= company.assets * 1.5) {
          threats.push(`${other.name} 可以收购`);
          survivalProbability -= 30;
        }
      });
      
      // Check market share
      const marketShare = (company.assets / totalAssets) * 100;
      if (marketShare < 15) {
        threats.push('市场份额过低');
        survivalProbability -= 20;
      }
      
      // Check asset growth trend
      if (gameState.analytics.averageAssetGrowth < 0) {
        threats.push('资产持续下降');
        survivalProbability -= 15;
      }
      
      // Calculate time to elimination based on current trends
      if (survivalProbability < 70) {
        timeToElimination = Math.max(1, (100 - survivalProbability) / 10);
      }
      
      return {
        companyId: company.id,
        companyName: company.name,
        survivalProbability: Math.max(0, survivalProbability),
        timeToElimination,
        threats,
        assets: company.assets
      };
    });
  };

  // Update market trends and predictions
  useEffect(() => {
    const now = Date.now();
    const activeCompanies = gameState.companies.filter(c => c.status === 'active');
    const totalAssets = activeCompanies.reduce((sum, c) => sum + c.assets, 0);
    
    setMarketTrends(prev => {
      const newTrend: MarketTrend = {
        timestamp: now,
        totalAssets,
        competitionIntensity: gameState.analytics.competitionIntensity,
        activeCompanies: activeCompanies.length
      };
      
      // Keep only last 10 trends
      const updatedTrends = [...prev.slice(-9), newTrend];
      return updatedTrends;
    });
    
    setEliminationPredictions(calculateEliminationPredictions());
  }, [gameState]);

  const getCompanyRiskLevel = (prediction: EliminationPrediction) => {
    if (prediction.survivalProbability >= 80) return { color: 'text-green-400', label: '安全' };
    if (prediction.survivalProbability >= 50) return { color: 'text-yellow-400', label: '警告' };
    return { color: 'text-red-400', label: '危险' };
  };

  const getMarketTrend = () => {
    if (marketTrends.length < 2) return { trend: 'stable', color: 'text-gray-400' };
    
    const recent = marketTrends.slice(-3);
    const avgIntensity = recent.reduce((sum, t) => sum + t.competitionIntensity, 0) / recent.length;
    
    if (avgIntensity > 70) return { trend: 'intense', color: 'text-red-400' };
    if (avgIntensity > 40) return { trend: 'active', color: 'text-yellow-400' };
    return { trend: 'calm', color: 'text-green-400' };
  };

  const marketTrend = getMarketTrend();

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            实时市场分析
          </CardTitle>
          <CardDescription className="text-gray-400">
            当前市场状况与竞争态势
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Users className="w-4 h-4" />
                活跃企业
              </div>
              <div className="text-2xl font-bold text-white">
                {gameState.companies.filter(c => c.status === 'active').length}
              </div>
              <div className="text-xs text-gray-400">
                {gameState.companies.filter(c => c.status === 'bankrupt').length} 已淘汰
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <DollarSign className="w-4 h-4" />
                总市值
              </div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(gameState.companies.reduce((sum, c) => sum + c.assets, 0))}
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Flame className="w-4 h-4" />
                竞争强度
              </div>
              <div className="text-2xl font-bold text-white">
                {Math.round(gameState.analytics.competitionIntensity)}%
              </div>
              <div className={`text-xs ${marketTrend.color}`}>
                {marketTrend.trend === 'intense' ? '激烈竞争' : 
                 marketTrend.trend === 'active' ? '活跃竞争' : '平静市场'}
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Building className="w-4 h-4" />
                建筑控制
              </div>
              <div className="text-2xl font-bold text-white">
                {Object.values(gameState.analytics.buildingControl).reduce((sum, control) => sum + control, 0).toFixed(0)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Elimination Predictions */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            淘汰预测分析
          </CardTitle>
          <CardDescription className="text-gray-400">
            基于当前资产和市场趋势的生存概率分析
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {eliminationPredictions
              .sort((a, b) => a.survivalProbability - b.survivalProbability)
              .map(prediction => {
                const risk = getCompanyRiskLevel(prediction);
                const company = gameState.companies.find(c => c.id === prediction.companyId);
                
                return (
                  <div key={prediction.companyId} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{prediction.companyName}</span>
                        {company?.isPlayer && (
                          <Badge variant="secondary" className="bg-blue-600">
                            玩家
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${risk.color}`}>
                          {risk.label}
                        </span>
                        <Badge variant="outline" className={`${risk.color} border-current`}>
                          {Math.round(prediction.survivalProbability)}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">资产:</span>
                        <span className="text-white">{formatCurrency(prediction.assets)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">生存概率:</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={prediction.survivalProbability} 
                            className="h-2 w-24"
                          />
                          <span className="text-white">{Math.round(prediction.survivalProbability)}%</span>
                        </div>
                      </div>
                      
                      {prediction.threats.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm text-gray-400 mb-1">威胁:</div>
                          <div className="flex flex-wrap gap-1">
                            {prediction.threats.map((threat, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {threat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {prediction.timeToElimination < 10 && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <Clock className="w-4 h-4" />
                          预计 {prediction.timeToElimination.toFixed(1)} 分钟内可能被淘汰
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Market Trends */}
      {marketTrends.length > 3 && (
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              市场趋势图
            </CardTitle>
            <CardDescription className="text-gray-400">
              最近几分钟的市场变化趋势
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-32 bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-gray-400 text-sm">
                  📊 趋势图表 (简化版)
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400">平均资产增长</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(gameState.analytics.averageAssetGrowth)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-400">竞争强度趋势</div>
                  <div className="text-lg font-bold text-white">
                    {marketTrends.length >= 2 ? (
                      marketTrends[marketTrends.length - 1].competitionIntensity > 
                      marketTrends[marketTrends.length - 2].competitionIntensity ? (
                        <span className="text-red-400">↗ 上升</span>
                      ) : (
                        <span className="text-green-400">↘ 下降</span>
                      )
                    ) : (
                      <span className="text-gray-400">稳定</span>
                    )}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-400">企业数量</div>
                  <div className="text-lg font-bold text-white">
                    {gameState.companies.filter(c => c.status === 'active').length}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
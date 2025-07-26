"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle,
  Target,
  Trophy,
  DollarSign,
  Building,
  Users,
  Clock,
  Zap,
  X,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Company, GameState } from '@/lib/game/useGameState';
import { CompetitionEvent } from '@/lib/game/competitionEngine';

interface AcquisitionNotificationProps {
  gameState: GameState;
  playerCompany: Company | undefined;
  onHostileTakeover: (companyId: string) => any;
  onDismiss?: () => void;
}

interface AcquisitionOpportunity {
  targetCompany: Company;
  cost: number;
  profit: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeRemaining: number;
  advantages: string[];
}

export const AcquisitionNotification: React.FC<AcquisitionNotificationProps> = ({
  gameState,
  playerCompany,
  onHostileTakeover,
  onDismiss
}) => {
  const [opportunities, setOpportunities] = useState<AcquisitionOpportunity[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<AcquisitionOpportunity | null>(null);

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const calculateOpportunities = (): AcquisitionOpportunity[] => {
    if (!playerCompany) return [];
    
    const activeCompanies = gameState.companies.filter(c => c.status === 'active' && !c.isPlayer);
    const totalAssets = gameState.companies.reduce((sum, c) => sum + c.assets, 0);
    
    return activeCompanies.map(company => {
      const cost = Math.floor(company.assets * 1.2);
      const profit = company.assets + (company.buildings.length * 50000); // 估算资产价值
      const canAfford = playerCompany.assets >= cost;
      
      let riskLevel: 'low' | 'medium' | 'high' = 'medium';
      const marketShare = (company.assets / totalAssets) * 100;
      
      if (marketShare < 10) riskLevel = 'low';
      else if (marketShare > 25) riskLevel = 'high';
      
      const advantages: string[] = [];
      if (company.buildings.length > 0) {
        advantages.push(`${company.buildings.length}个建筑设施`);
      }
      if (company.employees > 10) {
        advantages.push(`${company.employees}名员工`);
      }
      if (marketShare > 15) {
        advantages.push(`${marketShare.toFixed(1)}%市场份额`);
      }
      
      // 估算收购时间窗口
      const timeRemaining = canAfford ? Math.max(1, 10 - marketShare / 5) : Infinity;
      
      return {
        targetCompany: company,
        cost,
        profit,
        riskLevel,
        timeRemaining,
        advantages
      };
    }).filter(opp => playerCompany.assets >= opp.cost * 0.6); // 只显示接近可以收购的（降低门槛）
  };

  useEffect(() => {
    setOpportunities(calculateOpportunities());
  }, [gameState, playerCompany]);

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-900/20 border-green-400/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-400/30';
      case 'high': return 'text-red-400 bg-red-900/20 border-red-400/30';
    }
  };

  const getRiskIcon = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <Target className="w-4 h-4" />;
    }
  };

  const handleAcquisition = (opportunity: AcquisitionOpportunity) => {
    const confirmMessage = `
🎯 确认收购 ${opportunity.targetCompany.name}？

💰 收购成本: ${formatCurrency(opportunity.cost)}
💎 预期价值: ${formatCurrency(opportunity.profit)}
🏢 获得资产: ${opportunity.advantages.join(', ')}
⚠️ 风险等级: ${opportunity.riskLevel === 'low' ? '低' : opportunity.riskLevel === 'medium' ? '中' : '高'}

收购后该企业将被完全淘汰并出局！
此操作无法撤销。`;

    if (window.confirm(confirmMessage)) {
      onHostileTakeover(opportunity.targetCompany.id);
    }
  };

  const vulnerableCompanies = opportunities.filter(opp => 
    playerCompany && playerCompany.assets >= opp.cost
  );

  const nearVictoryConditions = gameState.companies.filter(c => c.status === 'active').length <= 2;

  if (opportunities.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 space-y-2">
      {/* Main Alert */}
      {vulnerableCompanies.length > 0 && (
        <Card className="bg-gradient-to-br from-red-900/90 to-rose-900/90 border-red-400/40 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-400 animate-pulse" />
                <CardTitle className="text-red-200 text-lg">
                  🎯 收购机会
                </CardTitle>
              </div>
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <CardDescription className="text-red-100/80">
              {vulnerableCompanies.length}家企业可立即收购并淘汰！
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {vulnerableCompanies.slice(0, 2).map((opportunity, index) => (
              <div key={opportunity.targetCompany.id} className="bg-red-900/30 p-3 rounded-lg border border-red-400/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-red-100 font-semibold">{opportunity.targetCompany.name}</span>
                    <Badge className={`text-xs ${getRiskColor(opportunity.riskLevel)}`}>
                      {getRiskIcon(opportunity.riskLevel)}
                      {opportunity.riskLevel === 'low' ? '低风险' : opportunity.riskLevel === 'medium' ? '中风险' : '高风险'}
                    </Badge>
                  </div>
                  {nearVictoryConditions && (
                    <Badge variant="destructive" className="bg-yellow-600 text-black animate-pulse">
                      🏆 决胜
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex items-center gap-1 text-red-200">
                    <DollarSign className="w-3 h-3" />
                    成本: {formatCurrency(opportunity.cost)}
                  </div>
                  <div className="flex items-center gap-1 text-red-200">
                    <TrendingUp className="w-3 h-3" />
                    价值: {formatCurrency(opportunity.profit)}
                  </div>
                  <div className="flex items-center gap-1 text-red-200">
                    <Building className="w-3 h-3" />
                    建筑: {opportunity.targetCompany.buildings.length}
                  </div>
                  <div className="flex items-center gap-1 text-red-200">
                    <Users className="w-3 h-3" />
                    员工: {opportunity.targetCompany.employees}
                  </div>
                </div>
                
                {opportunity.advantages.length > 0 && (
                  <div className="text-xs text-red-200/80 mb-2">
                    获得: {opportunity.advantages.join(', ')}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAcquisition(opportunity)}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    立即收购
                  </Button>
                  <Button
                    onClick={() => setSelectedOpportunity(opportunity)}
                    size="sm"
                    variant="outline"
                    className="text-red-200 border-red-400/30 hover:bg-red-900/20"
                  >
                    详情
                  </Button>
                </div>
              </div>
            ))}
            
            {vulnerableCompanies.length > 2 && (
              <div className="text-center">
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="ghost"
                  size="sm"
                  className="text-red-300 hover:text-red-200"
                >
                  查看全部 {vulnerableCompanies.length} 个机会
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Near Victory Warning */}
      {nearVictoryConditions && (
        <Card className="bg-gradient-to-br from-yellow-900/90 to-amber-900/90 border-yellow-400/40 backdrop-blur-sm shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-200">
              <Trophy className="w-5 h-5 animate-bounce" />
              <span className="font-semibold">🏆 决战时刻！</span>
            </div>
            <p className="text-yellow-100/80 text-sm mt-1">
              只剩最后一个对手，收购即可获得胜利！
            </p>
          </CardContent>
        </Card>
      )}

      {/* Elimination Alerts */}
      {gameState.recentEvents
        .filter(event => event.type === 'company_eliminated')
        .slice(0, 1)
        .map((event, index) => (
          <Card key={event.id} className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 border-purple-400/40 backdrop-blur-sm shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-200">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">💀 企业淘汰</span>
              </div>
              <p className="text-purple-100/80 text-sm mt-1">
                {event.description}
              </p>
              <div className="text-xs text-purple-300/60 mt-2">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
};
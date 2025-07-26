"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Zap, 
  Shield, 
  Target,
  Eye,
  Clock,
  DollarSign,
  BarChart3,
  Newspaper
} from 'lucide-react';
import { StockMarket, Stock, MarketManipulationType, MarketManipulationAction } from '@/lib/game/stockMarket';

interface StockMarketPanelProps {
  stockMarket: StockMarket;
  companyId: string;
  companyAssets: number;
  onManipulationExecuted: (cost: number, message: string) => void;
}

export default function StockMarketPanel({ 
  stockMarket, 
  companyId, 
  companyAssets, 
  onManipulationExecuted 
}: StockMarketPanelProps) {
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [selectedManipulation, setSelectedManipulation] = useState<MarketManipulationType | null>(null);
  const [showOrderBook, setShowOrderBook] = useState(false);

  const stocks = stockMarket.getAllStocks();
  const manipulationActions = stockMarket.getManipulationActions();
  const marketNews = stockMarket.getMarketNews();

  const handleManipulation = (type: MarketManipulationType) => {
    if (!selectedStock) {
      alert('请先选择股票');
      return;
    }

    const action = manipulationActions.find(a => a.type === type);
    if (!action) return;

    if (companyAssets < action.cost) {
      alert('资金不足');
      return;
    }

    const result = stockMarket.executeManipulation(companyId, selectedStock, type);
    onManipulationExecuted(result.cost, result.message);
  };

  const getManipulationIcon = (type: MarketManipulationType) => {
    const iconMap: Record<MarketManipulationType, React.ReactNode> = {
      'rumor_spread': <Newspaper className="h-4 w-4" />,
      'wash_trading': <BarChart3 className="h-4 w-4" />,
      'price_manipulation': <TrendingUp className="h-4 w-4" />,
      'insider_trading': <Eye className="h-4 w-4" />,
      'limit_up_manipulation': <Target className="h-4 w-4" />,
      'closing_manipulation': <Clock className="h-4 w-4" />,
      'algo_manipulation': <Zap className="h-4 w-4" />
    };
    return iconMap[type];
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getManipulationDescription = (type: MarketManipulationType) => {
    const descriptions: Record<MarketManipulationType, string> = {
      'rumor_spread': '发布虚假消息影响股价，低成本但容易被发现',
      'wash_trading': '自买自卖创造虚假交易量，影响技术指标',
      'price_manipulation': '通过大量买卖操纵价格，直接有效',
      'insider_trading': '利用内幕信息进行交易，收益高但风险大',
      'limit_up_manipulation': '操纵股价触及涨停板，制造恐慌心理',
      'closing_manipulation': '在收盘前大量交易影响收盘价',
      'algo_manipulation': '使用算法进行高频交易操纵，难以检测'
    };
    return descriptions[type] || '未知操纵类型';
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-emerald-800/40 border-emerald-400/30 backdrop-blur-sm hover:border-emerald-300/50 transition-all duration-300 shadow-lg shadow-emerald-500/20 h-80">
      <CardHeader>
        <CardTitle className="text-emerald-200 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          <DollarSign className="h-5 w-5 text-emerald-400 drop-shadow-lg" />
          Neural Market System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stocks" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-emerald-900/30 border-emerald-400/30">
            <TabsTrigger value="stocks" className="text-emerald-200 data-[state=active]:bg-emerald-600/80 data-[state=active]:text-white">📈 Market Data</TabsTrigger>
            <TabsTrigger value="manipulation" className="text-emerald-200 data-[state=active]:bg-emerald-600/80 data-[state=active]:text-white">🧬 Manipulation</TabsTrigger>
            <TabsTrigger value="news" className="text-emerald-200 data-[state=active]:bg-emerald-600/80 data-[state=active]:text-white">📡 Intelligence</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stocks" className="space-y-2">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {stocks.map((stock) => (
                <div
                  key={stock.id}
                  className={`p-2 rounded-lg cursor-pointer transition-colors border ${
                    selectedStock === stock.id 
                      ? 'bg-gradient-to-br from-emerald-600/80 to-teal-600/80 border-emerald-400/50' 
                      : 'bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border-emerald-400/30 hover:border-emerald-300/50'
                  }`}
                  onClick={() => setSelectedStock(stock.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm text-emerald-200">{stock.symbol}</div>
                      <div className="text-xs text-emerald-400/70">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-emerald-200">¥{stock.price.toFixed(2)}</div>
                      <div className={`text-xs flex items-center gap-1 ${
                        stock.change >= 0 ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-400/60 mt-1">
                    Volume: {(stock.volume / 1000000).toFixed(1)}M
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="manipulation" className="space-y-2">
            {selectedStock ? (
              <div className="space-y-2">
                <div className="text-sm text-emerald-300 mb-2">
                  Selected: {stocks.find(s => s.id === selectedStock)?.symbol}
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {manipulationActions.map((action) => (
                    <div
                      key={action.type}
                      className="p-2 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-lg border border-emerald-400/30 hover:border-emerald-300/50 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 flex-1">
                          {getManipulationIcon(action.type)}
                          <div>
                            <span className="text-sm font-medium text-emerald-200">{action.description}</span>
                            <div className="text-xs text-emerald-400/70 mt-1">
                              {getManipulationDescription(action.type)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <div className={`w-2 h-2 rounded-full ${getRiskColor(action.riskLevel)}`}></div>
                          <span className="text-xs text-emerald-400/70">{action.riskLevel}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-emerald-400/70">
                          <div>Cost: ¥{action.cost.toLocaleString()}</div>
                          <div>Success: {(action.successRate * 100).toFixed(0)}% | Detection: {(action.detectionRisk * 100).toFixed(0)}%</div>
                          <div>Impact: {(action.impact * 100).toFixed(1)}% | Duration: {action.duration} turns</div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleManipulation(action.type)}
                          disabled={companyAssets < action.cost}
                          className={`text-xs px-3 py-1 h-7 transition-colors border ${
                            companyAssets < action.cost 
                              ? 'bg-gray-600/50 cursor-not-allowed border-gray-500/50' 
                              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white border-red-400/30 shadow-lg shadow-red-500/30'
                          }`}
                        >
                          Execute
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-emerald-400/70 py-8">
                Select a stock first
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="news" className="space-y-2">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {marketNews.map((news) => (
                <div
                  key={news.id}
                  className="p-2 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-lg border border-emerald-400/30"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={news.type === 'positive' ? 'default' : 'destructive'} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                          {news.type === 'positive' ? '📈 BULLISH' : '📉 BEARISH'}
                        </Badge>
                        {news.isFake && (
                          <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            SUSPECTED FAKE
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium mt-1 text-emerald-200">{news.headline}</div>
                      <div className="text-xs text-emerald-400/70 mt-1">{news.content}</div>
                    </div>
                    <div className="text-xs text-emerald-500/60 ml-2">
                      {new Date(news.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
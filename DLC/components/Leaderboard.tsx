'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Clock, DollarSign, Target, Users, RefreshCw, Filter, Star, Crown, Zap } from 'lucide-react';

interface LeaderboardEntry {
  userId: number;
  userName: string;
  email: string;
  rank: number;
  gamesPlayed: number;
  gamesWon: number;
  averageRank: number;
  totalPlayTime: number;
  highestAssets: number;
  lastPlayed: string;
  winRate: number;
  // 成就相关
  achievementPoints?: number;
  achievementCount?: number;
  badges?: string[];
  titles?: string[];
  recentAchievements?: any[];
}

interface LeaderboardProps {
  className?: string;
}

export default function Leaderboard({ className = '' }: LeaderboardProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('gamesWon');
  const [error, setError] = useState<string>('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?sortBy=${sortBy}&limit=50`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      setLeaderboardData(data.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-gray-400 font-semibold">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 2:
        return 'bg-gray-400/20 text-gray-400 border-gray-400/30';
      case 3:
        return 'bg-amber-600/20 text-amber-600 border-amber-600/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const formatPlayTime = (seconds: any) => {
    if (seconds === null || seconds === undefined) return '0m';
    const time = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    if (isNaN(time)) return '0m';
    
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatAssets = (assets: any) => {
    if (assets === null || assets === undefined) return '$0';
    const assetValue = typeof assets === 'string' ? parseFloat(assets) : assets;
    if (isNaN(assetValue)) return '$0';
    
    if (assetValue >= 1000000) {
      return `$${(assetValue / 1000000).toFixed(1)}M`;
    } else if (assetValue >= 1000) {
      return `$${(assetValue / 1000).toFixed(1)}K`;
    }
    return `$${assetValue}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatWinRate = (winRate: any) => {
    if (winRate === null || winRate === undefined) return '0.0';
    const rate = typeof winRate === 'string' ? parseFloat(winRate) : winRate;
    if (isNaN(rate)) return '0.0';
    return rate.toFixed(1);
  };

  const formatNumber = (num: any) => {
    if (num === null || num === undefined) return '0';
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) return '0';
    return number.toFixed(1);
  };

  const sortOptions = [
    { value: 'gamesWon', label: '获胜次数', icon: Trophy },
    { value: 'gamesPlayed', label: '游戏场次', icon: Users },
    { value: 'averageRank', label: '平均排名', icon: Target },
    { value: 'totalPlayTime', label: '游戏时长', icon: Clock },
    { value: 'highestAssets', label: '最高资产', icon: DollarSign },
    { value: 'achievementPoints', label: '成就点数', icon: Star },
    { value: 'achievementCount', label: '成就数量', icon: Award },
  ];

  if (loading) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/30 ${className}`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={fetchLeaderboard} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-blue-500/30 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-blue-300">排行榜</h2>
          </div>
          <Button
            onClick={fetchLeaderboard}
            variant="outline"
            size="sm"
            className="border-blue-500/30 hover:border-blue-400"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* Sort Options */}
      <div className="p-4 border-b border-blue-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-blue-300">排序方式:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              onClick={() => setSortBy(option.value)}
              variant={sortBy === option.value ? "default" : "outline"}
              size="sm"
              className={`text-xs ${
                sortBy === option.value
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'border-blue-500/30 hover:border-blue-400'
              }`}
            >
              <option.icon className="h-3 w-3 mr-1" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-h-96 overflow-y-auto">
        {leaderboardData.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">暂无数据</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {leaderboardData.map((player) => (
              <div
                key={player.userId}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  player.rank <= 3
                    ? 'bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/30'
                    : 'bg-slate-700/30 border-slate-600/30 hover:border-blue-500/30'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(player.rank)}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">
                      {player.userName || '未知玩家'}
                    </h3>
                    <Badge className={getRankBadgeColor(player.rank)}>
                      #{player.rank}
                    </Badge>
                    {/* 显示玩家称号 */}
                    {player.titles && player.titles.length > 0 && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        <Crown className="h-3 w-3 mr-1" />
                        {player.titles[0]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-gray-400 truncate">
                      {player.email}
                    </p>
                    {/* 显示徽章 */}
                    {player.badges && player.badges.length > 0 && (
                      <div className="flex gap-1">
                        {player.badges.slice(0, 3).map((badge, index) => (
                          <Badge key={index} className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            {badge}
                          </Badge>
                        ))}
                        {player.badges.length > 3 && (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                            +{player.badges.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {/* 成就点数和数量 */}
                  {(player.achievementPoints || player.achievementCount) && (
                    <div className="flex items-center gap-3 text-xs">
                      {player.achievementPoints && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="h-3 w-3" />
                          {player.achievementPoints}点
                        </div>
                      )}
                      {player.achievementCount && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <Award className="h-3 w-3" />
                          {player.achievementCount}个成就
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-green-400 font-semibold">{player.gamesWon}</div>
                    <div className="text-xs text-gray-400">胜利</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-semibold">{player.gamesPlayed}</div>
                    <div className="text-xs text-gray-400">场次</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-400 font-semibold">{formatWinRate(player.winRate)}%</div>
                    <div className="text-xs text-gray-400">胜率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-semibold">{formatAssets(player.highestAssets)}</div>
                    <div className="text-xs text-gray-400">最高资产</div>
                  </div>
                  {/* 成就统计 */}
                  <div className="text-center">
                    <div className="text-orange-400 font-semibold">
                      {player.achievementCount || 0}
                    </div>
                    <div className="text-xs text-gray-400">成就</div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="hidden lg:block text-xs text-gray-400 text-right">
                  <div>平均排名: #{formatNumber(player.averageRank)}</div>
                  <div>游戏时长: {formatPlayTime(player.totalPlayTime)}</div>
                  <div>最后游戏: {formatDate(player.lastPlayed)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
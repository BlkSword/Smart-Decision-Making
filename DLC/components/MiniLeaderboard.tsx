'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Award, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaderboardEntry {
  userId: number;
  userName: string;
  email: string;
  rank: number;
  gamesPlayed: number | string;
  gamesWon: number | string;
  winRate: number | string | null;
  highestAssets: number | string | null;
}

interface MiniLeaderboardProps {
  className?: string;
}

export default function MiniLeaderboard({ className = '' }: MiniLeaderboardProps) {
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPlayers();
  }, []);

  const fetchTopPlayers = async () => {
    try {
      const response = await fetch('/api/leaderboard?sortBy=gamesWon&limit=5');
      if (response.ok) {
        const data = await response.json();
        setTopPlayers(data.data);
      }
    } catch (error) {
      console.error('Error fetching top players:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-xs text-gray-400">#{rank}</span>;
    }
  };

  const formatAssets = (assets: number | string | null) => {
    const numAssets = typeof assets === 'string' ? parseFloat(assets) : assets;
    if (!numAssets || numAssets === 0) return '$0';
    if (numAssets >= 1000000) {
      return `$${(numAssets / 1000000).toFixed(1)}M`;
    } else if (numAssets >= 1000) {
      return `$${(numAssets / 1000).toFixed(1)}K`;
    }
    return `$${numAssets}`;
  };

  const formatWinRate = (winRate: number | string | null) => {
    const numWinRate = typeof winRate === 'string' ? parseFloat(winRate) : winRate;
    if (!numWinRate && numWinRate !== 0) return '0';
    return numWinRate.toFixed(0);
  };

  const formatNumber = (value: number | string | null) => {
    const numValue = typeof value === 'string' ? parseInt(value) : value;
    return numValue || 0;
  };

  if (loading) {
    return (
      <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-blue-300">顶级玩家</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-700/50 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-blue-300">顶级玩家</h3>
        </div>
        <Button
          onClick={() => window.open('/leaderboard', '_blank')}
          variant="ghost"
          size="sm"
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          查看全部
        </Button>
      </div>

      <div className="space-y-2">
        {topPlayers.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-sm">
            暂无排行数据
          </div>
        ) : (
          topPlayers.map((player) => (
            <div
              key={player.userId}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center justify-center w-6">
                {getRankIcon(player.rank)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm truncate">
                  {player.userName || '未知玩家'}
                </div>
                <div className="text-xs text-gray-400">
                  {formatNumber(player.gamesWon)}胜 / {formatNumber(player.gamesPlayed)}场
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-green-400 font-medium">
                  {formatWinRate(player.winRate)}%
                </div>
                <div className="text-xs text-gray-400">
                  {formatAssets(player.highestAssets)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {topPlayers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-600/50">
          <div className="text-xs text-gray-400 text-center">
            想要上榜？开始游戏赢得更多比赛吧！
          </div>
        </div>
      )}
    </div>
  );
}
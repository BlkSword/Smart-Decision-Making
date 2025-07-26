'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Award, Crown, Zap, Trophy, Target, Users, DollarSign, Clock } from 'lucide-react';
import { Achievement, ACHIEVEMENT_COLORS } from '@/lib/game/achievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked?: boolean;
  className?: string;
}

export function AchievementBadge({ achievement, unlocked = false, className = '' }: AchievementBadgeProps) {
  const rarityColor = ACHIEVEMENT_COLORS.rarity[achievement.rarity];
  const categoryColor = ACHIEVEMENT_COLORS.category[achievement.category];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'business':
        return <DollarSign className="h-3 w-3" />;
      case 'competition':
        return <Trophy className="h-3 w-3" />;
      case 'strategy':
        return <Target className="h-3 w-3" />;
      case 'collection':
        return <Users className="h-3 w-3" />;
      case 'special':
        return <Star className="h-3 w-3" />;
      default:
        return <Award className="h-3 w-3" />;
    }
  };

  return (
    <Card className={`${className} relative transition-all duration-200 ${
      unlocked 
        ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/50 hover:border-blue-400/70' 
        : 'bg-slate-800/60 border-slate-600/40 opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
    }`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`text-lg transition-all duration-200 ${
            unlocked ? '' : 'opacity-50 grayscale'
          }`}>
            {achievement.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <h4 className={`font-semibold text-sm truncate transition-all duration-200 ${
                unlocked ? 'text-white' : 'text-gray-400'
              }`}>
                {achievement.name}
              </h4>
              {unlocked && (
                <Crown className="h-3 w-3 text-yellow-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 mb-1">
              <Badge 
                className={`text-xs px-1 py-0 transition-all duration-200 ${
                  unlocked ? '' : 'opacity-50 grayscale'
                }`}
                style={{ 
                  backgroundColor: unlocked ? `${rarityColor}20` : '#374151',
                  color: unlocked ? rarityColor : '#6B7280',
                  borderColor: unlocked ? `${rarityColor}30` : '#4B5563'
                }}
              >
                {achievement.rarity}
              </Badge>
              <Badge 
                className={`text-xs px-1 py-0 transition-all duration-200 ${
                  unlocked ? '' : 'opacity-50 grayscale'
                }`}
                style={{ 
                  backgroundColor: unlocked ? `${categoryColor}20` : '#374151',
                  color: unlocked ? categoryColor : '#6B7280',
                  borderColor: unlocked ? `${categoryColor}30` : '#4B5563'
                }}
              >
                <span className={unlocked ? '' : 'opacity-70'}>
                  {getCategoryIcon(achievement.category)}
                </span>
                <span className="ml-1">{achievement.category}</span>
              </Badge>
            </div>
          </div>
        </div>
        
        <p className={`text-xs mb-2 transition-all duration-200 ${
          unlocked ? 'text-gray-300' : 'text-gray-500'
        }`}>
          {achievement.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className={`h-3 w-3 transition-all duration-200 ${
              unlocked ? 'text-yellow-400' : 'text-gray-500 opacity-50'
            }`} />
            <span className={`text-xs transition-all duration-200 ${
              unlocked ? 'text-yellow-400' : 'text-gray-500'
            }`}>
              {achievement.reward.points}
            </span>
          </div>
          {achievement.reward.title && (
            <Badge className={`text-xs transition-all duration-200 ${
              unlocked 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                : 'bg-gray-600/20 text-gray-500 border-gray-600/30 opacity-50'
            }`}>
              {achievement.reward.title}
            </Badge>
          )}
        </div>
        
        {/* 未完成成就的锁定指示器 */}
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="bg-slate-700/80 rounded-full p-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AchievementProgressProps {
  userId: number;
  achievements: Achievement[];
  unlockedAchievements: string[];
  className?: string;
}

export function AchievementProgress({ 
  userId, 
  achievements, 
  unlockedAchievements, 
  className = '' 
}: AchievementProgressProps) {
  const categories = ['business', 'competition', 'strategy', 'collection', 'special'];
  const totalAchievements = achievements.length;
  const unlockedCount = unlockedAchievements.length;
  const completionRate = Math.round((unlockedCount / totalAchievements) * 100);

  const getCategoryStats = (category: string) => {
    const categoryAchievements = achievements.filter(a => a.category === category);
    const categoryUnlocked = categoryAchievements.filter(a => unlockedAchievements.includes(a.id));
    return {
      total: categoryAchievements.length,
      unlocked: categoryUnlocked.length,
      rate: Math.round((categoryUnlocked.length / categoryAchievements.length) * 100)
    };
  };

  return (
    <Card className={`bg-slate-800/50 backdrop-blur-sm border-blue-500/30 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-blue-300">成就进度</h3>
        </div>
        
        {/* 总体进度 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">总进度</span>
            <span className="text-sm text-blue-400">{unlockedCount}/{totalAchievements}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-400 mt-1">{completionRate}% 完成</div>
        </div>

        {/* 分类进度 */}
        <div className="space-y-2">
          {categories.map(category => {
            const stats = getCategoryStats(category);
            const color = ACHIEVEMENT_COLORS.category[category];
            
            return (
              <div key={category} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-300 capitalize">{category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{stats.unlocked}/{stats.total}</span>
                  <div className="w-16 bg-gray-700 rounded-full h-1">
                    <div 
                      className="h-1 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${stats.rate}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentAchievementsProps {
  achievements: Achievement[];
  className?: string;
}

export function RecentAchievements({ achievements, className = '' }: RecentAchievementsProps) {
  if (achievements.length === 0) {
    return (
      <Card className={`bg-slate-800/50 backdrop-blur-sm border-blue-500/30 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-blue-300">最近成就</h3>
          </div>
          <div className="text-center text-gray-400 py-8">
            <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无最近获得的成就</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-slate-800/50 backdrop-blur-sm border-blue-500/30 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-300">最近成就</h3>
        </div>
        
        <div className="space-y-2">
          {achievements.slice(0, 5).map((achievement) => (
            <div 
              key={achievement.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20"
            >
              <div className="text-sm">{achievement.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-white truncate">
                    {achievement.name}
                  </h4>
                  <Badge 
                    className="text-xs px-1 py-0"
                    style={{ 
                      backgroundColor: `${ACHIEVEMENT_COLORS.rarity[achievement.rarity]}20`,
                      color: ACHIEVEMENT_COLORS.rarity[achievement.rarity],
                      borderColor: `${ACHIEVEMENT_COLORS.rarity[achievement.rarity]}30`
                    }}
                  >
                    {achievement.rarity}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 truncate">{achievement.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <span className="text-xs text-yellow-400">{achievement.reward.points}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
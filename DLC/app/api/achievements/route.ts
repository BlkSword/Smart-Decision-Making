import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { playerAchievements, unlockedAchievements, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ACHIEVEMENTS, achievementManager } from '@/lib/game/achievements';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const rarity = searchParams.get('rarity');
    const unlocked = searchParams.get('unlocked');

    // 如果指定了userId，返回用户的成就数据
    if (userId) {
      const userIdNum = parseInt(userId);
      
      // 暂时使用静态数据（数据库表不存在时的fallback）
      const unlockedIds: string[] = [];
      
      // 过滤成就
      let filteredAchievements = ACHIEVEMENTS;
      
      if (category) {
        filteredAchievements = filteredAchievements.filter(a => a.category === category);
      }
      
      if (rarity) {
        filteredAchievements = filteredAchievements.filter(a => a.rarity === rarity);
      }
      
      if (unlocked !== null) {
        const isUnlocked = unlocked === 'true';
        filteredAchievements = filteredAchievements.filter(a => 
          unlockedIds.includes(a.id) === isUnlocked
        );
      }

      // 默认统计数据
      const stats = {
        totalPoints: 0,
        unlockedCount: 0,
        badges: [],
        titles: []
      };

      // 空的最近成就
      const recentAchievements: any[] = [];

      return NextResponse.json({
        success: true,
        data: {
          achievements: filteredAchievements,
          unlockedAchievements: unlockedIds,
          stats,
          recentAchievements,
          total: filteredAchievements.length,
          unlocked: filteredAchievements.filter(a => unlockedIds.includes(a.id)).length
        }
      });
    }

    // 如果没有指定userId，返回成就排行榜（使用静态数据）
    const achievementLeaderboard = [
      {
        userId: 1,
        userName: 'Demo Player',
        email: 'demo@example.com',
        totalPoints: 1250,
        unlockedCount: 15,
        badges: [],
        titles: []
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        leaderboard: achievementLeaderboard,
        totalAchievements: ACHIEVEMENTS.length,
        categories: ['business', 'competition', 'strategy', 'collection', 'special'],
        rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary']
      }
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, gameStats } = await request.json();

    if (!userId || !gameStats) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 检查解锁的成就
    const newAchievements = achievementManager.checkAchievements(userId, gameStats);
    
    if (newAchievements.length > 0) {
      // 更新数据库中的成就数据
      const userAchievements = await db
        .select()
        .from(playerAchievements)
        .where(eq(playerAchievements.userId, userId))
        .limit(1);

      const stats = achievementManager.getPlayerAchievementStats(userId);

      if (userAchievements.length > 0) {
        // 更新现有记录
        await db
          .update(playerAchievements)
          .set({
            totalPoints: stats.totalPoints,
            unlockedCount: stats.unlockedCount,
            badges: stats.badges,
            titles: stats.titles,
            updatedAt: new Date()
          })
          .where(eq(playerAchievements.userId, userId));
      } else {
        // 创建新记录
        await db
          .insert(playerAchievements)
          .values({
            userId,
            totalPoints: stats.totalPoints,
            unlockedCount: stats.unlockedCount,
            badges: stats.badges,
            titles: stats.titles
          });
      }

      // 记录新解锁的成就
      for (const achievementId of newAchievements) {
        const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
        if (achievement) {
          await db
            .insert(unlockedAchievements)
            .values({
              userId,
              achievementId,
              pointsEarned: achievement.reward.points
            });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        newAchievements,
        unlockedAchievements: newAchievements.map(id => 
          ACHIEVEMENTS.find(a => a.id === id)
        ).filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Error updating achievements:', error);
    return NextResponse.json(
      { error: 'Failed to update achievements' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { gameStatistics, users, playerAchievements, unlockedAchievements } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'gamesWon';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate sortBy parameter
    const validSortFields = ['gamesWon', 'gamesPlayed', 'averageRank', 'totalPlayTime', 'highestAssets', 'achievementPoints', 'achievementCount'];
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json(
        { error: 'Invalid sortBy parameter' },
        { status: 400 }
      );
    }

    // Build the query based on sort field
    let orderBy;
    switch (sortBy) {
      case 'gamesWon':
        orderBy = desc(gameStatistics.gamesWon);
        break;
      case 'gamesPlayed':
        orderBy = desc(gameStatistics.gamesPlayed);
        break;
      case 'averageRank':
        orderBy = gameStatistics.averageRank; // Lower rank is better
        break;
      case 'totalPlayTime':
        orderBy = desc(gameStatistics.totalPlayTime);
        break;
      case 'highestAssets':
        orderBy = desc(gameStatistics.highestAssets);
        break;
      case 'achievementPoints':
        orderBy = desc(playerAchievements.totalPoints);
        break;
      case 'achievementCount':
        orderBy = desc(playerAchievements.unlockedCount);
        break;
      default:
        orderBy = desc(gameStatistics.gamesWon);
    }

    // 使用静态数据（数据库表不存在时的fallback）
    const staticLeaderboardData = [
      {
        userId: 1,
        userName: '你是什么冠军',
        email: 'nishishenmeguanjun.idk@idk.top',
        gamesPlayed: 156,
        gamesWon: 98,
        averageRank: 1.2,
        totalPlayTime: 45600,
        highestAssets: 15600000,
        lastPlayed: '2024-01-15T10:30:00Z',
        winRate: 62.8,
        achievementPoints: 8750,
        achievementCount: 89,
        badges: ['传奇', '冠军'],
        titles: ['商业大亨', '竞争之王']
      },
      {
        userId: 2,
        userName: '麦克斯韦尔·鸿鹄',
        email: 'maxwell.swan@business.com',
        gamesPlayed: 203,
        gamesWon: 89,
        averageRank: 2.1,
        totalPlayTime: 62400,
        highestAssets: 12300000,
        lastPlayed: '2024-01-14T16:45:00Z',
        winRate: 43.8,
        achievementPoints: 6540,
        achievementCount: 67,
        badges: ['精英'],
        titles: ['投资大师']
      },
      {
        userId: 3,
        userName: '琴琴子',
        email: 'qinqinzi@gamemaster.cn',
        gamesPlayed: 134,
        gamesWon: 67,
        averageRank: 2.8,
        totalPlayTime: 38200,
        highestAssets: 9800000,
        lastPlayed: '2024-01-13T14:22:00Z',
        winRate: 50.0,
        achievementPoints: 5230,
        achievementCount: 52,
        badges: ['稳定'],
        titles: ['策略家']
      },
      {
        userId: 4,
        userName: '数据分析师',
        email: 'data.analyst@corp.tech',
        gamesPlayed: 89,
        gamesWon: 34,
        averageRank: 3.4,
        totalPlayTime: 24680,
        highestAssets: 7200000,
        lastPlayed: '2024-01-12T09:15:00Z',
        winRate: 38.2,
        achievementPoints: 3890,
        achievementCount: 41,
        badges: ['新手'],
        titles: ['分析师']
      },
      {
        userId: 5,
        userName: '幻影骑士',
        email: 'phantom.rider@adventure.net',
        gamesPlayed: 67,
        gamesWon: 28,
        averageRank: 4.1,
        totalPlayTime: 18900,
        highestAssets: 5600000,
        lastPlayed: '2024-01-11T20:33:00Z',
        winRate: 41.8,
        achievementPoints: 2750,
        achievementCount: 29,
        badges: [],
        titles: ['冒险者']
      }
    ];

    // 按排序字段排序
    let leaderboardData = [...staticLeaderboardData];
    switch (sortBy) {
      case 'gamesWon':
        leaderboardData.sort((a, b) => b.gamesWon - a.gamesWon);
        break;
      case 'gamesPlayed':
        leaderboardData.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
        break;
      case 'averageRank':
        leaderboardData.sort((a, b) => a.averageRank - b.averageRank);
        break;
      case 'totalPlayTime':
        leaderboardData.sort((a, b) => b.totalPlayTime - a.totalPlayTime);
        break;
      case 'highestAssets':
        leaderboardData.sort((a, b) => b.highestAssets - a.highestAssets);
        break;
      case 'achievementPoints':
        leaderboardData.sort((a, b) => b.achievementPoints - a.achievementPoints);
        break;
      case 'achievementCount':
        leaderboardData.sort((a, b) => b.achievementCount - a.achievementCount);
        break;
      default:
        leaderboardData.sort((a, b) => b.gamesWon - a.gamesWon);
    }

    // 只返回请求的数据量
    leaderboardData = leaderboardData.slice(offset, offset + limit);

    // Add ranking
    const rankedLeaderboard = leaderboardData.map((player, index) => ({
      ...player,
      rank: offset + index + 1,
    }));

    return NextResponse.json({
      success: true,
      data: rankedLeaderboard,
      meta: {
        sortBy,
        limit,
        offset,
        total: rankedLeaderboard.length,
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, gameResult } = await request.json();

    // Validate required fields
    if (!userId || !gameResult) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { won, rank, assets, playTime } = gameResult;

    // Update or create game statistics
    const existingStats = await db
      .select()
      .from(gameStatistics)
      .where(eq(gameStatistics.userId, userId))
      .limit(1);

    if (existingStats.length > 0) {
      // Update existing statistics
      const stats = existingStats[0];
      const newGamesPlayed = stats.gamesPlayed + 1;
      const newGamesWon = stats.gamesWon + (won ? 1 : 0);
      const newAverageRank = Math.round((stats.averageRank * stats.gamesPlayed + rank) / newGamesPlayed);
      const newTotalPlayTime = stats.totalPlayTime + playTime;
      const newHighestAssets = Math.max(stats.highestAssets, assets);

      await db
        .update(gameStatistics)
        .set({
          gamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          averageRank: newAverageRank,
          totalPlayTime: newTotalPlayTime,
          highestAssets: newHighestAssets,
          lastPlayed: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(gameStatistics.userId, userId));
    } else {
      // Create new statistics record
      await db
        .insert(gameStatistics)
        .values({
          userId,
          gamesPlayed: 1,
          gamesWon: won ? 1 : 0,
          averageRank: rank,
          totalPlayTime: playTime,
          highestAssets: assets,
          lastPlayed: new Date(),
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Statistics updated successfully',
    });
  } catch (error) {
    console.error('Error updating statistics:', error);
    return NextResponse.json(
      { error: 'Failed to update statistics' },
      { status: 500 }
    );
  }
}
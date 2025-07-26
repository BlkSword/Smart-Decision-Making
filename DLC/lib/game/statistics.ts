// Game statistics utilities

export interface GameResult {
  won: boolean;
  rank: number;
  assets: number;
  playTime: number; // in seconds
  eliminatedPlayers?: number;
  stockTrades?: number;
  buildingsPurchased?: number;
  agentActions?: number;
}

export interface PlayerStatistics {
  userId: number;
  gamesPlayed: number;
  gamesWon: number;
  averageRank: number;
  totalPlayTime: number;
  highestAssets: number;
  winRate: number;
  lastPlayed: Date;
}

export class StatisticsManager {
  /**
   * Update player statistics after a game
   */
  static async updatePlayerStatistics(userId: number, gameResult: GameResult): Promise<boolean> {
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gameResult,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update statistics: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating player statistics:', error);
      return false;
    }
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(sortBy: string = 'gamesWon', limit: number = 50): Promise<PlayerStatistics[]> {
    try {
      const response = await fetch(`/api/leaderboard?sortBy=${sortBy}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Calculate game result for a player
   */
  static calculateGameResult(
    playerCompany: any,
    allCompanies: any[],
    gameStartTime: Date,
    gameEndTime: Date
  ): GameResult {
    // Calculate rank based on assets
    const sortedCompanies = [...allCompanies].sort((a, b) => b.assets - a.assets);
    const rank = sortedCompanies.findIndex(c => c.id === playerCompany.id) + 1;

    // Calculate play time in seconds
    const playTime = Math.floor((gameEndTime.getTime() - gameStartTime.getTime()) / 1000);

    // Determine if player won (rank 1)
    const won = rank === 1;

    return {
      won,
      rank,
      assets: playerCompany.assets,
      playTime,
      eliminatedPlayers: playerCompany.eliminatedPlayers || 0,
      stockTrades: playerCompany.stockTrades || 0,
      buildingsPurchased: playerCompany.buildingsPurchased || 0,
      agentActions: playerCompany.agentActions || 0,
    };
  }

  /**
   * Calculate win rate
   */
  static calculateWinRate(gamesWon: number, gamesPlayed: number): number {
    if (gamesPlayed === 0) return 0;
    return Math.round((gamesWon / gamesPlayed) * 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Format play time for display
   */
  static formatPlayTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  /**
   * Format assets for display
   */
  static formatAssets(assets: number): string {
    if (assets >= 1000000000) {
      return `$${(assets / 1000000000).toFixed(1)}B`;
    } else if (assets >= 1000000) {
      return `$${(assets / 1000000).toFixed(1)}M`;
    } else if (assets >= 1000) {
      return `$${(assets / 1000).toFixed(1)}K`;
    }
    return `$${assets}`;
  }

  /**
   * Get rank suffix for display
   */
  static getRankSuffix(rank: number): string {
    if (rank >= 11 && rank <= 13) {
      return 'th';
    }
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * Get achievement status based on statistics
   */
  static getAchievements(stats: PlayerStatistics): string[] {
    const achievements: string[] = [];

    if (stats.gamesWon >= 10) {
      achievements.push('veteran_winner');
    }
    if (stats.gamesWon >= 50) {
      achievements.push('master_trader');
    }
    if (stats.gamesWon >= 100) {
      achievements.push('legendary_businessman');
    }
    if (stats.winRate >= 70) {
      achievements.push('skilled_player');
    }
    if (stats.winRate >= 90) {
      achievements.push('elite_player');
    }
    if (stats.highestAssets >= 1000000) {
      achievements.push('millionaire');
    }
    if (stats.highestAssets >= 10000000) {
      achievements.push('multi_millionaire');
    }
    if (stats.totalPlayTime >= 3600) { // 1 hour
      achievements.push('dedicated_player');
    }
    if (stats.totalPlayTime >= 36000) { // 10 hours
      achievements.push('marathon_player');
    }
    if (stats.gamesPlayed >= 100) {
      achievements.push('experienced_player');
    }
    if (stats.averageRank <= 2) {
      achievements.push('consistent_performer');
    }

    return achievements;
  }
}
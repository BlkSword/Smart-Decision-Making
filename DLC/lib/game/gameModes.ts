// 游戏模式配置
export interface GameModeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  config: {
    // 基本游戏设置
    startingAssets: number;
    gracePeriod: number; // 保护期时间（秒）
    gameSpeed: number; // 游戏速度倍数
    
    // AI设置
    aiCount: number;
    aiAggressiveness: number; // 0-100
    aiDecisionDelay: number; // AI决策延迟（毫秒）
    
    // 经济设置
    economicVolatility: number; // 经济波动性 0-100
    stockMarketVariability: number; // 股市波动性 0-100
    
    // 其他设置
    allowSpectators: boolean;
    maxPlayers: number;
    enablePowerUps: boolean;
    
    // 特殊规则
    specialRules?: {
      type: string;
      value: any;
    }[];
  };
}

export const gameModes: GameModeConfig[] = [
  {
    id: 'beginner',
    name: '新手模式',
    description: '适合初学者的温和游戏环境，AI较为友善，有充足的发育时间',
    icon: '🌱',
    difficulty: 'easy',
    config: {
      startingAssets: 2000000,
      gracePeriod: 600, // 10分钟保护期
      gameSpeed: 1.0,
      aiCount: 3,
      aiAggressiveness: 30,
      aiDecisionDelay: 8000, // 8秒延迟
      economicVolatility: 20,
      stockMarketVariability: 30,
      allowSpectators: true,
      maxPlayers: 4,
      enablePowerUps: true,
      specialRules: [
        { type: 'gentleAI', value: true },
        { type: 'extendedTutorial', value: true }
      ]
    }
  },
  {
    id: 'standard',
    name: '中规中矩',
    description: '标准游戏模式，平衡的AI难度和经济环境',
    icon: '⚖️',
    difficulty: 'medium',
    config: {
      startingAssets: 1500000,
      gracePeriod: 300, // 5分钟保护期
      gameSpeed: 1.2,
      aiCount: 5,
      aiAggressiveness: 50,
      aiDecisionDelay: 5000, // 5秒延迟
      economicVolatility: 40,
      stockMarketVariability: 50,
      allowSpectators: true,
      maxPlayers: 6,
      enablePowerUps: true,
      specialRules: [
        { type: 'balancedEconomy', value: true },
        { type: 'moderateCompetition', value: true }
      ]
    }
  },
  {
    id: 'custom',
    name: '自定义模式',
    description: '完全自定义游戏设置，可以调整所有参数',
    icon: '🔧',
    difficulty: 'medium',
    config: {
      startingAssets: 1000000,
      gracePeriod: 300,
      gameSpeed: 1.0,
      aiCount: 4,
      aiAggressiveness: 50,
      aiDecisionDelay: 5000,
      economicVolatility: 50,
      stockMarketVariability: 50,
      allowSpectators: true,
      maxPlayers: 8,
      enablePowerUps: true,
      specialRules: []
    }
  },
  {
    id: 'asia',
    name: '亚洲模式',
    description: '最高难度！4.5秒发育时间，95个疯狂AI，极端竞争环境',
    icon: '🔥',
    difficulty: 'extreme',
    config: {
      startingAssets: 500000,
      gracePeriod: 4.5, // 45秒保护期
      gameSpeed: 2.0,
      aiCount: 90,
      aiAggressiveness: 95,
      aiDecisionDelay: 1000, // 1秒延迟
      economicVolatility: 80,
      stockMarketVariability: 90,
      allowSpectators: true,
      maxPlayers: 4,
      enablePowerUps: false,
      specialRules: [
        { type: 'hyperAggressive', value: true },
        { type: 'extremeCompetition', value: true },
        { type: 'rapidElimination', value: true }
      ]
    }
  }
];

// 获取模式配置
export function getGameMode(modeId: string): GameModeConfig | undefined {
  return gameModes.find(mode => mode.id === modeId);
}

// 获取难度颜色
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'hard': return 'text-orange-400';
    case 'extreme': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

// 获取难度标签
export function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return '简单';
    case 'medium': return '中等';
    case 'hard': return '困难';
    case 'extreme': return '极限';
    default: return '未知';
  }
}
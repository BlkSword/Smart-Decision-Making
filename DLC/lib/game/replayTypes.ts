import { GameState, GameAction } from '@/lib/db/schema';

export interface ReplayFrame {
  turn: number;
  timestamp: Date;
  gameState: GameState;
  actions: GameAction[];
}

export interface GameReplay {
  id: string;
  roomId: string;
  roomName: string;
  participants: Array<{
    id: number;
    playerName: string;
    finalRank: number;
    finalAssets: number;
  }>;
  startTime: Date;
  endTime: Date;
  totalTurns: number;
  winner: string;
  frames: ReplayFrame[];
  metadata: {
    gameMode: string;
    maxPlayers: number;
    duration: number; // in seconds
    recordingVersion: string;
  };
}

export interface ReplayPlaybackState {
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number; // 1.0 = normal speed, 2.0 = 2x speed, etc.
  isPaused: boolean;
  totalFrames: number;
  autoAdvance: boolean;
}

export interface ReplayControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextFrame: () => void;
  previousFrame: () => void;
  jumpToFrame: (frameNumber: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  jumpToTurn: (turn: number) => void;
}

export interface ReplayMetadata {
  id: string;
  roomId: string;
  roomName: string;
  gameMode: string;
  playerCount: number;
  winner: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  totalTurns: number;
  totalActions: number;
  viewCount: number;
  createdAt: Date;
}

export interface ReplayAnalytics {
  turnByTurnStats: Array<{
    turn: number;
    timestamp: Date;
    companiesActive: number;
    totalAssets: number;
    marketActivity: number;
    actionCount: number;
    eliminationOccurred: boolean;
  }>;
  playerPerformance: Array<{
    playerId: string;
    playerName: string;
    assetProgression: Array<{ turn: number; assets: number }>;
    actionCounts: Record<string, number>;
    survivalTime: number;
    peakAssets: number;
    finalRank: number;
  }>;
  gameEvents: Array<{
    turn: number;
    timestamp: Date;
    eventType: 'elimination' | 'major_acquisition' | 'market_crash' | 'victory';
    description: string;
    involvedPlayers: string[];
  }>;
}

export enum ReplayFilter {
  ALL = 'all',
  MY_GAMES = 'my_games',
  WINS = 'wins',
  RECENT = 'recent',
  POPULAR = 'popular',
  COMPETITIVE = 'competitive'
}

export interface ReplaySearchParams {
  roomName?: string;
  playerName?: string;
  gameMode?: string;
  minDuration?: number;
  maxDuration?: number;
  dateFrom?: Date;
  dateTo?: Date;
  filter: ReplayFilter;
  sortBy: 'recent' | 'popular' | 'duration' | 'player_count';
  limit: number;
  offset: number;
}
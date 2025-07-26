// Base game types
export interface Agent {
  id: string;
  x: number;
  y: number;
  status: 'idle' | 'moving' | 'working';
  target: { x: number; y: number } | null;
  company: string;
  skills: {
    negotiation: number;
    espionage: number;
    management: number;
  };
  actionType?: 'purchase_building' | 'recruit_employee' | 'attack' | 'intelligence' | 'move';
  targetBuildingId?: number;
}

export interface Building {
  id: number;
  type: 'trade_center' | 'hospital' | 'company' | 'real_estate' | 'hotel' | 'apartment';
  x: number;
  y: number;
  name: string;
  level: number;
  income: number;
  owner?: string;
}

export interface Company {
  id: string;
  name: string;
  playerId?: string; // For multiplayer
  assets: number;
  employees: number;
  buildings: number[];
  type: 'centralized' | 'decentralized';
  isPlayer: boolean;
  status: 'active' | 'bankrupt';
  color?: string; // For visual identification
  agents: Agent[];
  marketPosition?: { x: number; y: number };
  organizationType?: 'centralized' | 'decentralized';
  isActive?: boolean;
}

export interface GameMap {
  width: number;
  height: number;
  buildings: {
    id: string;
    name: string;
    x: number;
    y: number;
    type: string;
  }[];
}

export interface GameState {
  companies: Company[];
  buildings?: Building[]; // Legacy support
  agents?: Agent[]; // Legacy support
  map?: GameMap; // New map system
  currentTurn: number;
  gameStatus?: 'playing' | 'victory' | 'defeat'; // Legacy
  gamePhase?: 'setup' | 'playing' | 'ended'; // New phase system
  selectedAgent?: Agent | null;
  selectedBuilding?: Building | null;
  stockMarket?: any; // From existing system
  winner?: Company | null;
  victoryReason?: string;
  recentEvents?: any[];
  analytics?: any;
  isActive: boolean;
  startTime: Date;
  eliminationStartTime?: Date;
  lastUpdate: Date;
  currentRoomId?: string;
}

// Multiplayer-specific types
export interface Player {
  id: string;
  name: string;
  company: Company | null;
  isActive: boolean;
  isOnline: boolean;
  isReady: boolean;
  joinedAt: Date;
  lastSeen?: Date;
}

export interface Spectator {
  id: string;
  name: string;
  joinedAt: Date;
  lastSeen?: Date;
  isOnline: boolean;
}

export interface GameRoom {
  id: string;
  name: string;
  players: Player[];
  spectators: Spectator[];
  gameState: GameState | null;
  isStarted: boolean;
  maxPlayers: number;
  createdAt: Date;
  host: string;
  isPrivate: boolean;
  password?: string;
  settings?: {
    startingAssets?: number;
    gracePeriod?: number;
    aiOpponents?: boolean;
    maxAiOpponents?: number;
    allowSpectators?: boolean;
    maxSpectators?: number;
    gameMode?: string;
  };
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  roomId: string;
  type: 'chat' | 'system' | 'game_event';
}

export interface PlayerAction {
  id: string;
  playerId: string;
  type: 'move_agent' | 'purchase_building' | 'recruit_employee' | 'attack' | 'intelligence' | 'stock_trade';
  data: any;
  timestamp: Date;
  gameState?: GameState;
}

export interface GameEvent {
  id: string;
  type: 'player_joined' | 'player_left' | 'game_started' | 'game_ended' | 'player_eliminated' | 'building_purchased' | 'agent_moved';
  data: any;
  timestamp: Date;
  roomId: string;
}

// Competition and analytics types
export interface CompetitionEvent {
  id: string;
  type: 'attack' | 'purchase' | 'intelligence' | 'recruitment' | 'elimination';
  attacker: string;
  target: string;
  result: 'success' | 'failure' | 'partial';
  impact: number;
  timestamp: Date;
  description: string;
}

export interface CompetitionAnalytics {
  totalTransactions: number;
  averageAssetGrowth: number;
  competitionIntensity: number;
  marketShare: { [companyId: string]: number };
  buildingControl: { [companyId: string]: number };
  riskLevel: number;
  playerActions: { [playerId: string]: number };
  gameProgression: {
    phase: string;
    duration: number;
    activePlayers: number;
    eliminatedPlayers: number;
  };
}

// Stock market types
export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  timestamp: Date;
}

export interface StockMarket {
  prices: { [symbol: string]: StockPrice };
  manipulation: {
    type: string;
    target: string;
    intensity: number;
    duration: number;
  }[];
  trends: { [symbol: string]: 'up' | 'down' | 'stable' };
}

// AI types
export interface AIDecision {
  companyId: string;
  action: 'move_agent' | 'purchase_building' | 'recruit_employee' | 'attack' | 'intelligence' | 'stock_manipulation';
  target?: string;
  parameters: any;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export interface AIPersonality {
  aggressiveness: number; // 0-100
  riskTolerance: number; // 0-100
  cooperativeness: number; // 0-100
  strategicFocus: 'expansion' | 'defense' | 'financial' | 'aggressive';
  decisionSpeed: number; // milliseconds
}

// Database types for persistence
export interface GameSession {
  id: string;
  roomId: string;
  startTime: Date;
  endTime?: Date;
  players: string[];
  winner?: string;
  gameState: GameState;
  events: GameEvent[];
  metadata: {
    duration?: number;
    totalActions: number;
    eliminationOrder: string[];
  };
}

export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalAssets: number;
  averageGameDuration: number;
  favoriteStrategy: string;
  lastPlayed: Date;
  ranking: number;
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
  source: 'client' | 'server';
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration types
export interface GameConfig {
  maxPlayers: number;
  maxAiOpponents: number;
  startingAssets: number;
  gracePeriod: number;
  turnDuration: number;
  mapDimensions: { width: number; height: number };
  buildingTypes: string[];
  agentSkillRanges: {
    negotiation: [number, number];
    espionage: [number, number];
    management: [number, number];
  };
}

// Export default game configuration
export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxPlayers: 6,
  maxAiOpponents: 4,
  startingAssets: 1000000,
  gracePeriod: 10 * 60 * 1000, // 10 minutes
  turnDuration: 30000, // 30 seconds
  mapDimensions: { width: 800, height: 600 },
  buildingTypes: ['trade_center', 'hospital', 'company', 'real_estate', 'hotel', 'apartment'],
  agentSkillRanges: {
    negotiation: [40, 90],
    espionage: [30, 80],
    management: [50, 95]
  }
};
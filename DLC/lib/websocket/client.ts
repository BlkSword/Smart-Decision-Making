import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, GameRoom } from './server';
import type { GameState } from '../game/types';

export type WebSocketEventCallback = {
  // Room events
  onRoomJoined?: (room: GameRoom) => void;
  onRoomLeft?: (room: GameRoom) => void;
  onRoomUpdated?: (room: GameRoom) => void;
  onRoomsList?: (rooms: GameRoom[]) => void;
  
  // Game events
  onGameStarted?: (gameState: GameState) => void;
  onGameStateUpdated?: (gameState: GameState) => void;
  onPlayerAction?: (playerId: string, action: any) => void;
  onAgentMove?: (agentId: string, position: { x: number; y: number }) => void;
  onPlayerEliminated?: (playerId: string) => void;
  onGameEnded?: (winner: string) => void;
  
  // Chat events
  onChatMessage?: (message: { playerId: string; playerName: string; message: string; timestamp: Date }) => void;
  
  // Player events
  onPlayerLeft?: (playerId: string, playerName: string) => void;
  
  // Spectator events
  onSpectatorJoined?: (spectatorId: string, spectatorName: string) => void;
  onSpectatorLeft?: (spectatorId: string, spectatorName: string) => void;
  
  // Error events
  onError?: (message: string) => void;
};

export class GameWebSocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private callbacks: WebSocketEventCallback = {};

  constructor(url: string = 'http://localhost:3000') {
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to game server:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from game server:', reason);
    });

    // Room events
    this.socket.on('roomJoined', (room) => {
      console.log('Joined room:', room.id);
      this.callbacks.onRoomJoined?.(room);
    });

    this.socket.on('roomLeft', (room) => {
      console.log('Left room:', room.id);
      this.callbacks.onRoomLeft?.(room);
    });

    this.socket.on('roomUpdated', (room) => {
      console.log('Room updated:', room.id);
      this.callbacks.onRoomUpdated?.(room);
    });

    this.socket.on('roomsList', (rooms) => {
      console.log('Rooms list received:', rooms.length);
      this.callbacks.onRoomsList?.(rooms);
    });

    // Game events
    this.socket.on('gameStarted', (gameState) => {
      console.log('Game started!');
      this.callbacks.onGameStarted?.(gameState);
    });

    this.socket.on('gameStateUpdated', (gameState) => {
      this.callbacks.onGameStateUpdated?.(gameState);
    });

    this.socket.on('playerAction', (playerId, action) => {
      this.callbacks.onPlayerAction?.(playerId, action);
    });

    this.socket.on('agentMove', (agentId, position) => {
      this.callbacks.onAgentMove?.(agentId, position);
    });

    this.socket.on('playerEliminated', (playerId) => {
      console.log('Player eliminated:', playerId);
      this.callbacks.onPlayerEliminated?.(playerId);
    });

    this.socket.on('gameEnded', (winner) => {
      console.log('Game ended. Winner:', winner);
      this.callbacks.onGameEnded?.(winner);
    });

    // Chat events
    this.socket.on('chatMessage', (message) => {
      this.callbacks.onChatMessage?.(message);
    });

    // Player events
    this.socket.on('playerLeft', (playerId, playerName) => {
      this.callbacks.onPlayerLeft?.(playerId, playerName);
    });

    // Spectator events
    this.socket.on('spectatorJoined', (spectatorId, spectatorName) => {
      this.callbacks.onSpectatorJoined?.(spectatorId, spectatorName);
    });

    this.socket.on('spectatorLeft', (spectatorId, spectatorName) => {
      this.callbacks.onSpectatorLeft?.(spectatorId, spectatorName);
    });

    // Error events
    this.socket.on('error', (message) => {
      console.error('Server error:', message);
      this.callbacks.onError?.(message);
    });
  }

  // Public API methods
  public setCallbacks(callbacks: WebSocketEventCallback) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Room management
  public createRoom(roomName: string, maxPlayers: number = 4, password?: string) {
    this.socket.emit('createRoom', roomName, maxPlayers, password);
  }

  public joinRoom(roomId: string, password?: string) {
    this.socket.emit('joinRoom', roomId, password);
  }

  public joinAsSpectator(roomId: string, password?: string) {
    this.socket.emit('joinAsSpectator', roomId, password);
  }

  public leaveAsSpectator(roomId: string) {
    this.socket.emit('leaveAsSpectator', roomId);
  }

  public leaveRoom(roomId: string) {
    this.socket.emit('leaveRoom', roomId);
  }

  public listRooms() {
    this.socket.emit('listRooms');
  }

  public startGame(roomId: string) {
    this.socket.emit('startGame', roomId);
  }

  // Game actions
  public sendPlayerAction(action: any) {
    this.socket.emit('playerAction', action);
  }

  public sendAgentCommand(agentId: string, command: any) {
    this.socket.emit('agentCommand', agentId, command);
  }

  // Player management
  public setPlayerReady(roomId: string, isReady: boolean) {
    this.socket.emit('setPlayerReady', roomId, isReady);
  }

  public updatePlayerName(name: string) {
    this.socket.emit('updatePlayerName', name);
  }

  public kickPlayer(roomId: string, playerId: string) {
    this.socket.emit('kickPlayer', roomId, playerId);
  }

  // Chat
  public sendMessage(roomId: string, message: string) {
    this.socket.emit('sendMessage', roomId, message);
  }

  // Connection management
  public connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public isConnected(): boolean {
    return this.socket.connected;
  }

  public getSocketId(): string | undefined {
    return this.socket.id;
  }
}

// Singleton pattern for global access
let globalSocketClient: GameWebSocketClient | null = null;

export function getSocketClient(): GameWebSocketClient {
  if (!globalSocketClient) {
    globalSocketClient = new GameWebSocketClient();
  }
  return globalSocketClient;
}

export function createSocketClient(url?: string): GameWebSocketClient {
  return new GameWebSocketClient(url);
}
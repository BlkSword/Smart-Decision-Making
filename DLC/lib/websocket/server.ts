import { Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import type { GameState, Player, Company, Agent, Spectator } from '../game/types';

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
  settings: {
    allowSpectators: boolean;
    maxSpectators: number;
    gameMode: string;
  };
}

export interface ServerToClientEvents {
  // Game room events
  roomJoined: (room: GameRoom) => void;
  roomLeft: (room: GameRoom) => void;
  roomUpdated: (room: GameRoom) => void;
  roomsList: (rooms: GameRoom[]) => void;
  
  // Game state events
  gameStarted: (gameState: GameState) => void;
  gameStateUpdated: (gameState: GameState) => void;
  playerAction: (playerId: string, action: any) => void;
  agentMove: (agentId: string, position: { x: number; y: number }) => void;
  companyUpdate: (company: Company) => void;
  playerEliminated: (playerId: string) => void;
  gameEnded: (winner: string) => void;
  
  // Chat events
  chatMessage: (message: { playerId: string; playerName: string; message: string; timestamp: Date }) => void;
  
  // Spectator events
  spectatorJoined: (spectatorId: string, spectatorName: string) => void;
  spectatorLeft: (spectatorId: string, spectatorName: string) => void;
  
  // Error events
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  // Room management
  createRoom: (roomName: string, maxPlayers: number, password?: string) => void;
  joinRoom: (roomId: string, password?: string) => void;
  leaveRoom: (roomId: string) => void;
  listRooms: () => void;
  startGame: (roomId: string) => void;
  
  // Player management
  setPlayerReady: (roomId: string, isReady: boolean) => void;
  updatePlayerName: (name: string) => void;
  kickPlayer: (roomId: string, playerId: string) => void;
  
  // Spectator management
  joinAsSpectator: (roomId: string, password?: string) => void;
  leaveAsSpectator: (roomId: string) => void;
  
  // Game actions
  playerAction: (action: any) => void;
  agentCommand: (agentId: string, command: any) => void;
  
  // Chat
  sendMessage: (roomId: string, message: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  playerName: string;
  roomId?: string;
  isSpectator?: boolean;
}

export class GameSocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:3000", "http://172.17.0.10:3000"],
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Player connected:', socket.id);

      // Initialize socket data
      socket.data = {
        playerId: socket.id,
        playerName: `Player_${socket.id.slice(0, 8)}`,
      };

      // Room management events
      socket.on('createRoom', (roomName, maxPlayers) => {
        this.createRoom(socket, roomName, maxPlayers);
      });

      socket.on('joinRoom', (roomId) => {
        this.joinRoom(socket, roomId);
      });

      socket.on('leaveRoom', (roomId) => {
        this.leaveRoom(socket, roomId);
      });

      socket.on('listRooms', () => {
        this.listRooms(socket);
      });

      socket.on('startGame', (roomId) => {
        this.startGame(socket, roomId);
      });

      // Game action events
      socket.on('playerAction', (action) => {
        this.handlePlayerAction(socket, action);
      });

      socket.on('agentCommand', (agentId, command) => {
        this.handleAgentCommand(socket, agentId, command);
      });

      // Chat events
      socket.on('sendMessage', (roomId, message) => {
        this.handleChatMessage(socket, roomId, message);
      });

      // Disconnect event
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private createRoom(socket: any, roomName: string, maxPlayers: number) {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const room: GameRoom = {
      id: roomId,
      name: roomName,
      players: [],
      spectators: [],
      gameState: null,
      isStarted: false,
      maxPlayers: Math.min(maxPlayers, 6), // Max 6 players
      createdAt: new Date(),
      host: socket.data.playerId,
      isPrivate: false,
      settings: {
        allowSpectators: true,
        maxSpectators: 10,
        gameMode: 'standard'
      }
    };

    this.rooms.set(roomId, room);
    this.joinRoom(socket, roomId);
    
    console.log(`Room created: ${roomId} by ${socket.data.playerId}`);
  }

  private joinRoom(socket: any, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', 'Room is full');
      return;
    }

    if (room.isStarted) {
      socket.emit('error', 'Game already started');
      return;
    }

    // Leave current room if any
    if (socket.data.roomId) {
      this.leaveRoom(socket, socket.data.roomId);
    }

    // Add player to room
    const player: Player = {
      id: socket.data.playerId,
      name: socket.data.playerName,
      company: null,
      isActive: true,
      isOnline: true,
      joinedAt: new Date()
    };

    room.players.push(player);
    socket.data.roomId = roomId;
    this.playerRooms.set(socket.data.playerId, roomId);

    // Join socket room
    socket.join(roomId);

    // Notify all players in the room
    this.io.to(roomId).emit('roomUpdated', room);
    socket.emit('roomJoined', room);

    console.log(`Player ${socket.data.playerId} joined room ${roomId}`);
  }

  private leaveRoom(socket: any, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove player from room
    room.players = room.players.filter(p => p.id !== socket.data.playerId);
    socket.leave(roomId);
    
    // Clear player room data
    socket.data.roomId = undefined;
    this.playerRooms.delete(socket.data.playerId);

    // If room is empty (no players and no spectators), delete it
    if (room.players.length === 0 && room.spectators.length === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    } else if (room.players.length > 0) {
      // If host left, assign new host
      if (room.host === socket.data.playerId && room.players.length > 0) {
        room.host = room.players[0].id;
      }
      
      // Notify remaining players
      this.io.to(roomId).emit('roomUpdated', room);
    }

    socket.emit('roomLeft', room);
    console.log(`Player ${socket.data.playerId} left room ${roomId}`);
  }

  private listRooms(socket: any) {
    const roomsList = Array.from(this.rooms.values()).filter(room => !room.isStarted);
    socket.emit('roomsList', roomsList);
  }

  private startGame(socket: any, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.host !== socket.data.playerId) {
      socket.emit('error', 'Only room host can start the game');
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', 'Need at least 2 players to start');
      return;
    }

    if (room.isStarted) {
      socket.emit('error', 'Game already started');
      return;
    }

    // Initialize game state
    room.isStarted = true;
    room.gameState = this.initializeGameState(room.players);

    // Notify all players
    this.io.to(roomId).emit('gameStarted', room.gameState);
    
    console.log(`Game started in room ${roomId}`);
  }

  private initializeGameState(players: Player[]): GameState {
    // Create initial game state with companies for each player
    const companies: Company[] = players.map((player, index) => ({
      id: `company_${player.id}`,
      name: `${player.name} Corp`,
      playerId: player.id,
      assets: 1000000, // Start with 1M assets
      agents: [],
      buildings: [],
      marketPosition: { x: 100 + index * 150, y: 100 + index * 150 },
      organizationType: 'centralized',
      isActive: true,
      color: `hsl(${index * 60}, 70%, 50%)` // Different color for each company
    }));

    return {
      companies,
      map: {
        width: 800,
        height: 600,
        buildings: [
          { id: 'trade_center', name: 'International Trade Center', x: 400, y: 200, type: 'trade' },
          { id: 'hospital', name: 'Hospital', x: 200, y: 400, type: 'medical' },
          { id: 'real_estate', name: 'Real Estate Office', x: 600, y: 400, type: 'real_estate' },
          { id: 'hotel', name: 'Hotel', x: 300, y: 300, type: 'hotel' },
          { id: 'apartments', name: 'Apartments', x: 500, y: 300, type: 'residential' }
        ]
      },
      currentTurn: 0,
      gamePhase: 'setup',
      isActive: true,
      startTime: new Date(),
      eliminationStartTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes grace period
      lastUpdate: new Date()
    };
  }

  private handlePlayerAction(socket: any, action: any) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room || !room.isStarted) return;

    // Process action and update game state
    // This will be integrated with existing game logic
    
    // Broadcast action to all players in room
    this.io.to(roomId).emit('playerAction', socket.data.playerId, action);
    
    // Update game state if needed
    if (room.gameState) {
      room.gameState.lastUpdate = new Date();
      this.io.to(roomId).emit('gameStateUpdated', room.gameState);
    }
  }

  private handleAgentCommand(socket: any, agentId: string, command: any) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room || !room.isStarted) return;

    // Process agent command
    this.io.to(roomId).emit('agentMove', agentId, command.position);
  }

  private handleChatMessage(socket: any, roomId: string, message: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const chatMessage = {
      playerId: socket.data.playerId,
      playerName: socket.data.playerName,
      message: message.trim(),
      timestamp: new Date()
    };

    this.io.to(roomId).emit('chatMessage', chatMessage);
  }

  private joinAsSpectator(socket: any, roomId: string, password?: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (!room.settings.allowSpectators) {
      socket.emit('error', 'Spectators not allowed in this room');
      return;
    }

    if (room.spectators.length >= room.settings.maxSpectators) {
      socket.emit('error', 'Maximum number of spectators reached');
      return;
    }

    if (room.password && room.password !== password) {
      socket.emit('error', 'Invalid password');
      return;
    }

    // Check if user is already a player in this room
    const existingPlayer = room.players.find(p => p.id === socket.data.playerId);
    if (existingPlayer) {
      socket.emit('error', 'Already a player in this room');
      return;
    }

    // Check if user is already a spectator in this room
    const existingSpectator = room.spectators.find(s => s.id === socket.data.playerId);
    if (existingSpectator) {
      socket.emit('error', 'Already spectating this room');
      return;
    }

    // Add as spectator
    const spectator: Spectator = {
      id: socket.data.playerId,
      name: socket.data.playerName,
      joinedAt: new Date(),
      isOnline: true
    };

    room.spectators.push(spectator);
    socket.data.roomId = roomId;
    socket.data.isSpectator = true;
    this.playerRooms.set(socket.data.playerId, roomId);
    
    // Join socket room
    socket.join(roomId);
    
    // Notify all room members
    this.io.to(roomId).emit('spectatorJoined', spectator.id, spectator.name);
    this.io.to(roomId).emit('roomUpdated', room);
    
    // Send room info to new spectator
    socket.emit('roomJoined', room);
    
    console.log(`Spectator ${spectator.name} joined room ${roomId}`);
  }

  private leaveAsSpectator(socket: any, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    const spectatorIndex = room.spectators.findIndex(s => s.id === socket.data.playerId);
    if (spectatorIndex === -1) {
      socket.emit('error', 'Not a spectator in this room');
      return;
    }

    const spectator = room.spectators[spectatorIndex];
    room.spectators.splice(spectatorIndex, 1);
    
    // Update socket data
    socket.data.roomId = undefined;
    socket.data.isSpectator = false;
    this.playerRooms.delete(socket.data.playerId);
    
    // Leave socket room
    socket.leave(roomId);
    
    // Notify all room members
    this.io.to(roomId).emit('spectatorLeft', spectator.id, spectator.name);
    this.io.to(roomId).emit('roomUpdated', room);
    
    // Send confirmation to former spectator
    socket.emit('roomLeft', room);
    
    console.log(`Spectator ${spectator.name} left room ${roomId}`);
  }

  private handleDisconnect(socket: any) {
    console.log('Player disconnected:', socket.id);
    
    if (socket.data.roomId) {
      if (socket.data.isSpectator) {
        this.leaveAsSpectator(socket, socket.data.roomId);
      } else {
        this.leaveRoom(socket, socket.data.roomId);
      }
    }
  }

  // Public methods for external integration
  public getRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public updateGameState(roomId: string, gameState: GameState) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
      this.io.to(roomId).emit('gameStateUpdated', gameState);
    }
  }
}
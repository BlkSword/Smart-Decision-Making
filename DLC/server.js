const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const crypto = require('crypto');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Handle all requests with Next.js
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://172.17.0.10:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Game rooms storage
  const gameRooms = new Map();
  const playerRooms = new Map();
  
  // Game persistence - we'll use API calls to our own endpoints
  const gamePersistenceAPI = {
    async saveGameState(roomId, gameState) {
      try {
        const response = await fetch(`http://localhost:3000/api/game/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, gameState })
        });
        if (!response.ok) {
          throw new Error(`Failed to save game state: ${response.status}`);
        }
        return true;
      } catch (error) {
        console.error(`Error saving game state for room ${roomId}:`, error);
        return false;
      }
    },
    
    async loadGameState(roomId) {
      try {
        const response = await fetch(`http://localhost:3000/api/game/state?roomId=${encodeURIComponent(roomId)}`);
        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error(`Failed to load game state: ${response.status}`);
        }
        const data = await response.json();
        return data.gameState;
      } catch (error) {
        console.error(`Error loading game state for room ${roomId}:`, error);
        return null;
      }
    }
  };

  // Socket.IO event handlers
  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Set default player data
    socket.data = {
      playerId: socket.id,
      playerName: `Player_${socket.id.slice(0, 8)}`,
    };

    // Room management events
    socket.on('createRoom', (roomName, maxPlayers) => {
      createGameRoom(socket, roomName, maxPlayers);
    });

    socket.on('joinRoom', (roomId) => {
      joinRoom(socket, roomId);
    });

    socket.on('leaveRoom', (roomId) => {
      leaveRoom(socket, roomId);
    });

    socket.on('listRooms', () => {
      const roomsList = Array.from(gameRooms.values()).filter(room => !room.isStarted);
      socket.emit('roomsList', roomsList);
    });

    socket.on('startGame', (roomId) => {
      startGame(socket, roomId);
    });

    // Game action events
    socket.on('playerAction', (action) => {
      handlePlayerAction(socket, action);
    });

    socket.on('agentCommand', (agentId, command) => {
      handleAgentCommand(socket, agentId, command);
    });

    // Game state loading
    socket.on('loadGameState', (roomId) => {
      loadGameStateForPlayer(socket, roomId);
    });

    // Chat events
    socket.on('sendMessage', (roomId, message) => {
      handleChatMessage(socket, roomId, message);
    });

    // Disconnect event
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });

    // Helper functions
    async function createGameRoom(socket, roomName, maxPlayers) {
      try {
        const roomId = crypto.randomUUID();
        
        // Create room in database using API
        const response = await fetch('http://localhost:3000/api/game/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: roomId,
            name: roomName,
            hostId: null, // We'll set this later when user system is integrated
            maxPlayers: Math.min(maxPlayers, 6),
            isPrivate: false
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create room in database: ${response.status}`);
        }
        
        // Create room in memory
        const room = {
          id: roomId,
          name: roomName,
          players: [],
          gameState: null,
          isStarted: false,
          maxPlayers: Math.min(maxPlayers, 6),
          createdAt: new Date(),
          host: socket.data.playerId
        };

        gameRooms.set(roomId, room);
        joinRoom(socket, roomId);
        console.log(`Room created: ${roomId} by ${socket.data.playerId}`);
        
      } catch (error) {
        console.error('Error creating game room:', error);
        socket.emit('error', 'Failed to create room');
      }
    }

    function joinRoom(socket, roomId) {
      const room = gameRooms.get(roomId);
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
        leaveRoom(socket, socket.data.roomId);
      }

      // Add player to room
      const player = {
        id: socket.data.playerId,
        name: socket.data.playerName,
        company: null,
        isActive: true,
        isOnline: true,
        joinedAt: new Date()
      };

      room.players.push(player);
      socket.data.roomId = roomId;
      playerRooms.set(socket.data.playerId, roomId);

      // Join socket room
      socket.join(roomId);

      // Notify all players in the room
      io.to(roomId).emit('roomUpdated', room);
      socket.emit('roomJoined', room);

      console.log(`Player ${socket.data.playerId} joined room ${roomId}`);
    }

    function leaveRoom(socket, roomId) {
      const room = gameRooms.get(roomId);
      if (!room) return;

      // Find the leaving player
      const leavingPlayer = room.players.find(p => p.id === socket.data.playerId);
      
      // Remove player from room
      room.players = room.players.filter(p => p.id !== socket.data.playerId);
      socket.leave(roomId);
      
      // Clear player room data
      socket.data.roomId = undefined;
      playerRooms.delete(socket.data.playerId);

      // Notify other players that this player left
      if (leavingPlayer) {
        io.to(roomId).emit('playerLeft', socket.data.playerId, leavingPlayer.name);
      }

      // If room is empty, delete it
      if (room.players.length === 0) {
        gameRooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      } else {
        // If host left, assign new host
        if (room.host === socket.data.playerId && room.players.length > 0) {
          room.host = room.players[0].id;
        }
        
        // Notify remaining players
        io.to(roomId).emit('roomUpdated', room);
      }

      socket.emit('roomLeft', room);
      console.log(`Player ${socket.data.playerId} left room ${roomId}`);
    }

    function setPlayerReady(socket, roomId, isReady) {
      const room = gameRooms.get(roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      const player = room.players.find(p => p.id === socket.data.playerId);
      if (!player) {
        socket.emit('error', 'Player not in room');
        return;
      }

      player.isReady = isReady;
      
      // Notify all players in the room
      io.to(roomId).emit('roomUpdated', room);
      console.log(`Player ${socket.data.playerName} ${isReady ? 'ready' : 'not ready'} in room ${roomId}`);
    }

    function updatePlayerName(socket, name) {
      const oldName = socket.data.playerName;
      socket.data.playerName = name;
      
      // Update player name in current room
      if (socket.data.roomId) {
        const room = gameRooms.get(socket.data.roomId);
        if (room) {
          const player = room.players.find(p => p.id === socket.data.playerId);
          if (player) {
            player.name = name;
            io.to(socket.data.roomId).emit('roomUpdated', room);
          }
        }
      }
      
      console.log(`Player name updated: ${oldName} -> ${name}`);
    }

    function kickPlayer(socket, roomId, playerId) {
      const room = gameRooms.get(roomId);
      if (!room || room.host !== socket.data.playerId) {
        socket.emit('error', 'Not authorized to kick players');
        return;
      }

      if (playerId === room.host) {
        socket.emit('error', 'Cannot kick the host');
        return;
      }

      const playerIndex = room.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) {
        socket.emit('error', 'Player not found in room');
        return;
      }

      // Remove player from room
      room.players.splice(playerIndex, 1);
      playerRooms.delete(playerId);

      // Notify the kicked player
      io.sockets.sockets.forEach(s => {
        if (s.data.playerId === playerId) {
          s.data.roomId = undefined;
          s.leave(roomId);
          s.emit('error', 'You have been kicked from the room');
        }
      });

      // Notify all remaining players
      io.to(roomId).emit('roomUpdated', room);
      console.log(`Player ${playerId} kicked from room ${roomId}`);
    }

    function startGame(socket, roomId) {
      const room = gameRooms.get(roomId);
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

      const readyPlayers = room.players.filter(p => p.isReady);
      if (readyPlayers.length < room.players.length) {
        socket.emit('error', 'All players must be ready to start');
        return;
      }

      if (room.isStarted) {
        socket.emit('error', 'Game already started');
        return;
      }

      // Initialize game state
      room.isStarted = true;
      room.gameState = initializeGameState(room.players);
      room.gameState.currentRoomId = roomId;

      // Save initial game state
      gamePersistenceAPI.saveGameState(roomId, room.gameState)
        .then(success => {
          if (success) {
            console.log(`Initial game state saved for room ${roomId}`);
          }
        });

      // Notify all players
      io.to(roomId).emit('gameStarted', room.gameState);
      
      console.log(`Game started in room ${roomId}`);
    }

    function initializeGameState(players) {
      // Create companies for each player
      const companies = players.map((player, index) => ({
        id: `company_${player.id}`,
        name: `${player.name} Corp`,
        playerId: player.id,
        assets: 1000000,
        agents: [],
        buildings: [],
        marketPosition: { x: 100 + index * 150, y: 100 + index * 150 },
        organizationType: 'centralized',
        isActive: true,
        color: `hsl(${index * 60}, 70%, 50%)`
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
        eliminationStartTime: new Date(Date.now() + 10 * 60 * 1000),
        lastUpdate: new Date()
      };
    }

    function handlePlayerAction(socket, action) {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room || !room.isStarted) return;

      // Broadcast action to all players in room
      io.to(roomId).emit('playerAction', socket.data.playerId, action);
      
      // Update game state
      if (room.gameState) {
        room.gameState.lastUpdate = new Date();
        io.to(roomId).emit('gameStateUpdated', room.gameState);
        
        // Save game state periodically (debounced)
        clearTimeout(room.saveTimeout);
        room.saveTimeout = setTimeout(() => {
          gamePersistenceAPI.saveGameState(roomId, room.gameState);
        }, 5000); // Save after 5 seconds of inactivity
      }
    }

    function handleAgentCommand(socket, agentId, command) {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = gameRooms.get(roomId);
      if (!room || !room.isStarted) return;

      io.to(roomId).emit('agentMove', agentId, command.position);
    }

    async function handleChatMessage(socket, roomId, message) {
      const room = gameRooms.get(roomId);
      if (!room) return;

      const chatMessage = {
        playerId: socket.data.playerId,
        playerName: socket.data.playerName,
        message: message.trim(),
        timestamp: new Date()
      };

      // Save chat message to database
      try {
        await fetch('http://localhost:3000/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            userId: socket.data.userId || null,
            playerName: socket.data.playerName,
            message: message.trim(),
            messageType: 'chat'
          })
        });
      } catch (error) {
        console.error('Failed to save chat message:', error);
      }

      io.to(roomId).emit('chatMessage', chatMessage);
    }

    async function loadGameStateForPlayer(socket, roomId) {
      try {
        const gameState = await gamePersistenceAPI.loadGameState(roomId);
        if (gameState) {
          socket.emit('gameStateLoaded', gameState);
          console.log(`Game state loaded for player ${socket.data.playerId} in room ${roomId}`);
        } else {
          socket.emit('error', 'No saved game state found');
        }
      } catch (error) {
        console.error(`Error loading game state for player ${socket.data.playerId}:`, error);
        socket.emit('error', 'Failed to load game state');
      }
    }

    function handleDisconnect(socket) {
      console.log('Player disconnected:', socket.id);
      
      if (socket.data.roomId) {
        leaveRoom(socket, socket.data.roomId);
      }
    }
  });

  // Start server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.IO server is running');
  });
});
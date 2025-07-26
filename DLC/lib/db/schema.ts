import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  metadata: text('metadata'), // JSON field for additional sharing-related data
});

// Game-related tables
export const gameRooms = pgTable('game_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  hostId: integer('host_id').references(() => users.id),
  maxPlayers: integer('max_players').notNull().default(4),
  isPrivate: boolean('is_private').notNull().default(false),
  passwordHash: text('password_hash'),
  isStarted: boolean('is_started').notNull().default(false),
  isCompleted: boolean('is_completed').notNull().default(false),
  settings: json('settings'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

export const gameParticipants = pgTable('game_participants', {
  id: serial('id').primaryKey(),
  roomId: uuid('room_id').notNull().references(() => gameRooms.id),
  userId: integer('user_id').references(() => users.id),
  playerName: varchar('player_name', { length: 100 }).notNull(),
  isReady: boolean('is_ready').notNull().default(false),
  isHost: boolean('is_host').notNull().default(false),
  company: json('company'), // Company data
  finalRank: integer('final_rank'),
  finalAssets: integer('final_assets'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  leftAt: timestamp('left_at'),
});

export const gameStates = pgTable('game_states', {
  id: serial('id').primaryKey(),
  roomId: uuid('room_id').notNull().references(() => gameRooms.id),
  turn: integer('turn').notNull(),
  gamePhase: varchar('game_phase', { length: 50 }).notNull(),
  companies: json('companies').notNull(),
  map: json('map'),
  gameData: json('game_data'), // Additional game state data
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const gameActions = pgTable('game_actions', {
  id: serial('id').primaryKey(),
  roomId: uuid('room_id').notNull().references(() => gameRooms.id),
  userId: integer('user_id').references(() => users.id),
  actionType: varchar('action_type', { length: 50 }).notNull(),
  actionData: json('action_data').notNull(),
  turn: integer('turn').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const gameStatistics = pgTable('game_statistics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  gamesPlayed: integer('games_played').notNull().default(0),
  gamesWon: integer('games_won').notNull().default(0),
  averageRank: integer('average_rank').default(0),
  totalPlayTime: integer('total_play_time').notNull().default(0), // in seconds
  highestAssets: integer('highest_assets').default(0),
  lastPlayed: timestamp('last_played'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Achievement-related tables
export const playerAchievements = pgTable('player_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  totalPoints: integer('total_points').notNull().default(0),
  unlockedCount: integer('unlocked_count').notNull().default(0),
  badges: json('badges').default([]), // Array of badge names
  titles: json('titles').default([]), // Array of title names
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const unlockedAchievements = pgTable('unlocked_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  achievementId: varchar('achievement_id', { length: 100 }).notNull(),
  unlockedAt: timestamp('unlocked_at').notNull().defaultNow(),
  pointsEarned: integer('points_earned').notNull().default(0),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  roomId: uuid('room_id').notNull().references(() => gameRooms.id),
  userId: integer('user_id').references(() => users.id),
  playerName: varchar('player_name', { length: 100 }).notNull(),
  message: text('message').notNull(),
  messageType: varchar('message_type', { length: 20 }).notNull().default('chat'), // 'chat', 'system', 'action'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  activityLogs: many(activityLogs),
  hostedRooms: many(gameRooms),
  participations: many(gameParticipants),
  actions: many(gameActions),
  statistics: one(gameStatistics),
  achievements: one(playerAchievements),
  unlockedAchievements: many(unlockedAchievements),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const gameRoomsRelations = relations(gameRooms, ({ one, many }) => ({
  host: one(users, {
    fields: [gameRooms.hostId],
    references: [users.id],
  }),
  participants: many(gameParticipants),
  states: many(gameStates),
  actions: many(gameActions),
  chatMessages: many(chatMessages),
}));

export const gameParticipantsRelations = relations(gameParticipants, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gameParticipants.roomId],
    references: [gameRooms.id],
  }),
  user: one(users, {
    fields: [gameParticipants.userId],
    references: [users.id],
  }),
}));

export const gameStatesRelations = relations(gameStates, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gameStates.roomId],
    references: [gameRooms.id],
  }),
}));

export const gameActionsRelations = relations(gameActions, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gameActions.roomId],
    references: [gameRooms.id],
  }),
  user: one(users, {
    fields: [gameActions.userId],
    references: [users.id],
  }),
}));

export const gameStatisticsRelations = relations(gameStatistics, ({ one }) => ({
  user: one(users, {
    fields: [gameStatistics.userId],
    references: [users.id],
  }),
}));

export const playerAchievementsRelations = relations(playerAchievements, ({ one }) => ({
  user: one(users, {
    fields: [playerAchievements.userId],
    references: [users.id],
  }),
}));

export const unlockedAchievementsRelations = relations(unlockedAchievements, ({ one }) => ({
  user: one(users, {
    fields: [unlockedAchievements.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  room: one(gameRooms, {
    fields: [chatMessages.roomId],
    references: [gameRooms.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

// Game-related types
export type GameRoom = typeof gameRooms.$inferSelect;
export type NewGameRoom = typeof gameRooms.$inferInsert;
export type GameParticipant = typeof gameParticipants.$inferSelect;
export type NewGameParticipant = typeof gameParticipants.$inferInsert;
export type GameState = typeof gameStates.$inferSelect;
export type NewGameState = typeof gameStates.$inferInsert;
export type GameAction = typeof gameActions.$inferSelect;
export type NewGameAction = typeof gameActions.$inferInsert;
export type GameStatistics = typeof gameStatistics.$inferSelect;
export type NewGameStatistics = typeof gameStatistics.$inferInsert;
export type PlayerAchievements = typeof playerAchievements.$inferSelect;
export type NewPlayerAchievements = typeof playerAchievements.$inferInsert;
export type UnlockedAchievement = typeof unlockedAchievements.$inferSelect;
export type NewUnlockedAchievement = typeof unlockedAchievements.$inferInsert;

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  SHARE_CREATED = 'SHARE_CREATED',
  SHARE_ACCESSED = 'SHARE_ACCESSED',
  SHARE_UPDATED = 'SHARE_UPDATED',
  SHARE_DELETED = 'SHARE_DELETED',
  GAME_JOINED = 'GAME_JOINED',
  GAME_STARTED = 'GAME_STARTED',
  GAME_COMPLETED = 'GAME_COMPLETED',
  GAME_LEFT = 'GAME_LEFT',
}

export enum GamePhase {
  LOBBY = 'lobby',
  SETUP = 'setup',
  PLAYING = 'playing',
  ENDED = 'ended',
}

export enum ActionType {
  MOVE_AGENT = 'move_agent',
  PURCHASE_BUILDING = 'purchase_building',
  RECRUIT_EMPLOYEE = 'recruit_employee',
  ATTACK_COMPANY = 'attack_company',
  INTELLIGENCE_OPERATION = 'intelligence_operation',
  STOCK_TRADE = 'stock_trade',
  COMPANY_DECISION = 'company_decision',
}
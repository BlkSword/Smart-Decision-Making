import { z } from 'zod';

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  roomName: z.string()
    .min(3, 'Room name must be at least 3 characters')
    .max(50, 'Room name too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Room name contains invalid characters'),
  uuid: z.string().uuid('Invalid UUID format'),
  positiveInteger: z.number().int().positive('Must be a positive integer'),
  nonNegativeInteger: z.number().int().min(0, 'Must be non-negative'),
  
  // Game-specific validation
  playerCount: z.number().int().min(2, 'Minimum 2 players').max(8, 'Maximum 8 players'),
  turnNumber: z.number().int().min(1, 'Turn number must be positive'),
  assetAmount: z.number().min(0, 'Asset amount cannot be negative'),
  
  // Security-related
  token: z.string().min(1, 'Token cannot be empty').max(1000, 'Token too long'),
  sessionId: z.string().min(1, 'Session ID cannot be empty').max(255, 'Session ID too long'),
  
  // Common text fields
  message: z.string().max(500, 'Message too long'),
  description: z.string().max(1000, 'Description too long'),
  
  // Pagination
  page: z.number().int().min(1, 'Page must be at least 1').max(1000, 'Page too high'),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit too high'),
  offset: z.number().int().min(0, 'Offset must be non-negative'),
};

/**
 * API request validation schemas
 */
export const apiSchemas = {
  // Authentication
  signIn: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password required').max(128, 'Password too long')
  }),
  
  signUp: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: commonSchemas.username
  }),
  
  // Game room management
  createRoom: z.object({
    name: commonSchemas.roomName,
    maxPlayers: commonSchemas.playerCount,
    isPrivate: z.boolean().optional().default(false),
    password: z.string().max(50, 'Password too long').optional(),
    gameMode: z.enum(['standard', 'competitive', 'blitz', 'sandbox']).optional().default('standard')
  }),
  
  joinRoom: z.object({
    roomId: commonSchemas.uuid,
    playerName: commonSchemas.username,
    password: z.string().max(50, 'Password too long').optional()
  }),
  
  // Game actions
  gameAction: z.object({
    roomId: commonSchemas.uuid,
    actionType: z.enum([
      'move_agent', 'purchase_building', 'make_trade', 'attack_company',
      'market_manipulation', 'form_alliance', 'end_turn'
    ]),
    actionData: z.record(z.any()),
    turn: commonSchemas.turnNumber
  }),
  
  // Chat
  sendMessage: z.object({
    roomId: commonSchemas.uuid,
    message: commonSchemas.message,
    messageType: z.enum(['chat', 'system', 'action']).optional().default('chat')
  }),
  
  // Admin actions
  banUser: z.object({
    userId: commonSchemas.positiveInteger,
    reason: z.string().max(255, 'Reason too long').optional()
  }),
  
  // Replay system
  replaySearch: z.object({
    roomName: z.string().max(50, 'Room name too long').optional(),
    playerName: z.string().max(50, 'Player name too long').optional(),
    gameMode: z.enum(['standard', 'competitive', 'blitz', 'sandbox']).optional(),
    minDuration: commonSchemas.nonNegativeInteger.optional(),
    maxDuration: commonSchemas.nonNegativeInteger.optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    limit: commonSchemas.limit.optional().default(20),
    offset: commonSchemas.offset.optional().default(0)
  }),
  
  // Pagination
  pagination: z.object({
    page: commonSchemas.page.optional().default(1),
    limit: commonSchemas.limit.optional().default(20)
  })
};

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate and sanitize HTML input
 */
export function sanitizeHtml(input: string): string {
  // Remove script tags and other dangerous elements
  const cleaned = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  return sanitizeString(cleaned);
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Check if password meets security requirements
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for common weak passwords
  const weakPasswords = [
    'password', '123456', 'qwerty', 'abc123', 'password123',
    'admin', 'login', 'welcome', 'monkey', 'dragon'
  ];
  
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate request body against schema
 */
export function validateRequestBody<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    
    return { success: false, errors: ['Invalid request data'] };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  params: Record<string, string | string[] | undefined>,
  schema: z.ZodSchema
): { success: true; data: any } | { success: false; errors: string[] } {
  // Convert string values to appropriate types
  const processedParams: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    
    if (Array.isArray(value)) {
      processedParams[key] = value;
    } else if (value === 'true') {
      processedParams[key] = true;
    } else if (value === 'false') {
      processedParams[key] = false;
    } else if (!isNaN(Number(value))) {
      processedParams[key] = Number(value);
    } else {
      processedParams[key] = value;
    }
  }
  
  return validateRequestBody(processedParams, schema);
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return function(data: unknown): T {
    const result = schema.parse(data);
    
    // Sanitize string fields
    if (typeof result === 'object' && result !== null) {
      const sanitized = { ...result };
      
      for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'string') {
          (sanitized as any)[key] = sanitizeString(value);
        }
      }
      
      return sanitized;
    }
    
    return result;
  };
}

/**
 * Security headers for API responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(headers: Headers): void {
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';

// CSRF token configuration
const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-key';
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

// Token storage (in production, use Redis or similar)
const tokenStore = new Map<string, { token: string; expiry: number; sessionId: string }>();

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const token = randomBytes(TOKEN_LENGTH).toString('hex');
  const expiry = Date.now() + TOKEN_EXPIRY;
  
  // Store token with session ID
  tokenStore.set(token, { token, expiry, sessionId });
  
  // Clean up expired tokens
  cleanupExpiredTokens();
  
  return token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionId: string): boolean {
  if (!token || !sessionId) {
    return false;
  }
  
  const storedToken = tokenStore.get(token);
  
  if (!storedToken) {
    return false;
  }
  
  // Check if token is expired
  if (Date.now() > storedToken.expiry) {
    tokenStore.delete(token);
    return false;
  }
  
  // Check if session ID matches
  if (storedToken.sessionId !== sessionId) {
    return false;
  }
  
  return true;
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiry) {
      tokenStore.delete(token);
    }
  }
}

/**
 * Get session ID from request
 */
function getSessionId(request: NextRequest): string | null {
  const sessionCookie = request.cookies.get('session');
  return sessionCookie?.value || null;
}

/**
 * CSRF middleware for protecting state-changing requests
 */
export function csrfMiddleware(request: NextRequest): NextResponse | null {
  const method = request.method;
  
  // Only check CSRF for state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }
  
  // Skip CSRF for certain paths (e.g., API endpoints with other auth)
  const pathname = request.nextUrl.pathname;
  const skipPaths = [
    '/api/webhooks/',
    '/api/auth/callback',
    '/api/upload'
  ];
  
  if (skipPaths.some(path => pathname.startsWith(path))) {
    return null;
  }
  
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Get CSRF token from header or form data
  const csrfToken = request.headers.get('x-csrf-token') || 
                   request.headers.get('X-CSRF-Token');
  
  if (!csrfToken) {
    return NextResponse.json(
      { 
        error: 'CSRF token missing',
        message: 'CSRF token is required for this request'
      },
      { status: 403 }
    );
  }
  
  if (!validateCSRFToken(csrfToken, sessionId)) {
    return NextResponse.json(
      { 
        error: 'Invalid CSRF token',
        message: 'CSRF token is invalid or expired'
      },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Generate CSRF token for client
 */
export function generateTokenForClient(sessionId: string): {
  token: string;
  expiry: number;
} {
  const token = generateCSRFToken(sessionId);
  const expiry = Date.now() + TOKEN_EXPIRY;
  
  return { token, expiry };
}

/**
 * CSRF token API endpoint handler
 */
export async function handleCSRFTokenRequest(request: NextRequest): Promise<NextResponse> {
  const sessionId = getSessionId(request);
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  const { token, expiry } = generateTokenForClient(sessionId);
  
  return NextResponse.json({
    csrfToken: token,
    expiry: expiry
  });
}

/**
 * Add CSRF token to response headers
 */
export function addCSRFTokenToResponse(response: NextResponse, sessionId: string): void {
  const token = generateCSRFToken(sessionId);
  response.headers.set('X-CSRF-Token', token);
}

/**
 * Validate double-submit cookie pattern
 */
export function validateDoubleSubmitCookie(request: NextRequest): boolean {
  const cookieToken = request.cookies.get('csrf-token')?.value;
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  // Compare tokens using constant-time comparison
  const cookieHash = createHmac('sha256', CSRF_SECRET).update(cookieToken).digest('hex');
  const headerHash = createHmac('sha256', CSRF_SECRET).update(headerToken).digest('hex');
  
  return cookieHash === headerHash;
}

/**
 * Create CSRF protection middleware
 */
export function createCSRFProtection(options: {
  ignoreMethods?: string[];
  ignorePaths?: string[];
  cookieName?: string;
  headerName?: string;
} = {}) {
  const {
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS'],
    ignorePaths = [],
    cookieName = 'csrf-token',
    headerName = 'x-csrf-token'
  } = options;
  
  return function(request: NextRequest): NextResponse | null {
    const method = request.method;
    const pathname = request.nextUrl.pathname;
    
    // Skip ignored methods
    if (ignoreMethods.includes(method)) {
      return null;
    }
    
    // Skip ignored paths
    if (ignorePaths.some(path => pathname.startsWith(path))) {
      return null;
    }
    
    // Validate CSRF token
    const sessionId = getSessionId(request);
    const csrfToken = request.headers.get(headerName);
    
    if (!sessionId || !csrfToken || !validateCSRFToken(csrfToken, sessionId)) {
      return NextResponse.json(
        { 
          error: 'CSRF validation failed',
          message: 'Invalid or missing CSRF token'
        },
        { status: 403 }
      );
    }
    
    return null;
  };
}

/**
 * Get all active CSRF tokens (admin function)
 */
export function getAllCSRFTokens(): Array<{
  token: string;
  sessionId: string;
  expiry: number;
  isExpired: boolean;
}> {
  const now = Date.now();
  const results = [];
  
  for (const [token, data] of tokenStore.entries()) {
    results.push({
      token,
      sessionId: data.sessionId,
      expiry: data.expiry,
      isExpired: now > data.expiry
    });
  }
  
  return results;
}

/**
 * Revoke CSRF token
 */
export function revokeCSRFToken(token: string): boolean {
  return tokenStore.delete(token);
}

/**
 * Revoke all CSRF tokens for a session
 */
export function revokeSessionCSRFTokens(sessionId: string): number {
  let revokedCount = 0;
  
  for (const [token, data] of tokenStore.entries()) {
    if (data.sessionId === sessionId) {
      tokenStore.delete(token);
      revokedCount++;
    }
  }
  
  return revokedCount;
}
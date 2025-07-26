import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * User roles for authorization
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

/**
 * Protected route configuration
 */
export const protectedRoutes = {
  '/admin': [UserRole.ADMIN],
  '/api/admin': [UserRole.ADMIN],
  '/api/moderator': [UserRole.ADMIN, UserRole.MODERATOR],
  '/api/game': [UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR],
  '/api/user': [UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR],
} as const;

/**
 * Public routes that don't require authentication
 */
export const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/health',
  '/api/csrf-token',
  '/_next',
  '/favicon.ico',
  '/robots.txt'
];

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<{
  authenticated: boolean;
  user: any | null;
  error?: string;
}> {
  try {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      return { authenticated: false, user: null, error: 'No session cookie' };
    }
    
    const session = await verifyToken(sessionCookie.value);
    
    if (!session) {
      return { authenticated: false, user: null, error: 'Invalid session' };
    }
    
    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        deletedAt: true
      }
    });
    
    if (!user) {
      return { authenticated: false, user: null, error: 'User not found' };
    }
    
    // Check if user is banned
    if (user.deletedAt) {
      return { authenticated: false, user: null, error: 'User is banned' };
    }
    
    return { authenticated: true, user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, user: null, error: 'Authentication failed' };
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: any, requiredRoles: UserRole[]): boolean {
  // For now, all users are treated as USER role
  // In a full implementation, roles would be stored in the database
  const userRole = user.email === 'admin@example.com' ? UserRole.ADMIN : UserRole.USER;
  
  return requiredRoles.includes(userRole);
}

/**
 * Authorization middleware
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );
  
  if (isPublicRoute) {
    return null;
  }
  
  // Check authentication
  const { authenticated, user, error } = await isAuthenticated(request);
  
  if (!authenticated) {
    // Redirect to login for page requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    
    // Return JSON error for API requests
    return NextResponse.json(
      { 
        error: 'Authentication required',
        message: error || 'Please sign in to access this resource'
      },
      { status: 401 }
    );
  }
  
  // Check authorization for protected routes
  for (const [route, requiredRoles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!hasRole(user, requiredRoles)) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            message: 'You do not have permission to access this resource'
          },
          { status: 403 }
        );
      }
    }
  }
  
  return null;
}

/**
 * Get current user from request
 */
export async function getCurrentUser(request: NextRequest): Promise<any | null> {
  const { authenticated, user } = await isAuthenticated(request);
  return authenticated ? user : null;
}

/**
 * Create authentication guard
 */
export function createAuthGuard(requiredRoles: UserRole[] = [UserRole.USER]) {
  return async function(request: NextRequest): Promise<NextResponse | null> {
    const { authenticated, user } = await isAuthenticated(request);
    
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (!hasRole(user, requiredRoles)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return null;
  };
}

/**
 * Admin-only guard
 */
export const adminGuard = createAuthGuard([UserRole.ADMIN]);

/**
 * User or admin guard
 */
export const userGuard = createAuthGuard([UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR]);

/**
 * Session management
 */
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const session = await verifyToken(sessionToken);
    
    if (!session) {
      return { valid: false, error: 'Invalid session token' };
    }
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        deletedAt: true
      }
    });
    
    if (!user || user.deletedAt) {
      return { valid: false, error: 'User not found or banned' };
    }
    
    return { valid: true, user };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Session validation failed' };
  }
}

/**
 * Check if request is from admin
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  const { authenticated, user } = await isAuthenticated(request);
  
  if (!authenticated) {
    return false;
  }
  
  return hasRole(user, [UserRole.ADMIN]);
}

/**
 * Security event logging
 */
export async function logSecurityEvent(
  event: string,
  request: NextRequest,
  additional?: Record<string, any>
): Promise<void> {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.ip || 'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  console.log('[SECURITY]', {
    event,
    ip,
    userAgent,
    pathname: request.nextUrl.pathname,
    method: request.method,
    timestamp: new Date().toISOString(),
    ...additional
  });
  
  // In production, you would save this to a security log database
  // await db.insert(securityLogs).values({
  //   event,
  //   ip,
  //   userAgent,
  //   pathname: request.nextUrl.pathname,
  //   method: request.method,
  //   additionalData: additional
  // });
}

/**
 * Brute force protection
 */
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkBruteForce(ip: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = ip;
  
  const existing = failedAttempts.get(key);
  
  if (!existing) {
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: now + windowMs
    };
  }
  
  // Check if window has expired
  if (now - existing.lastAttempt > windowMs) {
    failedAttempts.delete(key);
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: now + windowMs
    };
  }
  
  // Check if max attempts reached
  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.lastAttempt + windowMs
    };
  }
  
  return {
    allowed: true,
    remaining: maxAttempts - existing.count - 1,
    resetTime: existing.lastAttempt + windowMs
  };
}

/**
 * Record failed authentication attempt
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const key = ip;
  
  const existing = failedAttempts.get(key);
  
  if (!existing) {
    failedAttempts.set(key, { count: 1, lastAttempt: now });
  } else {
    existing.count++;
    existing.lastAttempt = now;
  }
}

/**
 * Reset failed attempts for IP
 */
export function resetFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}
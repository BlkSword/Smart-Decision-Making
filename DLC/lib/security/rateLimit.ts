import { NextRequest, NextResponse } from 'next/server';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number; }>();

// Rate limit configurations
export const RATE_LIMITS = {
  // API endpoints
  '/api/auth/signin': { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  '/api/auth/signup': { requests: 3, windowMs: 15 * 60 * 1000 }, // 3 requests per 15 minutes
  '/api/game/create': { requests: 10, windowMs: 5 * 60 * 1000 }, // 10 requests per 5 minutes
  '/api/game/join': { requests: 20, windowMs: 5 * 60 * 1000 }, // 20 requests per 5 minutes
  '/api/admin': { requests: 50, windowMs: 60 * 1000 }, // 50 requests per minute for admin
  
  // Default rate limits
  '/api': { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute for API
  'default': { requests: 200, windowMs: 60 * 1000 }, // 200 requests per minute for general
} as const;

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Get IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return request.ip || 'unknown';
}

/**
 * Get rate limit configuration for a path
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Check for exact matches first
  if (pathname in RATE_LIMITS) {
    return RATE_LIMITS[pathname as keyof typeof RATE_LIMITS];
  }
  
  // Check for path prefixes
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config;
    }
  }
  
  // Return default configuration
  return RATE_LIMITS.default;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(request: NextRequest, pathname: string): RateLimitResult {
  const ip = getClientIP(request);
  const config = getRateLimitConfig(pathname);
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  
  // Clean up expired entries
  cleanupExpiredEntries();
  
  // Get current rate limit data
  const existing = rateLimitStore.get(key);
  
  if (!existing) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    
    return {
      success: true,
      remaining: config.requests - 1,
      resetTime: now + config.windowMs
    };
  }
  
  // Check if window has expired
  if (now > existing.resetTime) {
    // Reset the counter
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    
    return {
      success: true,
      remaining: config.requests - 1,
      resetTime: now + config.windowMs
    };
  }
  
  // Check if limit exceeded
  if (existing.count >= config.requests) {
    return {
      success: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000)
    };
  }
  
  // Increment counter
  existing.count++;
  
  return {
    success: true,
    remaining: config.requests - existing.count,
    resetTime: existing.resetTime
  };
}

/**
 * Create rate limit middleware
 */
export function createRateLimitMiddleware(config?: RateLimitConfig) {
  return function(request: NextRequest, pathname: string): NextResponse | null {
    const result = checkRateLimit(request, pathname);
    
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': getRateLimitConfig(pathname).requests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': result.retryAfter?.toString() || '60'
          }
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', getRateLimitConfig(pathname).requests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    
    return response;
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit status for debugging
 */
export function getRateLimitStatus(ip: string, pathname: string) {
  const key = `${ip}:${pathname}`;
  const config = getRateLimitConfig(pathname);
  const existing = rateLimitStore.get(key);
  
  if (!existing) {
    return {
      requests: 0,
      limit: config.requests,
      remaining: config.requests,
      resetTime: Date.now() + config.windowMs
    };
  }
  
  return {
    requests: existing.count,
    limit: config.requests,
    remaining: Math.max(0, config.requests - existing.count),
    resetTime: existing.resetTime
  };
}

/**
 * Reset rate limit for a specific IP and path (admin function)
 */
export function resetRateLimit(ip: string, pathname: string): boolean {
  const key = `${ip}:${pathname}`;
  return rateLimitStore.delete(key);
}

/**
 * Get all rate limit entries (admin function)
 */
export function getAllRateLimits(): Array<{
  key: string;
  count: number;
  resetTime: number;
  ip: string;
  pathname: string;
}> {
  const results = [];
  
  for (const [key, value] of rateLimitStore.entries()) {
    const [ip, pathname] = key.split(':');
    results.push({
      key,
      count: value.count,
      resetTime: value.resetTime,
      ip,
      pathname
    });
  }
  
  return results;
}
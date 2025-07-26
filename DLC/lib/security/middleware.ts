import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitMiddleware } from './rateLimit';
import { csrfMiddleware } from './csrf';
import { authMiddleware } from './auth';
import { applySecurityHeaders } from './inputValidation';

/**
 * Security middleware configuration
 */
export interface SecurityConfig {
  enableRateLimit?: boolean;
  enableCSRF?: boolean;
  enableAuth?: boolean;
  enableSecurityHeaders?: boolean;
  customRules?: ((request: NextRequest) => NextResponse | null)[];
}

/**
 * Default security configuration
 */
const defaultConfig: SecurityConfig = {
  enableRateLimit: true,
  enableCSRF: true,
  enableAuth: true,
  enableSecurityHeaders: true,
  customRules: []
};

/**
 * Combined security middleware
 */
export async function securityMiddleware(
  request: NextRequest,
  config: SecurityConfig = defaultConfig
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  
  // Skip security checks for static assets
  if (pathname.startsWith('/_next/static/') || 
      pathname.startsWith('/favicon.ico') ||
      pathname.startsWith('/robots.txt')) {
    return null;
  }
  
  // 1. Rate limiting
  if (config.enableRateLimit) {
    const rateLimitResult = createRateLimitMiddleware()(request, pathname);
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }
  
  // 2. CSRF protection
  if (config.enableCSRF) {
    const csrfResult = csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }
  }
  
  // 3. Authentication and authorization
  if (config.enableAuth) {
    const authResult = await authMiddleware(request);
    if (authResult) {
      return authResult;
    }
  }
  
  // 4. Custom security rules
  if (config.customRules) {
    for (const rule of config.customRules) {
      const result = rule(request);
      if (result) {
        return result;
      }
    }
  }
  
  // 5. Apply security headers to response
  if (config.enableSecurityHeaders) {
    const response = NextResponse.next();
    applySecurityHeaders(response.headers);
    return response;
  }
  
  return null;
}

/**
 * Create security middleware with custom config
 */
export function createSecurityMiddleware(config: Partial<SecurityConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  
  return function(request: NextRequest): Promise<NextResponse | null> {
    return securityMiddleware(request, finalConfig);
  };
}

/**
 * API-specific security middleware
 */
export function apiSecurityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  return securityMiddleware(request, {
    enableRateLimit: true,
    enableCSRF: true,
    enableAuth: true,
    enableSecurityHeaders: true,
    customRules: [
      // API-specific rules
      (req) => {
        // Block requests with suspicious patterns
        const suspiciousPatterns = [
          '/api/admin/../../',
          '/api/../',
          '/api/./.'
        ];
        
        if (suspiciousPatterns.some(pattern => req.nextUrl.pathname.includes(pattern))) {
          return NextResponse.json(
            { error: 'Invalid request path' },
            { status: 400 }
          );
        }
        
        return null;
      },
      
      // Content-Type validation for POST requests
      (req) => {
        if (req.method === 'POST' && !req.headers.get('content-type')?.includes('application/json')) {
          return NextResponse.json(
            { error: 'Content-Type must be application/json' },
            { status: 400 }
          );
        }
        
        return null;
      }
    ]
  });
}

/**
 * Admin-specific security middleware
 */
export function adminSecurityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  return securityMiddleware(request, {
    enableRateLimit: true,
    enableCSRF: true,
    enableAuth: true,
    enableSecurityHeaders: true,
    customRules: [
      // Admin-specific rules
      (req) => {
        // Additional IP restriction for admin endpoints
        const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];
        
        if (allowedIPs.length > 0) {
          const clientIP = req.headers.get('x-forwarded-for') || 
                          req.headers.get('x-real-ip') || 
                          req.ip || 'unknown';
          
          if (!allowedIPs.includes(clientIP)) {
            return NextResponse.json(
              { error: 'Access denied from this IP' },
              { status: 403 }
            );
          }
        }
        
        return null;
      },
      
      // Time-based access control
      (req) => {
        const allowedHours = process.env.ADMIN_ALLOWED_HOURS?.split(',').map(Number) || [];
        
        if (allowedHours.length > 0) {
          const currentHour = new Date().getHours();
          
          if (!allowedHours.includes(currentHour)) {
            return NextResponse.json(
              { error: 'Admin access not allowed at this time' },
              { status: 403 }
            );
          }
        }
        
        return null;
      }
    ]
  });
}

/**
 * Game-specific security middleware
 */
export function gameSecurityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  return securityMiddleware(request, {
    enableRateLimit: true,
    enableCSRF: false, // WebSocket connections might not work with CSRF
    enableAuth: true,
    enableSecurityHeaders: true,
    customRules: [
      // Game-specific rules
      (req) => {
        // Validate game room ID format
        const roomIdPattern = /\/api\/game\/([a-f0-9-]{36})/;
        const match = req.nextUrl.pathname.match(roomIdPattern);
        
        if (match) {
          const roomId = match[1];
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          
          if (!uuidPattern.test(roomId)) {
            return NextResponse.json(
              { error: 'Invalid room ID format' },
              { status: 400 }
            );
          }
        }
        
        return null;
      }
    ]
  });
}

/**
 * Security event tracking
 */
export function trackSecurityEvent(
  event: string,
  request: NextRequest,
  severity: 'low' | 'medium' | 'high' = 'medium',
  additionalData?: Record<string, any>
): void {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.ip || 'unknown';
  
  const eventData = {
    event,
    severity,
    ip,
    pathname: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || 'unknown',
    timestamp: new Date().toISOString(),
    ...additionalData
  };
  
  console.log(`[SECURITY:${severity.toUpperCase()}]`, eventData);
  
  // In production, you would:
  // 1. Log to security database
  // 2. Send alerts for high severity events
  // 3. Update IP reputation systems
  // 4. Trigger automated responses
}

/**
 * Security health check
 */
export function getSecurityHealth(): {
  status: 'healthy' | 'warning' | 'critical';
  checks: Record<string, boolean>;
  recommendations: string[];
} {
  const checks = {
    csrfEnabled: true,
    rateLimitEnabled: true,
    securityHeadersEnabled: true,
    authEnabled: true,
    httpsEnabled: process.env.NODE_ENV === 'production',
    sessionSecure: process.env.NODE_ENV === 'production',
    csrfSecretSet: !!process.env.CSRF_SECRET,
    jwtSecretSet: !!process.env.JWT_SECRET,
    databaseSecured: true // Would check database security in production
  };
  
  const failed = Object.values(checks).filter(check => !check).length;
  const recommendations = [];
  
  if (!checks.httpsEnabled) {
    recommendations.push('Enable HTTPS in production');
  }
  
  if (!checks.sessionSecure) {
    recommendations.push('Use secure session cookies in production');
  }
  
  if (!checks.csrfSecretSet) {
    recommendations.push('Set CSRF_SECRET environment variable');
  }
  
  if (!checks.jwtSecretSet) {
    recommendations.push('Set JWT_SECRET environment variable');
  }
  
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  if (failed > 0) {
    status = failed > 2 ? 'critical' : 'warning';
  }
  
  return {
    status,
    checks,
    recommendations
  };
}

/**
 * Security monitoring stats
 */
export function getSecurityStats(): {
  rateLimitHits: number;
  csrfBlocks: number;
  authFailures: number;
  totalRequests: number;
  lastUpdated: string;
} {
  // In production, these would be pulled from monitoring systems
  return {
    rateLimitHits: 0,
    csrfBlocks: 0,
    authFailures: 0,
    totalRequests: 0,
    lastUpdated: new Date().toISOString()
  };
}
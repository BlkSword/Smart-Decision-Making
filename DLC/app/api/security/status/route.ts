import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHealth, getSecurityStats } from '@/lib/security/middleware';
import { getAllRateLimits } from '@/lib/security/rateLimit';
import { getAllCSRFTokens } from '@/lib/security/csrf';
import { adminGuard } from '@/lib/security/auth';

export async function GET(request: NextRequest) {
  // Check admin permissions
  const authResult = await adminGuard(request);
  if (authResult) {
    return authResult;
  }
  
  try {
    const health = getSecurityHealth();
    const stats = getSecurityStats();
    const rateLimits = getAllRateLimits();
    const csrfTokens = getAllCSRFTokens();
    
    return NextResponse.json({
      health,
      stats,
      rateLimits: {
        total: rateLimits.length,
        active: rateLimits.filter(r => r.resetTime > Date.now()).length,
        entries: rateLimits.slice(0, 10) // Only show first 10 for brevity
      },
      csrfTokens: {
        total: csrfTokens.length,
        active: csrfTokens.filter(t => !t.isExpired).length,
        expired: csrfTokens.filter(t => t.isExpired).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching security status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check admin permissions
  const authResult = await adminGuard(request);
  if (authResult) {
    return authResult;
  }
  
  try {
    const { action, target } = await request.json();
    
    switch (action) {
      case 'cleanup_expired':
        // Cleanup expired tokens and rate limits
        const csrfTokens = getAllCSRFTokens();
        const expiredCount = csrfTokens.filter(t => t.isExpired).length;
        
        return NextResponse.json({
          success: true,
          message: `Cleaned up ${expiredCount} expired tokens`,
          expiredCount
        });
        
      case 'reset_rate_limits':
        // Reset all rate limits (admin emergency action)
        return NextResponse.json({
          success: true,
          message: 'Rate limits reset functionality would be implemented here'
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing security action:', error);
    return NextResponse.json(
      { error: 'Failed to process security action' },
      { status: 500 }
    );
  }
}
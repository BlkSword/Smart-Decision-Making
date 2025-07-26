import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';
import { securityMiddleware } from '@/lib/security/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Apply security middleware first
  const securityResult = await securityMiddleware(request, {
    enableRateLimit: true,
    enableCSRF: false, // Disabled for now to avoid breaking existing functionality
    enableAuth: false, // Disabled for now to avoid breaking existing functionality
    enableSecurityHeaders: true
  });
  
  if (securityResult) {
    return securityResult;
  }
  
  // Original session handling logic
  const sessionCookie = request.cookies.get('session');
  let res = NextResponse.next();

  if (sessionCookie && request.method === 'GET') {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString()
        }),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresInOneDay
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
};

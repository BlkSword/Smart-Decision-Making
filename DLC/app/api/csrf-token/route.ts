import { NextRequest, NextResponse } from 'next/server';
import { handleCSRFTokenRequest } from '@/lib/security/csrf';

export async function GET(request: NextRequest) {
  return handleCSRFTokenRequest(request);
}
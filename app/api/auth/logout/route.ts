import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ status: 'ok', success: true });
  clearSessionCookies(response, request);
  return response;
}

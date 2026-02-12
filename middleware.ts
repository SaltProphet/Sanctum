import { createViewerSessionId, SESSION_COOKIE_NAME } from '@/lib/watermark';
import { NextRequest, NextResponse } from 'next/server';

const BLOCKED_US_STATE_CODES = [
  'TX',
  'LA',
  'UT',
  'NC',
  'AR',
  'MS',
  'VA',
  'MT',
  'FL',
  'KS',
  'ID',
  'IN',
  'KY',
  'NE',
  'OK',
  'AL',
] as const;

const BLOCKED_US_STATE_SET = new Set<string>(BLOCKED_US_STATE_CODES);

function attachViewerSessionCookie(req: NextRequest, response: NextResponse): NextResponse {
  if (req.cookies.get(SESSION_COOKIE_NAME)) {
    return response;
  }

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createViewerSessionId(),
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}

export function middleware(req: NextRequest) {
  const country = req.geo?.country ?? req.headers.get('x-vercel-ip-country') ?? undefined;
  const region = req.geo?.region ?? req.headers.get('x-vercel-ip-country-region') ?? undefined;

  if (country === 'US' && region && BLOCKED_US_STATE_SET.has(region)) {
    const blockedUrl = req.nextUrl.clone();
    blockedUrl.pathname = '/blocked';
    blockedUrl.search = '';

    return attachViewerSessionCookie(req, NextResponse.redirect(blockedUrl));
  }

  return attachViewerSessionCookie(req, NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!blocked|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)',
  ],
};

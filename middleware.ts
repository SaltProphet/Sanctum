import { NextRequest, NextResponse } from 'next/server';

const BLOCKED_STATES = [
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

const BLOCKED_STATE_SET = new Set<string>(BLOCKED_STATES);

export function middleware(req: NextRequest) {
  const country = req.geo?.country;
  const region = req.geo?.region;

  if (country === 'US' && region && BLOCKED_STATE_SET.has(region)) {
    const blockedUrl = req.nextUrl.clone();
    blockedUrl.pathname = '/blocked';
    blockedUrl.search = '';

    return NextResponse.redirect(blockedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|blocked|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)',
  ],
};

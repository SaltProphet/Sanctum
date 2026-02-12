import { NextRequest, NextResponse } from 'next/server';

const BLOCKED_US_STATE_CODES = ['TX', 'LA', 'UT', 'NC', 'VA', 'MT', 'AR', 'MS'] as const;
const BLOCKED_US_STATE_SET = new Set<string>(BLOCKED_US_STATE_CODES);

export function middleware(req: NextRequest) {
  const country = req.geo?.country ?? req.headers.get('x-vercel-ip-country') ?? undefined;
  const region = req.geo?.region ?? req.headers.get('x-vercel-ip-country-region') ?? undefined;

  if (country === 'US' && region && BLOCKED_US_STATE_SET.has(region)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/blocked';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!blocked|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};

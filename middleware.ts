import { appRoutes } from '@/lib/routes';
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

// Whitelisted IPs for admin/dev access
const WHITELISTED_IPS = new Set<string>([
  '66.51.114.118',              // Admin IPv4
  '2605:940:612:7600::',        // Admin IPv6
]);

function attachViewerSessionCookie(req: NextRequest, response: NextResponse): NextResponse {
  let sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    sessionId = createViewerSessionId();
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionId,
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
  }

  // Pass session ID to server components via header since cookies set in middleware
  // are not visible to cookies() in the same request
  response.headers.set('x-viewer-session-id', sessionId);

  return response;
}

export function middleware(req: NextRequest) {
  // Check if IP is whitelisted first (allows admin/dev access from blocked regions)
  const clientIp = req.ip ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip');
  
  if (clientIp && WHITELISTED_IPS.has(clientIp)) {
    return attachViewerSessionCookie(req, NextResponse.next());
  }

  // TEMPORARILY DISABLED: Geo-blocking logic
  // const country = req.geo?.country ?? req.headers.get('x-vercel-ip-country') ?? undefined;
  // const region = req.geo?.region ?? req.headers.get('x-vercel-ip-country-region') ?? undefined;

  // if (country === 'US' && region && BLOCKED_US_STATE_SET.has(region)) {
  //   const blockedUrl = req.nextUrl.clone();
  //   blockedUrl.pathname = appRoutes.blocked();
  //   blockedUrl.search = '';

  //   return attachViewerSessionCookie(req, NextResponse.redirect(blockedUrl));
  // }

  return attachViewerSessionCookie(req, NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!blocked|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)',
  ],
};

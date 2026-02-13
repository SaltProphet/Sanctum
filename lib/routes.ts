const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

function normalizeBasePath(rawBasePath: string | undefined): string {
  if (!rawBasePath) {
    return '';
  }

  const trimmed = rawBasePath.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed;
}

const APP_BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function withBasePath(pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (!APP_BASE_PATH) {
    return normalizedPath;
  }

  if (normalizedPath === '/') {
    return APP_BASE_PATH;
  }

  return `${APP_BASE_PATH}${normalizedPath}`;
}

export function toAbsoluteAppUrl(pathname: string, origin: string): string {
  if (ABSOLUTE_URL_PATTERN.test(pathname)) {
    return pathname;
  }

  return new URL(withBasePath(pathname), origin).toString();
}

export const appRoutes = {
  home: (): string => withBasePath('/'),
  blocked: (): string => withBasePath('/blocked'),
  dashboard: (): string => withBasePath('/dashboard'),
  terms: (): string => withBasePath('/terms'),
  feed: (): string => withBasePath('/feed'),
  profile: (): string => withBasePath('/profile'),
  settings: (): string => withBasePath('/settings'),
  room: (roomId: string): string => withBasePath(`/room/${roomId}`),
  creator: (slug: string): string => withBasePath(`/c/${slug}`),
};

export const externalRoutes = {
  panicRedirect: 'https://google.com',
  supportEmail: 'mailto:support@sanctum.app',
};

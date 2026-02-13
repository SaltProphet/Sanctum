/** @type {import('next').NextConfig} */
const normalizeBasePath = (value) => {
  if (!value) return '';
  if (value === '/') return '';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
};

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH);
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? process.env.ASSET_PREFIX ?? undefined;
const trailingSlash = process.env.NEXT_PUBLIC_TRAILING_SLASH === 'true';

const nextConfig = {
  basePath,
  assetPrefix,
  trailingSlash,
  async rewrites() {
    return [];
  },
};

export default nextConfig;

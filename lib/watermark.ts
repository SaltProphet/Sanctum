export type CreatorTier = 'burner' | 'professional' | 'empire';

export type BrandingWatermark =
  | { kind: 'sanctum'; src: string; alt: string }
  | { kind: 'custom'; src: string; alt: string }
  | { kind: 'none' };

type BrandingWatermarkOptions = {
  tierParam: string | null;
  customLogoUrlParam: string | null;
};

const SANCTUM_WATERMARK_SRC = '/SanctumLogo.png';
const DEFAULT_CUSTOM_WATERMARK_SRC = '/UserUpload.png';

export function resolveCreatorTier(tierParam: string | null): CreatorTier {
  if (tierParam === '3' || tierParam === 'empire') {
    return 'empire';
  }

  if (tierParam === '2' || tierParam === 'professional') {
    return 'professional';
  }

  return 'burner';
}

export function getBrandingWatermark({ tierParam, customLogoUrlParam }: BrandingWatermarkOptions): BrandingWatermark {
  const tier = resolveCreatorTier(tierParam);

  if (tier === 'professional') {
    return { kind: 'none' };
  }

  if (tier === 'empire') {
    return {
      kind: 'custom',
      src: customLogoUrlParam || DEFAULT_CUSTOM_WATERMARK_SRC,
      alt: 'Creator branding watermark',
    };
  }

  return {
    kind: 'sanctum',
    src: SANCTUM_WATERMARK_SRC,
    alt: 'Powered by Sanctum watermark',
  };
}

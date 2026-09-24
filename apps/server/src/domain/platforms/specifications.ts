export type PlatformId = 'instagram' | 'x';

export interface ImageSpec {
  width: number;
  height: number;
  aspectRatio: '1:1' | '16:9';
  safeZoneMarginPercent: number; // e.g. 10 means 10% padding on each edge (80% inner safe box)
}

export interface CaptionRules {
  maxCharacters: number;
  hashtagPolicy: string;
  formattingRules: string[];
}

export interface PlatformSpec {
  id: PlatformId;
  name: string;
  image: ImageSpec;
  caption: CaptionRules;
}

export const INSTAGRAM_SPEC: PlatformSpec = {
  id: 'instagram',
  name: 'Instagram',
  image: {
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    safeZoneMarginPercent: 10, // Main subject must remain within center 864x864 px area
  },
  caption: {
    maxCharacters: 2200,
    hashtagPolicy: 'Include 3-5 relevant hashtags at the end of the post',
    formattingRules: [
      'Visual-first and engaging tone',
      'Use line breaks for readability',
      'Include a clear call-to-action link in bio reference',
    ],
  },
};

export const X_SPEC: PlatformSpec = {
  id: 'x',
  name: 'X (formerly Twitter)',
  image: {
    width: 1600,
    height: 900,
    aspectRatio: '16:9',
    safeZoneMarginPercent: 10, // Main subject must remain within center 1280x720 px area
  },
  caption: {
    maxCharacters: 280,
    hashtagPolicy: 'Limit to 1-2 concise, highly relevant hashtags',
    formattingRules: [
      'Concise, punchy, and direct',
      'Put key takeaway in the first sentence',
      'Include direct blog URL link',
    ],
  },
};

export const PLATFORM_SPECS: Record<PlatformId, PlatformSpec> = {
  instagram: INSTAGRAM_SPEC,
  x: X_SPEC,
};

/**
 * Caption Composition Contract
 * Separate shared brand voice from platform-specific rules.
 */
export interface SharedBrandVoice {
  tone: string;
  targetAudience: string;
  coreMessage: string;
}

export interface ContentSummary {
  title: string;
  summary: string;
  url: string;
}

export interface CaptionComposeInput {
  sharedVoice: SharedBrandVoice;
  content: ContentSummary;
  platform: PlatformId;
}

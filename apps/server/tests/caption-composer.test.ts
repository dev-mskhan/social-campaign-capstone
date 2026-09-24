import { describe, it, expect } from 'vitest';
import { CaptionComposerService } from '../src/modules/content/caption-composer.service';
import { INSTAGRAM_SPEC, X_SPEC } from '../src/domain/platforms/specifications';

describe('Caption Composer Service Tests', () => {
  const service = new CaptionComposerService();

  const sampleInput = {
    sharedVoice: {
      tone: 'Informative & Professional',
      targetAudience: 'Software Developers',
      coreMessage: 'Antigravity 2.0 release brings autonomous agent capabilities.',
    },
    content: {
      title: 'Announcing Antigravity 2.0: The Next Gen AI Pair Programmer',
      summary:
        'Antigravity 2.0 is now live with enhanced context windows, multi-agent orchestrations, fast vitest test automation, and seamless Drizzle ORM database migrations.',
      url: 'https://example.com/blog/antigravity-2.0',
    },
  };

  it('should compose Instagram caption respecting Instagram character limits and hashtag policy', () => {
    const caption = service.composeCaption({
      ...sampleInput,
      platform: 'instagram',
    });

    expect(caption.length).toBeLessThanOrEqual(INSTAGRAM_SPEC.caption.maxCharacters);
    expect(caption).toContain(sampleInput.content.title);
    expect(caption).toContain('#SocialCampaign');
    expect(caption).toContain('link in our bio');
  });

  it('should compose X caption strictly under 280 character limit', () => {
    const caption = service.composeCaption({
      ...sampleInput,
      platform: 'x',
    });

    expect(caption.length).toBeLessThanOrEqual(X_SPEC.caption.maxCharacters);
    expect(caption.length).toBeLessThanOrEqual(280);
    expect(caption).toContain('#Tech');
    expect(caption).toContain(sampleInput.content.url);
  });

  it('should generate distinct captions for Instagram vs X', () => {
    const instaCaption = service.composeCaption({ ...sampleInput, platform: 'instagram' });
    const xCaption = service.composeCaption({ ...sampleInput, platform: 'x' });

    expect(instaCaption).not.toEqual(xCaption);
  });
});

import {
  PLATFORM_SPECS,
  SharedBrandVoice,
  ContentSummary,
  CaptionComposeInput,
} from '../../domain/platforms/specifications';
import { logger } from '../../infrastructure/logger';

export class CaptionComposerService {
  /**
   * Composes platform-tailored captions from shared content and brand voice according to Phase 1 specs.
   */
  composeCaption(input: CaptionComposeInput): string {
    const { sharedVoice, content, platform } = input;
    const spec = PLATFORM_SPECS[platform];

    if (!spec) {
      throw new Error(`Unsupported platform for caption composer: ${platform}`);
    }

    let caption = '';

    if (platform === 'instagram') {
      caption = this.composeInstagramCaption(sharedVoice, content);
    } else if (platform === 'x') {
      caption = this.composeXCaption(sharedVoice, content);
    } else {
      caption = `${content.title}\n\n${content.summary}\n\nRead more: ${content.url}`;
    }

    // Enforce platform character limit
    if (caption.length > spec.caption.maxCharacters) {
      caption = caption.substring(0, spec.caption.maxCharacters - 3) + '...';
    }

    logger.info(
      { platform, characterCount: caption.length, maxLimit: spec.caption.maxCharacters },
      'Composed platform-tailored caption'
    );

    return caption;
  }

  private composeInstagramCaption(voice: SharedBrandVoice, content: ContentSummary): string {
    const hashtags = '#SocialCampaign #TechTrends #Innovation #DigitalMarketing #Growth';

    return (
      `✨ ${content.title}\n\n` +
      `💡 ${content.summary}\n\n` +
      `📌 ${voice.coreMessage}\n\n` +
      `👉 Read the full story via the link in our bio: ${content.url}\n\n` +
      `${hashtags}`
    );
  }

  private composeXCaption(voice: SharedBrandVoice, content: ContentSummary): string {
    const hashtag = '#Tech';

    // X has a strict 280 character limit
    const prefix = `🚀 ${content.title}: `;
    const link = `\n🔗 ${content.url} ${hashtag}`;
    const maxSummaryLength = 280 - (prefix.length + link.length + 5);

    let summaryText = content.summary || voice.coreMessage;
    if (summaryText.length > maxSummaryLength) {
      summaryText = summaryText.substring(0, maxSummaryLength - 3) + '...';
    }

    return `${prefix}${summaryText}${link}`;
  }
}

export const captionComposerService = new CaptionComposerService();

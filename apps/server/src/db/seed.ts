import { closeDatabaseConnection } from './client';
import { campaignsService } from '../modules/campaigns/campaigns.service';
import { tokensService } from '../modules/tokens/tokens.service';
import { logger } from '../infrastructure/logger';

async function seed() {
  logger.info('🌱 Seeding deterministic demo campaign data...');

  try {
    // 1. Acquire & encrypt OAuth tokens for both platforms
    await tokensService.acquireAndStoreToken('instagram');
    await tokensService.acquireAndStoreToken('x');
    logger.info('✅ OAuth access tokens acquired and encrypted with AES-256-GCM in platform_tokens table');

    // 2. Seed immediate multi-platform campaign
    const immediateCampaign = await campaignsService.createCampaign({
      title: 'AI-Powered Multi-Platform Social Publisher Launch',
      body: 'Discover how our automated backend engine generates platform-tailored image variants (Instagram 1080x1080, X 1600x900), composes compliant captions, and guarantees idempotent publishing.',
      sourceUrl: 'https://flyrank.com/blog/ai-social-publisher-launch',
      sourceImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      platforms: ['instagram', 'x'],
    });

    logger.info(
      { campaignId: immediateCampaign.id, postsCount: immediateCampaign.posts.length },
      '✅ Seeded immediate campaign with Instagram and X post drafts'
    );

    // 3. Seed future scheduled campaign
    const scheduledAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour in future
    const scheduledCampaign = await campaignsService.createCampaign({
      title: 'Scheduled Product Feature Spotlight (Time-Advance Demo)',
      body: 'This campaign is scheduled for durable BullMQ delayed queue processing with worker crash recovery.',
      sourceUrl: 'https://flyrank.com/blog/feature-spotlight',
      sourceImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
      platforms: ['instagram'],
      scheduledAt,
    });

    logger.info(
      { campaignId: scheduledCampaign.id, scheduledAt },
      '✅ Seeded scheduled campaign with BullMQ delayed queue job'
    );

    console.log('\n================================================================');
    console.log('🎉 DEMO CAMPAIGN SEED COMPLETE!');
    console.log('----------------------------------------------------------------');
    console.log(`Immediate Campaign ID: ${immediateCampaign.id}`);
    console.log(`Instagram Post ID:     ${immediateCampaign.posts.find(p => p.platform === 'instagram')?.id}`);
    console.log(`X Post ID:             ${immediateCampaign.posts.find(p => p.platform === 'x')?.id}`);
    console.log(`Scheduled Campaign ID: ${scheduledCampaign.id} (Scheduled at: ${scheduledAt})`);
    console.log('================================================================\n');

  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, '❌ Seed script execution failed');
    process.exit(1);
  } finally {
    const { closeRedisConnection } = await import('../infrastructure/redis/client.js');
    const { publishingQueue } = await import('../infrastructure/queue/publishing-queue.js');
    await publishingQueue.close();
    await closeRedisConnection();
    await closeDatabaseConnection();
  }
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});

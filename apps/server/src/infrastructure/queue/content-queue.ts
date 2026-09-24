import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../redis/client';
import { logger } from '../logger';
import { campaignsService } from '../../modules/campaigns/campaigns.service';
import { CreateCampaignRequest } from '../../domain/api/contracts';

export const CONTENT_QUEUE_NAME = 'content-generation-queue';

export const contentQueue = new Queue(CONTENT_QUEUE_NAME, {
  connection: redis,
});

export async function addContentGenerationJob(payload: CreateCampaignRequest) {
  return await contentQueue.add('generate-content-job', payload);
}

export function createContentWorker() {
  const worker = new Worker(
    CONTENT_QUEUE_NAME,
    async (job: Job<CreateCampaignRequest>) => {
      logger.info(
        { jobId: job.id, title: job.data.title, platforms: job.data.platforms },
        'Processing async content generation job'
      );
      const campaignResponse = await campaignsService.createCampaign(job.data);
      return { status: 'success', campaignId: campaignResponse.id };
    },
    {
      connection: redis,
    }
  );

  worker.on('completed', (job: Job, returnvalue: unknown) => {
    logger.info({ jobId: job.id, returnvalue }, 'Content generation job completed');
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    logger.error({ jobId: job?.id, error }, 'Content generation job failed');
  });

  return worker;
}

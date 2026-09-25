import { FastifyReply, FastifyRequest } from 'fastify';
import { publishingService, PublishOptions } from './publishing.service';

export async function publishPostHandler(
  request: FastifyRequest<{ Params: { id: string }; Body?: PublishOptions }>,
  reply: FastifyReply
) {
  const result = await publishingService.publishPost(
    request.params.id,
    request.body || {}
  );
  
  return reply.status(200).send({
    ...result,
    publishedAt: result.publishedAt.toISOString(),
  });
}

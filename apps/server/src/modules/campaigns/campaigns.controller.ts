import { FastifyReply, FastifyRequest } from 'fastify';
import { campaignsService } from './campaigns.service';
import { CreateCampaignRequest } from '../../domain/api/contracts';

export async function createCampaignHandler(
  request: FastifyRequest<{ Body: CreateCampaignRequest }>,
  reply: FastifyReply
) {
  const result = await campaignsService.createCampaign(request.body);
  return reply.status(201).send(result);
}

export async function getCampaignHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await campaignsService.getCampaignById(request.params.id);
  return reply.status(200).send(result);
}

export async function getCampaignPostsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await campaignsService.getCampaignPosts(request.params.id);
  return reply.status(200).send(result);
}

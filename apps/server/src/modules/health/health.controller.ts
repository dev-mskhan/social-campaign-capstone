import { FastifyReply, FastifyRequest } from 'fastify';
import { healthService } from './health.service';

export async function getHealthHandler(_request: FastifyRequest, reply: FastifyReply) {
  const result = healthService.getLiveness();
  return reply.status(200).send(result);
}

export async function getReadinessHandler(_request: FastifyRequest, reply: FastifyReply) {
  const result = await healthService.getReadiness();
  const statusCode = result.status === 'ready' ? 200 : 503;
  return reply.status(statusCode).send(result);
}

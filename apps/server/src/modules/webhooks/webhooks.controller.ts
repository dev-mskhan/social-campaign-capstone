import { FastifyReply, FastifyRequest } from 'fastify';
import { webhooksService, DeliveryWebhookPayload } from './webhooks.service';

export async function handleDeliveryWebhook(
  request: FastifyRequest<{ Body: DeliveryWebhookPayload }>,
  reply: FastifyReply
) {
  const signatureHeader =
    (request.headers['x-social-signature'] as string) ||
    (request.headers['x-signature'] as string) ||
    (request.headers['x-hub-signature-256'] as string);

  // Extract raw body string attached by preParsing hook or fall back to payload string
  const rawBody = (request as any).rawBody || JSON.stringify(request.body);

  const result = await webhooksService.processDeliveryWebhook(
    rawBody,
    signatureHeader,
    request.body
  );

  return reply.status(200).send(result);
}

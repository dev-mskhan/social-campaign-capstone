import crypto from 'node:crypto';
import { config } from '../../config/config';

/**
 * Computes an HMAC SHA-256 signature for a raw body payload using the configured secret.
 */
export function generateWebhookSignature(
  rawBody: string | Buffer,
  secret: string = config.security.webhookSecret
): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  return hmac.digest('hex');
}

/**
 * Constant-time verification of webhook HMAC SHA-256 signatures.
 * Protects against timing attacks.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined | null,
  secret: string = config.security.webhookSecret
): boolean {
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return false;
  }

  // Strip prefix if present (e.g. "sha256=abcdef...")
  const cleanSignature = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7).trim()
    : signatureHeader.trim();

  // Ensure valid hex string
  if (!/^[0-9a-fA-F]{64}$/.test(cleanSignature)) {
    return false;
  }

  const expectedHex = generateWebhookSignature(rawBody, secret);

  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const providedBuffer = Buffer.from(cleanSignature, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

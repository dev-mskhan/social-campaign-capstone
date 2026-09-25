import { describe, it, expect } from 'vitest';
import { generateWebhookSignature, verifyWebhookSignature } from '../src/infrastructure/security/webhook-signature';

describe('HMAC SHA-256 Webhook Signature Security Tests', () => {
  const secret = 'fake_webhook_signing_secret_key_12345';
  const payload = JSON.stringify({
    eventId: 'evt_123',
    externalPostId: 'fake_post_456',
    status: 'delivered',
  });

  it('should generate a valid hex signature and verify successfully', () => {
    const signature = generateWebhookSignature(payload, secret);
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64);

    const isValid = verifyWebhookSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it('should verify signatures with "sha256=" prefix', () => {
    const rawSig = generateWebhookSignature(payload, secret);
    const prefixedSig = `sha256=${rawSig}`;

    expect(verifyWebhookSignature(payload, prefixedSig, secret)).toBe(true);
  });

  it('should reject missing or null signature headers', () => {
    expect(verifyWebhookSignature(payload, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(payload, null as any, secret)).toBe(false);
    expect(verifyWebhookSignature(payload, '', secret)).toBe(false);
  });

  it('should reject forged signatures generated with wrong secret', () => {
    const forgedSignature = generateWebhookSignature(payload, 'wrong_secret_key');
    expect(verifyWebhookSignature(payload, forgedSignature, secret)).toBe(false);
  });

  it('should reject signature when payload has been tampered with', () => {
    const validSignature = generateWebhookSignature(payload, secret);
    const tamperedPayload = JSON.stringify({
      eventId: 'evt_123',
      externalPostId: 'fake_post_456',
      status: 'delivered_TAMPERED',
    });

    expect(verifyWebhookSignature(tamperedPayload, validSignature, secret)).toBe(false);
  });

  it('should reject malformed signature strings safely without throwing', () => {
    expect(verifyWebhookSignature(payload, 'invalid-hex-string', secret)).toBe(false);
    expect(verifyWebhookSignature(payload, '1234', secret)).toBe(false);
  });
});

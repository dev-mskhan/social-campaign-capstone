import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../src/infrastructure/security/token-encryption';

describe('AES-256-GCM Token Encryption Security Tests', () => {
  it('should encrypt token and decrypt back to exact original plaintext', () => {
    const rawToken = 'fake_oauth_token_secret_12345';
    const encrypted = encryptToken(rawToken);

    expect(encrypted.encryptedToken).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.encryptedToken).not.toEqual(rawToken);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toEqual(rawToken);
  });

  it('should generate a new random IV for every encryption operation', () => {
    const rawToken = 'same_secret_token';
    const enc1 = encryptToken(rawToken);
    const enc2 = encryptToken(rawToken);

    expect(enc1.iv).not.toEqual(enc2.iv);
    expect(enc1.encryptedToken).not.toEqual(enc2.encryptedToken);

    expect(decryptToken(enc1)).toEqual(rawToken);
    expect(decryptToken(enc2)).toEqual(rawToken);
  });
});

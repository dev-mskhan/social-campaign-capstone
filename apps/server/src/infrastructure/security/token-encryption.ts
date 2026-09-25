import crypto from 'node:crypto';
import { config } from '../../config/config';

export interface EncryptedPayload {
  encryptedToken: string;
  iv: string;
  authTag: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

function getEncryptionKey(): Buffer {
  const hexKey = config.security.encryptionKey;
  // Derive a stable 32-byte key from whatever value is provided.
  return crypto.createHash('sha256').update(hexKey).digest();
}

/**
 * Encrypts OAuth token material using AES-256-GCM with a random IV.
 *
 * The returned `encryptedToken` is packed as "${authTag}:${ciphertext}" so the
 * auth tag can be recovered on decryption without requiring a separate DB column.
 *
 * NEVER log the returned token or key.
 */
export function encryptToken(plaintextToken: string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = getEncryptionKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plaintextToken, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Pack as "authTag:ciphertext" — both pieces survive a single text column.
  const packedToken = `${authTag}:${ciphertext}`;

  return {
    encryptedToken: packedToken,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts OAuth token material.
 *
 * Supports two formats:
 *   1. Packed  — encryptedToken = "${authTag}:${ciphertext}"  (produced by encryptToken above)
 *   2. Split   — authTag passed separately in payload.authTag (legacy / test usage)
 */
export function decryptToken(payload: { encryptedToken: string; iv: string; authTag?: string }): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, 'hex');

  let authTagHex: string;
  let ciphertextHex: string;

  const colonIdx = payload.encryptedToken.indexOf(':');
  if (colonIdx !== -1) {
    // Packed format
    authTagHex = payload.encryptedToken.slice(0, colonIdx);
    ciphertextHex = payload.encryptedToken.slice(colonIdx + 1);
  } else if (payload.authTag) {
    // Split format (backwards-compat)
    authTagHex = payload.authTag;
    ciphertextHex = payload.encryptedToken;
  } else {
    throw new Error('Cannot decrypt token: authTag is missing from the encryptedToken payload');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

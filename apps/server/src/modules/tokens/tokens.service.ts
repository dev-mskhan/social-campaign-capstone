import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { platformTokens, PlatformTokenRecord } from '../../db/schema/platform-tokens';
import { PlatformId } from '../../domain/platforms/specifications';
import { encryptToken, decryptToken } from '../../infrastructure/security/token-encryption';
import { fakeSocialPlatformServer } from '../../infrastructure/fake-platform/fake-server';
import { logger } from '../../infrastructure/logger';
import { AppError } from '../../shared/errors/app-error';

export class TokensService {
  /**
   * Acquires a new OAuth token from fake platform, encrypts it with AES-256-GCM, and stores it in DB.
   * Packs authTag into encryptedToken as "${authTag}:${ciphertext}" (single column, no extra DDL).
   */
  async acquireAndStoreToken(platform: PlatformId): Promise<PlatformTokenRecord> {
    const oauthRes = await fakeSocialPlatformServer.handleOAuthTokenRequest(platform);

    // Encrypt token material (AES-256-GCM with random IV, authTag packed into encryptedToken)
    const encrypted = encryptToken(oauthRes.access_token);

    const authMetadata = {
      tokenType: oauthRes.token_type,
      expiresIn: oauthRes.expires_in,
      acquiredAt: new Date().toISOString(),
    };

    const existingRecords = await db
      .select()
      .from(platformTokens)
      .where(eq(platformTokens.platform, platform));

    let record: PlatformTokenRecord | undefined;

    if (existingRecords.length > 0) {
      // Overwrite with fresh token (new packed format)
      const updated = await db
        .update(platformTokens)
        .set({
          encryptedToken: encrypted.encryptedToken, // packed: "authTag:ciphertext"
          iv: encrypted.iv,
          authMetadata,
          updatedAt: new Date(),
        })
        .where(eq(platformTokens.platform, platform))
        .returning();
      record = updated[0];
    } else {
      const inserted = await db
        .insert(platformTokens)
        .values({
          platform,
          encryptedToken: encrypted.encryptedToken, // packed: "authTag:ciphertext"
          iv: encrypted.iv,
          authMetadata,
        })
        .returning();
      record = inserted[0];
    }

    if (!record) {
      throw new AppError(`Failed to persist OAuth token for platform '${platform}'`, 500, 'DATABASE_ERROR');
    }

    logger.info({ platform, tokenId: record.id }, 'OAuth token acquired, encrypted, and stored safely in DB');
    return record;
  }

  /**
   * Retrieves and decrypts the access token for a platform.
   * If no token exists or if decryption fails (e.g. stale format from a previous session),
   * re-acquires a fresh token automatically.
   */
  async getDecryptedToken(platform: PlatformId): Promise<string> {
    const records = await db
      .select()
      .from(platformTokens)
      .where(eq(platformTokens.platform, platform));

    let tokenRecord: PlatformTokenRecord | undefined = records[0];

    if (!tokenRecord) {
      tokenRecord = await this.acquireAndStoreToken(platform);
    }

    // Attempt decryption; rotate on failure so stale/invalid tokens never block publishing
    try {
      const plaintext = decryptToken({
        encryptedToken: tokenRecord.encryptedToken,
        iv: tokenRecord.iv,
      });
      return plaintext;
    } catch (decryptErr: any) {
      logger.warn(
        { platform, error: decryptErr.message },
        'Token decryption failed — rotating token by re-acquiring from platform'
      );
      // Re-acquire and overwrite stale row
      const freshRecord = await this.acquireAndStoreToken(platform);
      return decryptToken({
        encryptedToken: freshRecord.encryptedToken,
        iv: freshRecord.iv,
      });
    }
  }
}

export const tokensService = new TokensService();

export type SocialPostStatus = 'queued' | 'publishing' | 'published' | 'failed';

export const SOCIAL_POST_STATUSES: readonly SocialPostStatus[] = [
  'queued',
  'publishing',
  'published',
  'failed',
] as const;

export type CampaignStatus = 'draft' | 'scheduled' | 'publishing' | 'completed' | 'partially_failed' | 'failed';

/**
 * Valid status state-machine transitions for SocialPost lifecycle.
 */
const VALID_POST_TRANSITIONS: Record<SocialPostStatus, readonly SocialPostStatus[]> = {
  queued: ['publishing'],
  publishing: ['published', 'failed'],
  failed: ['queued'], // Allow re-queueing for retry
  published: [], // Terminal success state
};

/**
 * Validates whether a proposed status transition is permitted by domain rules.
 */
export function isValidStatusTransition(
  fromStatus: SocialPostStatus,
  toStatus: SocialPostStatus
): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = VALID_POST_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Asserts that a status transition is valid, throwing an Error if invalid.
 */
export function assertValidStatusTransition(
  fromStatus: SocialPostStatus,
  toStatus: SocialPostStatus
): void {
  if (!isValidStatusTransition(fromStatus, toStatus)) {
    throw new Error(
      `Invalid status transition from '${fromStatus}' to '${toStatus}'. Direct transition is prohibited.`
    );
  }
}

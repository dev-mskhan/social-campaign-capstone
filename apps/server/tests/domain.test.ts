import { describe, it, expect } from 'vitest';
import {
  INSTAGRAM_SPEC,
  X_SPEC,
  PLATFORM_SPECS,
  isValidStatusTransition,
  assertValidStatusTransition,
} from '../src/domain';

describe('Domain Contracts & Platform Specifications', () => {
  it('should define correct specs for Instagram', () => {
    expect(INSTAGRAM_SPEC.id).toBe('instagram');
    expect(INSTAGRAM_SPEC.image.width).toBe(1080);
    expect(INSTAGRAM_SPEC.image.height).toBe(1080);
    expect(INSTAGRAM_SPEC.image.aspectRatio).toBe('1:1');
    expect(INSTAGRAM_SPEC.image.safeZoneMarginPercent).toBe(10);
  });

  it('should define correct specs for X', () => {
    expect(X_SPEC.id).toBe('x');
    expect(X_SPEC.image.width).toBe(1600);
    expect(X_SPEC.image.height).toBe(900);
    expect(X_SPEC.image.aspectRatio).toBe('16:9');
    expect(X_SPEC.image.safeZoneMarginPercent).toBe(10);
  });

  it('should include instagram and x in PLATFORM_SPECS lookup', () => {
    expect(PLATFORM_SPECS.instagram).toBe(INSTAGRAM_SPEC);
    expect(PLATFORM_SPECS.x).toBe(X_SPEC);
  });

  describe('SocialPost Status State Machine Transitions', () => {
    it('should allow valid transitions: queued -> publishing', () => {
      expect(isValidStatusTransition('queued', 'publishing')).toBe(true);
    });

    it('should allow valid transitions: publishing -> published', () => {
      expect(isValidStatusTransition('publishing', 'published')).toBe(true);
    });

    it('should allow valid transitions: publishing -> failed', () => {
      expect(isValidStatusTransition('publishing', 'failed')).toBe(true);
    });

    it('should allow retry transition: failed -> queued', () => {
      expect(isValidStatusTransition('failed', 'queued')).toBe(true);
    });

    it('should reject invalid direct transition: queued -> published', () => {
      expect(isValidStatusTransition('queued', 'published')).toBe(false);
      expect(() => assertValidStatusTransition('queued', 'published')).toThrow(
        /Invalid status transition/
      );
    });

    it('should reject transition from published (terminal state)', () => {
      expect(isValidStatusTransition('published', 'queued')).toBe(false);
      expect(isValidStatusTransition('published', 'publishing')).toBe(false);
      expect(isValidStatusTransition('published', 'failed')).toBe(false);
    });
  });
});

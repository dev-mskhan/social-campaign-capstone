import { describe, it, expect } from 'vitest';
import { FakeInstagramPublisher } from '../src/infrastructure/adapters/fake-instagram-publisher';
import { FakeXPublisher } from '../src/infrastructure/adapters/fake-x-publisher';
import { PublisherRegistry } from '../src/infrastructure/adapters/publisher-registry';

describe('SocialPublisher Adapters & Registry Tests', () => {
  it('should identify platforms correctly', () => {
    const instagramPub = new FakeInstagramPublisher();
    const xPub = new FakeXPublisher();

    expect(instagramPub.getPlatformId()).toBe('instagram');
    expect(xPub.getPlatformId()).toBe('x');
  });

  it('should resolve registered publishers from registry', () => {
    const registry = new PublisherRegistry();
    const insta = registry.getPublisher('instagram');
    const x = registry.getPublisher('x');

    expect(insta.getPlatformId()).toBe('instagram');
    expect(x.getPlatformId()).toBe('x');
  });

  it('should throw AppError for unregistered platform', () => {
    const registry = new PublisherRegistry();
    expect(() => registry.getPublisher('linkedin' as any)).toThrow(/No publishing adapter registered/);
  });
});

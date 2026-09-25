import { PlatformId } from '../../domain/platforms/specifications';
import { SocialPublisher } from '../../domain/publishing/social-publisher.interface';
import { fakeInstagramPublisher } from './fake-instagram-publisher';
import { fakeXPublisher } from './fake-x-publisher';
import { AppError } from '../../shared/errors/app-error';

export class PublisherRegistry {
  private publishers = new Map<PlatformId, SocialPublisher>();

  constructor() {
    this.registerPublisher(fakeInstagramPublisher);
    this.registerPublisher(fakeXPublisher);
  }

  registerPublisher(publisher: SocialPublisher): void {
    this.publishers.set(publisher.getPlatformId(), publisher);
  }

  getPublisher(platform: PlatformId): SocialPublisher {
    const publisher = this.publishers.get(platform);
    if (!publisher) {
      throw new AppError(
        `No publishing adapter registered for platform '${platform}'`,
        400,
        'UNSUPPORTED_PLATFORM'
      );
    }
    return publisher;
  }
}

export const publisherRegistry = new PublisherRegistry();

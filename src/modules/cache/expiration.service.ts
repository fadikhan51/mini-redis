import { CacheStore } from '../../domain/cache/interfaces/cache-store.interface';
import { logger } from '../../config/logger';
import { now } from '../../helpers/time.helper';

export class ExpirationService {
  private intervalId?: NodeJS.Timeout;

  constructor(
    private readonly store: CacheStore,
    private readonly sweepIntervalMs: number
  ) {}

  start() {
    if (this.intervalId) return;
    if (this.sweepIntervalMs <= 0) return;

    this.intervalId = setInterval(() => this.sweep(), this.sweepIntervalMs);
    logger.info({ intervalMs: this.sweepIntervalMs }, 'Expiration sweeper started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Expiration sweeper stopped');
    }
  }

  sweep(): number {
    let expiredCount = 0;
    const currentTime = now();
    const SAMPLE_SIZE = 50;
    
    const iterator = this.store.entries();
    let keysChecked = 0;

    for (const [key, entry] of iterator) {
      if (entry.expiresAt !== null) {
        keysChecked++;
        if (entry.expiresAt <= currentTime) {
          this.store.delete(key);
          expiredCount++;
        }
      }
      if (keysChecked >= SAMPLE_SIZE) break;
    }

    return expiredCount;
  }
}

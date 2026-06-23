import { CacheService } from '../modules/cache/cache.service';
import { logger } from '../config/logger';

export class Heartbeat {
  private intervalId?: NodeJS.Timeout;

  constructor(
    private readonly cacheService: CacheService,
    private readonly intervalMs: number
  ) {}

  start() {
    if (this.intervalId) return;
    if (this.intervalMs <= 0) return;

    this.intervalId = setInterval(() => {
      const stats = this.cacheService.getStats();
      logger.info({ heartbeat: true, stats }, 'Heartbeat');
    }, this.intervalMs);
    
    logger.info({ intervalMs: this.intervalMs }, 'Heartbeat started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Heartbeat stopped');
    }
  }
}

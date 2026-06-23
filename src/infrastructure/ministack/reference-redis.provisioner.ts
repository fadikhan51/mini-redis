import {
  CreateCacheClusterCommand,
  DeleteCacheClusterCommand,
  DescribeCacheClustersCommand
} from '@aws-sdk/client-elasticache';
import { getElastiCacheClient } from './elasticache.client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class ReferenceRedisProvisioner {
  private client = getElastiCacheClient();
  private clusterId = env.MINISTACK_ELASTICACHE_CLUSTER_ID;

  async provision(): Promise<{ host: string; port: number }> {
    logger.info(`Provisioning reference Redis cluster: ${this.clusterId} in MiniStack...`);
    try {
      await this.client.send(
        new CreateCacheClusterCommand({
          CacheClusterId: this.clusterId,
          Engine: 'redis',
          CacheNodeType: 'cache.t3.micro',
          NumCacheNodes: 1,
          Port: env.MINISTACK_ELASTICACHE_BASE_PORT
        })
      );
    } catch (err: any) {
      if (err.name !== 'CacheClusterAlreadyExistsFault') {
        throw err;
      }
      logger.info('Cluster already exists.');
    }

    return this.waitForAvailable();
  }

  async teardown() {
    logger.info(`Tearing down reference Redis cluster: ${this.clusterId}...`);
    try {
      await this.client.send(
        new DeleteCacheClusterCommand({
          CacheClusterId: this.clusterId,
        })
      );
    } catch (err: any) {
      if (err.name !== 'CacheClusterNotFoundFault') {
        logger.error({ err }, 'Error tearing down cluster');
      }
    }
  }

  private async waitForAvailable(): Promise<{ host: string; port: number }> {
    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
      const res = await this.client.send(
        new DescribeCacheClustersCommand({
          CacheClusterId: this.clusterId,
          ShowCacheNodeInfo: true
        })
      );

      const cluster = res.CacheClusters?.[0];
      // In MiniStack, CacheNodes contain the Endpoint
      if (cluster && cluster.CacheClusterStatus === 'available') {
        const node = cluster.CacheNodes?.[0];
        if (node && node.Endpoint) {
           logger.info('Reference Redis is available.');
           return {
             host: node.Endpoint.Address || '127.0.0.1',
             port: node.Endpoint.Port || env.MINISTACK_ELASTICACHE_BASE_PORT,
           };
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('Timeout waiting for reference Redis cluster to become available');
  }
}

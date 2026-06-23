import { ElastiCacheClient } from '@aws-sdk/client-elasticache';
import { env } from '../../config/env';

export const getElastiCacheClient = () => {
  return new ElastiCacheClient({
    region: env.MINISTACK_REGION,
    endpoint: env.MINISTACK_ENDPOINT,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

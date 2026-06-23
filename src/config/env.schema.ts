import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('mini-redis'),
  
  // HTTP
  HTTP_HOST: z.string().default('0.0.0.0'),
  HTTP_PORT: z.coerce.number().default(8080),
  
  // Redis TCP
  REDIS_HOST: z.string().default('0.0.0.0'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  
  // Security
  ADMIN_TOKEN: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  
  // Cache config
  CACHE_MAX_KEYS: z.coerce.number().min(1).default(100000),
  CACHE_MAX_MEMORY_BYTES: z.coerce.number().min(1024).default(134217728), // 128MB
  CACHE_DEFAULT_TTL_MS: z.coerce.number().min(0).default(0), // 0 means no expiry
  CACHE_SWEEP_INTERVAL_MS: z.coerce.number().min(10).default(1000),
  CACHE_EVICTION_POLICY: z.enum(['lru', 'noeviction']).default('lru'),
  
  // Payload Limits
  MAX_KEY_BYTES: z.coerce.number().min(1).default(512),
  MAX_VALUE_BYTES: z.coerce.number().min(1).default(1048576), // 1MB
  MAX_COMMAND_BYTES: z.coerce.number().min(1).default(2097152), // 2MB
  
  // Observability
  HEARTBEAT_INTERVAL_MS: z.coerce.number().min(1000).default(30000),
  
  // MiniStack Integration
  MINISTACK_ENABLED: z.coerce.boolean().default(false),
  MINISTACK_ENDPOINT: z.string().url().default('http://localhost:4566'),
  MINISTACK_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().default('test'),
  AWS_SECRET_ACCESS_KEY: z.string().default('test'),
  MINISTACK_ELASTICACHE_CLUSTER_ID: z.string().default('mini-redis-reference'),
  MINISTACK_ELASTICACHE_BASE_PORT: z.coerce.number().default(16379),
  MINISTACK_ELASTICACHE_CLUSTER_MODE_REAL: z.coerce.boolean().default(false),
  MINISTACK_ELASTICACHE_NUM_NODE_GROUPS: z.coerce.number().default(3),
  MINISTACK_ELASTICACHE_REPLICAS_PER_NODE_GROUP: z.coerce.number().default(0),

  // Cluster Configuration
  CLUSTER_ENABLED: z.coerce.boolean().default(false),
  CLUSTER_NODE_ID: z.string().optional(),
  CLUSTER_SHARD_ID: z.string().optional(),
  CLUSTER_ROLE: z.enum(['master', 'replica']).default('master'),
  CLUSTER_REPLICA_OF: z.string().optional(),
  CLUSTER_ANNOUNCE_HOST: z.string().default('127.0.0.1'),
  CLUSTER_ANNOUNCE_REDIS_PORT: z.coerce.number().default(6379),
  CLUSTER_ANNOUNCE_HTTP_PORT: z.coerce.number().default(8080),
  CLUSTER_INTERNAL_HOST: z.string().default('0.0.0.0'),
  CLUSTER_INTERNAL_PORT: z.coerce.number().default(18080),
  CLUSTER_SEED_NODES: z.string().optional(),
  CLUSTER_CONFIG_FILE: z.string().default('./data/cluster/nodes.json'),
  CLUSTER_SECRET: z.string().default('dev-cluster-secret'),
  CLUSTER_GOSSIP_INTERVAL_MS: z.coerce.number().default(1000),
  CLUSTER_NODE_TIMEOUT_MS: z.coerce.number().default(5000),
  CLUSTER_TOPOLOGY_SYNC_INTERVAL_MS: z.coerce.number().default(2000),
  CLUSTER_REQUIRE_FULL_COVERAGE: z.coerce.boolean().default(true),
  CLUSTER_REPLICATION_ENABLED: z.coerce.boolean().default(false),
  CLUSTER_REPLICAS_PER_MASTER: z.coerce.number().default(0),
  CLUSTER_READONLY_REPLICA_READS: z.coerce.boolean().default(false),
  CLUSTER_MIGRATION_BATCH_SIZE: z.coerce.number().default(100),
  CLUSTER_MIGRATION_TIMEOUT_MS: z.coerce.number().default(30000)
});

export type EnvConfig = z.infer<typeof envSchema>;

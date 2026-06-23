import { z } from 'zod';

export const cacheRestPutSchema = z.object({
  value: z.string(),
  ttlMs: z.coerce.number().min(1).optional(),
});

export type CacheRestPutBody = z.infer<typeof cacheRestPutSchema>;

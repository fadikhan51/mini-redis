import { envSchema, EnvConfig } from './env.schema';
import dotenv from 'dotenv';
import path from 'path';

// Try to load env file based on NODE_ENV if not production
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv !== 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });
  // Fallback to .env if specific one doesn't exist
  dotenv.config();
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env: EnvConfig = parsedEnv.data;

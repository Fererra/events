export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  host: string;
  port: number;
  logLevel: string;
  db: {
    url: string;
    poolMax: number;
    migrateOnStart: boolean;
  };
  auth: {
    accessSecret: string;
    refreshSecret: string;
    /** 15 minutes by default (LR2 §5). */
    accessTtlSeconds: number;
    /** 7 days by default (LR2 §5). */
    refreshTtlSeconds: number;
    /** Bootstrap administrator, created on start if both are set. */
    adminEmail: string | undefined;
    adminPassword: string | undefined;
  };
  scheduler: {
    /** Background jobs (node-cron). Off in tests, on elsewhere unless SCHEDULER_ENABLED=false. */
    enabled: boolean;
  };
}

function readSecret(env: NodeJS.ProcessEnv, name: string, nodeEnv: string): string {
  const value = env[name];
  if (value) {
    if (nodeEnv === 'production' && value.length < 32) {
      throw new Error(`Env ${name} must be at least 32 characters in production`);
    }
    return value;
  }
  if (nodeEnv === 'production') throw new Error(`Env ${name} is required in production`);
  return `insecure-dev-${name.toLowerCase()}-do-not-use-in-production`;
}

function readInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`Env ${name} must be an integer, got "${raw}"`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = (env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];
  return {
    nodeEnv,
    host: env.HOST ?? '0.0.0.0',
    port: readInt(env, 'PORT', 3000),
    logLevel: env.LOG_LEVEL ?? (nodeEnv === 'test' ? 'silent' : 'info'),
    db: {
      url: env.DATABASE_URL ?? 'postgres://events:events@localhost:5432/events',
      poolMax: readInt(env, 'DB_POOL_MAX', 10),
      migrateOnStart: env.DB_MIGRATE_ON_START !== 'false',
    },
    auth: {
      accessSecret: readSecret(env, 'JWT_ACCESS_SECRET', nodeEnv),
      refreshSecret: readSecret(env, 'JWT_REFRESH_SECRET', nodeEnv),
      accessTtlSeconds: readInt(env, 'JWT_ACCESS_TTL_SECONDS', 15 * 60),
      refreshTtlSeconds: readInt(env, 'JWT_REFRESH_TTL_SECONDS', 7 * 24 * 60 * 60),
      adminEmail: env.ADMIN_EMAIL || undefined,
      adminPassword: env.ADMIN_PASSWORD || undefined,
    },
    scheduler: {
      enabled: (env.SCHEDULER_ENABLED ?? (nodeEnv === 'test' ? 'false' : 'true')) !== 'false',
    },
  };
}

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
  };
}

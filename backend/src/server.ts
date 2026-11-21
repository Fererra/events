import { buildApp } from './app.js';
import { loadConfig } from './shared/config/env.js';
import { connectPostgres, runMigrations } from './shared/infrastructure/db/postgres.js';

const config = loadConfig();
const postgres = connectPostgres(config.db.url, config.db.poolMax);

if (config.db.migrateOnStart) {
  await runMigrations(postgres.db);
}

const app = await buildApp({ config, database: postgres.db });
app.addHook('onClose', () => postgres.close());

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

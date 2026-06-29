import { Pool, type PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __qaCopilotPgPool: Pool | undefined;
}

function shouldUseSsl(connectionString?: string) {
  if (!connectionString) return false;

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');
    const hostname = url.hostname;

    if (sslMode === 'disable') return false;
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch {
    return false;
  }
}

const connectionString = process.env.DATABASE_URL;
const poolConfig: PoolConfig = {
  connectionString,
  ...(shouldUseSsl(connectionString) ? { ssl: { rejectUnauthorized: false } } : {}),
};

export const dbPool = globalThis.__qaCopilotPgPool ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  globalThis.__qaCopilotPgPool = dbPool;
}

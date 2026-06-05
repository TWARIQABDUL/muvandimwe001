import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root, overriding any host system exports (LOCAL ONLY)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  dotenv.config({ 
    path: path.resolve(__dirname, '../../../.env'),
    override: true 
  });
}

const { Pool } = pg;
let pool = null;

// Helper to convert SQLite '?' to Postgres '$1, $2, etc.'
function convertSql(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export async function initializeDatabase() {
  if (pool) {
    console.log('✓ Using existing database pool');
    return pool;
  }
  try {
    console.log('Connecting to:', process.env.DATABASE_URL);
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false,
      max: isProd ? 1 : 3, // Limit connections to prevent exhausting Aiven slots
      idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
    });

    // Test connection
    const client = await pool.connect();
    client.release();
    console.log('✓ Database connected (PostgreSQL)');

    return pool;
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  }
}

export function getDatabase() {
  return {
    get: async (sql, params = []) => {
      if (!pool) throw new Error('Database query executed before connection was established.');
      const pgSql = convertSql(sql);
      const res = await pool.query(pgSql, params);
      return res.rows[0];
    },
    run: async (sql, params = []) => {
      if (!pool) throw new Error('Database query executed before connection was established.');
      const pgSql = convertSql(sql);
      const res = await pool.query(pgSql, params);
      return { changes: res.rowCount };
    },
    all: async (sql, params = []) => {
      if (!pool) throw new Error('Database query executed before connection was established.');
      const pgSql = convertSql(sql);
      const res = await pool.query(pgSql, params);
      return res.rows;
    },
    exec: async (sql) => {
      if (!pool) throw new Error('Database query executed before connection was established.');
      const res = await pool.query(sql);
      return res;
    }
  };
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}
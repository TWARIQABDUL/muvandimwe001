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
  try {
    console.log('Connecting to:', process.env.DATABASE_URL);
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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
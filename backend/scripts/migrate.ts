import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ 
    path: path.resolve(__dirname, '../../.env'),
    override: true
});

const migrationsDir = path.resolve(__dirname, '../migrations');

async function migrate() {
    const dbUrl = process.env.DATABASE_URL?.split('?')[0];
    const isRemote = dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

    const client = new Client({
        connectionString: dbUrl,
        ...(isRemote && { ssl: { rejectUnauthorized: false } })
    });

    try {
        await client.connect();
        console.log('Connected to database for migrations.');

        // Initialize migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            const { rowCount } = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [file]);
            
            if (rowCount === 0) {
                console.log(`Running migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                
                await client.query('BEGIN');
                try {
                    await client.query(sql);
                    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
                    await client.query('COMMIT');
                    console.log(`✓ Completed ${file}`);
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                }
            } else {
                console.log(`Skipping ${file} (already applied)`);
            }
        }

        console.log('All migrations completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();

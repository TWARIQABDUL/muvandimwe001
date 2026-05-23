import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const dbPath = path.join(__dirname, '../db/gym.db');
  console.log('Opening DB:', dbPath);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON');

  const gyms = await db.all('SELECT * FROM gyms');
  console.log('Gyms in DB:', gyms);

  const users = await db.all('SELECT * FROM users');
  console.log('Users in DB:', users);

  try {
    const gym_id = gyms[0]?.id;
    console.log('Trying to insert service with gym_id:', gym_id);
    const res = await db.run(
      `INSERT INTO services (id, gym_id, name, price_daily, price_monthly)
       VALUES (?, ?, ?, ?, ?)`,
      ['test-id-12345', gym_id, 'gym-test', 3000, 5000]
    );
    console.log('Insert success!', res);
  } catch (err) {
    console.error('Insert failed with error:', err);
  }

  await db.close();
}

test();

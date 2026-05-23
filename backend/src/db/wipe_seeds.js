import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function wipeSeeds() {
  const dbPath = path.join(__dirname, 'gym.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const memberNames = [
    'Alice', 'Bob', 'Charlie', 'David', 'Emma',
    'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
    'Karen', 'Leo', 'Maria', 'Noah', 'Olivia',
    'John', 'Sarah', 'Mike', 'Lisa', 'Tom'
  ];

  console.log('Wiping seeded data...');

  for (const name of memberNames) {
    // get member
    const member = await db.get('SELECT id FROM members WHERE name = ?', [name]);
    if (member) {
      await db.run('DELETE FROM member_subscriptions WHERE member_id = ?', [member.id]);
      await db.run('DELETE FROM members WHERE id = ?', [member.id]);
    }
    await db.run('DELETE FROM checkins WHERE member_name = ?', [name]);
  }

  console.log('Seeded data wiped successfully!');
  await db.close();
}

wipeSeeds().catch(console.error);

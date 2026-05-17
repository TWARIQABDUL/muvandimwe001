import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export async function initializeDatabase() {
  try {
    const dbPath = path.join(__dirname, 'gym.db');
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    // Read and execute schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.exec(schema);

    console.log('✓ Database schema initialized');

    // Check if data already exists
    const gymCount = await db.get('SELECT COUNT(*) as count FROM gyms');
    
    if (gymCount.count === 0) {
      await seedDatabase();
      console.log('✓ Demo data seeded');
    } else {
      console.log('✓ Database already contains data, skipping seed');
    }

    return db;
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  }
}

async function seedDatabase() {
  try {
    // 1. Create Demo Gym
    const gymId = uuidv4();
    const ownerEmail = 'owner@demo.com';
    const managerEmail = 'manager@demo.com';

    await db.run(
      `INSERT INTO gyms (id, name, location, country, owner_email, manager_email)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [gymId, 'Demo Gym', 'Kigali', 'Rwanda', ownerEmail, managerEmail]
    );
    console.log(`  Created gym: Demo Gym (${gymId})`);

    // 2. Create Users (Manager + Owner)
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const managerId = uuidv4();
    const ownerId = uuidv4();

    await db.run(
      `INSERT INTO users (id, gym_id, email, password_hash, role, first_login)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [managerId, gymId, managerEmail, hashedPassword, 'manager', 1]
    );

    await db.run(
      `INSERT INTO users (id, gym_id, email, password_hash, role, first_login)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownerId, gymId, ownerEmail, hashedPassword, 'owner', 1]
    );
    console.log(`  Created users: ${managerEmail}, ${ownerEmail}`);

    // 3. Create Services
    const services = [
      { name: 'gym', price: 15000 },
      { name: 'sauna', price: 10000 },
      { name: 'pool', price: 12000 }
    ];

    const serviceIds = {};
    for (const service of services) {
      const serviceId = uuidv4();
      serviceIds[service.name] = serviceId;
      await db.run(
        `INSERT INTO services (id, gym_id, name, price_daily)
         VALUES (?, ?, ?, ?)`,
        [serviceId, gymId, service.name, service.price]
      );
    }
    console.log(`  Created services: gym, sauna, pool`);

    // 4. Create Subscription Tiers
    const subscriptions = [
      { name: '40k Gym Only', fee: 40000, services: 'gym' },
      { name: '70k Gym+Sauna', fee: 70000, services: 'gym,sauna' },
      { name: '100k All Access', fee: 100000, services: 'gym,sauna,pool' }
    ];

    const subscriptionIds = {};
    for (const sub of subscriptions) {
      const subId = uuidv4();
      subscriptionIds[sub.name] = subId;
      await db.run(
        `INSERT INTO subscriptions (id, gym_id, name, monthly_fee, included_services)
         VALUES (?, ?, ?, ?, ?)`,
        [subId, gymId, sub.name, sub.fee, sub.services]
      );
    }
    console.log(`  Created subscriptions: 40k Gym Only, 70k Gym+Sauna, 100k All Access`);

    // 5. Create Demo Members
    const memberNames = [
      'Alice', 'Bob', 'Charlie', 'David', 'Emma',
      'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
      'Karen', 'Leo', 'Maria', 'Noah', 'Olivia'
    ];

    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (let i = 0; i < memberNames.length; i++) {
      const memberId = uuidv4();
      const qrCodeId = uuidv4();
      const name = memberNames[i];
      const email = `${name.toLowerCase()}@example.com`;

      // Assign subscription tier (rotate through tiers)
      const tierIndex = i % 3;
      const tierNames = ['40k Gym Only', '70k Gym+Sauna', '100k All Access'];
      const tierName = tierNames[tierIndex];
      const subscriptionId = subscriptionIds[tierName];

      // Insert member
      await db.run(
        `INSERT INTO members (id, gym_id, name, email, phone, qr_code_id, type, current_subscription_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [memberId, gymId, name, email, '+250' + Math.random().toString().slice(2, 11), qrCodeId, 'subscription', null]
      );

      // Create member subscription
      const memberSubId = uuidv4();
      await db.run(
        `INSERT INTO member_subscriptions (id, gym_id, member_id, subscription_id, start_date, next_renewal_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [memberSubId, gymId, memberId, subscriptionId, today, nextMonth, 'active']
      );

      // Update member with current subscription
      await db.run(
        `UPDATE members SET current_subscription_id = ? WHERE id = ?`,
        [memberSubId, memberId]
      );
    }
    console.log(`  Created 15 demo members with active subscriptions`);

    // 6. Create Sample Check-ins for Today
    const checkInData = [
      { name: 'Alice', service: 'gym', type: 'subscription', amount: null },
      { name: 'Bob', service: 'gym', type: 'subscription', amount: null },
      { name: 'Walk-in: John', service: 'gym', type: 'walk_in', amount: 15000 },
      { name: 'Charlie', service: 'sauna', type: 'subscription', amount: null },
      { name: 'Walk-in: Sarah', service: 'pool', type: 'walk_in', amount: 12000 },
      { name: 'David', service: 'gym', type: 'subscription', amount: null },
      { name: 'Emma', service: 'gym', type: 'subscription', amount: null },
      { name: 'Walk-in: Mike', service: 'gym', type: 'walk_in', amount: 15000 },
      { name: 'Frank', service: 'sauna', type: 'subscription', amount: null },
      { name: 'Grace', service: 'gym', type: 'subscription', amount: null },
      { name: 'Walk-in: Lisa', service: 'sauna', type: 'walk_in', amount: 10000 },
      { name: 'Henry', service: 'pool', type: 'subscription', amount: null },
      { name: 'Walk-in: Tom', service: 'pool', type: 'walk_in', amount: 12000 },
      { name: 'Ivy', service: 'gym', type: 'subscription', amount: null },
      { name: 'Jack', service: 'gym', type: 'subscription', amount: null },
    ];

    for (const checkIn of checkInData) {
      const checkInId = uuidv4();
      const memberId = checkIn.name.startsWith('Walk-in:') 
        ? null 
        : (await db.get(`SELECT id FROM members WHERE gym_id = ? AND name = ?`, [gymId, checkIn.name]))?.id;

      const timestamp = new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString();

      await db.run(
        `INSERT INTO checkins (id, gym_id, member_id, member_name, type, service, amount, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [checkInId, gymId, memberId, checkIn.name, checkIn.type, checkIn.service, checkIn.amount, timestamp]
      );
    }
    console.log(`  Created 15 sample check-ins for today`);

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    throw err;
  }
}

export function getDatabase() {
  // Returns a lazy-evaluation wrapper object instead of throwing an error immediately
  return {
    get: (...args) => {
      if (!db) throw new Error('Database query executed before connection was established.');
      return db.get(...args);
    },
    run: (...args) => {
      if (!db) throw new Error('Database query executed before connection was established.');
      return db.run(...args);
    },
    all: (...args) => {
      if (!db) throw new Error('Database query executed before connection was established.');
      return db.all(...args);
    },
    exec: (...args) => {
      if (!db) throw new Error('Database query executed before connection was established.');
      return db.exec(...args);
    }
  };
}

export async function closeDatabase() {
  if (db) {
    await db.close();
  }
}
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ 
    path: path.resolve(__dirname, '../../.env'),
    override: true
});

async function seed() {
    console.log('Starting database seeding...');
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });
    
    try {
        await client.connect();
        
        // Check if gym already exists
        const { rows } = await client.query('SELECT id FROM gyms LIMIT 1');
        if (rows.length > 0) {
            console.log('Database already contains data, skipping seed.');
            return;
        }

        console.log('Seeding demo data...');

        // 1. Create Demo Gym
        const gymId = uuidv4();
        const ownerEmail = 'owner@demo.com';
        const managerEmail = 'manager@demo.com';

        await client.query(
            `INSERT INTO gyms (id, name, location, country, owner_email, manager_email)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [gymId, 'Demo Gym', 'Kigali', 'Rwanda', ownerEmail, managerEmail]
        );
        console.log(`✓ Created gym: Demo Gym (${gymId})`);

        // 2. Create Users (Manager + Owner)
        const hashedPassword = await bcrypt.hash('demo123', 10);
        
        const managerId = uuidv4();
        const ownerId = uuidv4();

        await client.query(
            `INSERT INTO users (id, gym_id, email, password_hash, role, first_login)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [managerId, gymId, managerEmail, hashedPassword, 'manager', 1]
        );

        await client.query(
            `INSERT INTO users (id, gym_id, email, password_hash, role, first_login)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ownerId, gymId, ownerEmail, hashedPassword, 'owner', 1]
        );
        console.log(`✓ Created users: ${managerEmail}, ${ownerEmail}`);

        // 3. Create Services
        const services = [
            { name: 'gym', price_daily: 15000, price_monthly: 40000 },
            { name: 'sauna', price_daily: 10000, price_monthly: 30000 },
            { name: 'pool', price_daily: 12000, price_monthly: 30000 }
        ];

        const serviceIds: Record<string, string> = {};
        for (const service of services) {
            const serviceId = uuidv4();
            serviceIds[service.name] = serviceId;
            await client.query(
                `INSERT INTO services (id, gym_id, name, price_daily, price_monthly)
                 VALUES ($1, $2, $3, $4, $5)`,
                [serviceId, gymId, service.name, service.price_daily, service.price_monthly]
            );
        }
        console.log(`✓ Created services: gym, sauna, pool`);

        // 4. Create Subscription Tiers
        const subscriptions = [
            { name: '40k Gym Only', fee: 40000, services: 'gym' },
            { name: '70k Gym+Sauna', fee: 70000, services: 'gym,sauna' },
            { name: '100k All Access', fee: 100000, services: 'gym,sauna,pool' }
        ];

        const subscriptionIds: Record<string, string> = {};
        for (const sub of subscriptions) {
            const subId = uuidv4();
            subscriptionIds[sub.name] = subId;
            await client.query(
                `INSERT INTO subscriptions (id, gym_id, name, monthly_fee, included_services)
                 VALUES ($1, $2, $3, $4, $5)`,
                [subId, gymId, sub.name, sub.fee, sub.services]
            );
        }
        console.log(`✓ Created subscriptions`);

        // 5. Create Demo Coupons
        const demoCoupons = [
            { code: '10OFF', percent: 10 },
            { code: '15OFF', percent: 15 },
            { code: '20OFF', percent: 20 }
        ];
        for (const cp of demoCoupons) {
            await client.query(
                `INSERT INTO coupons (id, gym_id, code, discount_percent, active)
                 VALUES ($1, $2, $3, $4, $5)`,
                [uuidv4(), gymId, cp.code, cp.percent, 1]
            );
        }
        console.log(`✓ Created demo coupons`);
        
        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seed();

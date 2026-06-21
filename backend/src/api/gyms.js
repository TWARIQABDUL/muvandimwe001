import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';

const router = express.Router();
const db = getDatabase();

// GET /api/gyms - Get all gyms (Owner only)
router.get('/', authMiddleware, roleMiddleware(['owner']), async (req, res) => {
  try {
    const gyms = await db.all(`SELECT id, name, location, country, manager_email, scan_enabled, created_at FROM gyms ORDER BY created_at ASC`);
    res.json({ gyms });
  } catch (err) {
    console.error('Fetch gyms error:', err.message);
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

// POST /api/gyms - Create new gym branch (Owner only)
router.post('/', authMiddleware, roleMiddleware(['owner']), async (req, res) => {
  try {
    const { name, location, country, manager_username, manager_password } = req.body;

    if (!name || !manager_username || !manager_password) {
      return res.status(400).json({ error: 'Name, manager username, and password are required' });
    }

    // Check if manager username already exists across all users
    const existingUser = await db.get(`SELECT id FROM users WHERE username = ?`, [manager_username]);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this username already exists' });
    }

    const gymId = uuidv4();
    const managerId = uuidv4();
    
    // Use the owner's email from their first gym (we assume the owner's identity is tied to their first gym for now)
    const ownerGym = await db.get(`SELECT owner_email FROM gyms WHERE id = ?`, [req.user.gym_id]);
    const ownerEmail = ownerGym ? ownerGym.owner_email : req.user.username;

    // 1. Create the new gym
    await db.run(
      `INSERT INTO gyms (id, name, location, country, owner_email, manager_email) VALUES (?, ?, ?, ?, ?, ?)`,
      [gymId, name, location || '', country || '', ownerEmail, manager_username]
    );

    // 2. Create the manager user for this gym
    const passwordHash = await hashPassword(manager_password);
    await db.run(
      `INSERT INTO users (id, gym_id, username, password_hash, role, first_login) VALUES (?, ?, ?, ?, 'manager', 1)`,
      [managerId, gymId, manager_username, passwordHash]
    );

    // 3. Seed default services
    const services = [
        { name: 'gym', price_daily: 15000, price_monthly: 40000 },
        { name: 'sauna', price_daily: 10000, price_monthly: 30000 },
        { name: 'pool', price_daily: 12000, price_monthly: 30000 }
    ];
    for (const service of services) {
        await db.run(
            `INSERT INTO services (id, gym_id, name, price_daily, price_monthly) VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), gymId, service.name, service.price_daily, service.price_monthly]
        );
    }

    // 4. Seed default subscriptions
    const subscriptions = [
        { name: '40k Gym Only', fee: 40000, services: 'gym' },
        { name: '70k Gym+Sauna', fee: 70000, services: 'gym,sauna' },
        { name: '100k All Access', fee: 100000, services: 'gym,sauna,pool' }
    ];
    for (const sub of subscriptions) {
        await db.run(
            `INSERT INTO subscriptions (id, gym_id, name, monthly_fee, included_services) VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), gymId, sub.name, sub.fee, sub.services]
        );
    }

    res.status(201).json({ message: 'Gym branch created successfully', gym: { id: gymId, name, manager_username } });
  } catch (err) {
    console.error('Create gym error:', err.message);
    res.status(500).json({ error: 'Failed to create gym branch' });
  }
});

// PATCH /api/gyms/:id/settings - Update gym settings (Owner only)
router.patch('/:id/settings', authMiddleware, roleMiddleware(['owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { scan_enabled } = req.body;

    if (scan_enabled === undefined) {
      return res.status(400).json({ error: 'scan_enabled is required' });
    }

    const value = scan_enabled ? 1 : 0;
    
    const result = await db.run(`UPDATE gyms SET scan_enabled = ? WHERE id = ?`, [value, id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    res.json({ message: 'Settings updated successfully', scan_enabled: value });
  } catch (err) {
    console.error('Update gym settings error:', err.message);
    res.status(500).json({ error: 'Failed to update gym settings' });
  }
});

export default router;

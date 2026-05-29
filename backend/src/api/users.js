import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { hashPassword } from '../utils/password.js';
import { authMiddleware, gymIsolationMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

const db = {
  get: (...args) => getDatabase().get(...args),
  run: (...args) => getDatabase().run(...args),
  all: (...args) => getDatabase().all(...args)
};

// GET /api/users (Owners only)
router.get('/', authMiddleware, roleMiddleware(['owner']), gymIsolationMiddleware, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const users = await db.all(
      `SELECT id, email, role, created_at FROM users WHERE gym_id = ? ORDER BY created_at DESC`,
      [gymId]
    );
    res.json({ users });
  } catch (err) {
    console.error('Fetch users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users (Owners only)
router.post('/', authMiddleware, roleMiddleware(['owner']), gymIsolationMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const gymId = req.user.gym_id;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const existingUser = await db.get(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Generate random password
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await hashPassword(temporaryPassword);
    const userId = uuidv4();

    await db.run(
      `INSERT INTO users (id, gym_id, email, password_hash, role, first_login) VALUES (?, ?, ?, ?, ?, 1)`,
      [userId, gymId, email, passwordHash, 'manager']
    );

    res.status(201).json({ 
      message: 'Employee registered successfully', 
      user: { id: userId, email, role: 'manager' },
      temporaryPassword // Only return it once here so the owner can give it to the employee
    });
  } catch (err) {
    console.error('Register employee error:', err.message);
    res.status(500).json({ error: 'Failed to register employee' });
  }
});

// DELETE /api/users/:id (Owners only)
router.delete('/:id', authMiddleware, roleMiddleware(['owner']), gymIsolationMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const gymId = req.user.gym_id;

    if (userId === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete yourself' });
    }

    const result = await db.run(
      `DELETE FROM users WHERE id = ? AND gym_id = ?`,
      [userId, gymId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Delete employee error:', err.message);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router;

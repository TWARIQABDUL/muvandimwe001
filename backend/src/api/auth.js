import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// This dynamically fetches the initialized database instance only when an endpoint is called!
const db = {
  get: (...args) => getDatabase().get(...args),
  run: (...args) => getDatabase().run(...args),
  all: (...args) => getDatabase().all(...args),
  exec: (...args) => getDatabase().exec(...args)
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await db.get(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    const gymInfo = await db.get(`SELECT scan_enabled FROM gyms WHERE id = ?`, [user.gym_id]);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        gym_id: user.gym_id,
        first_login: user.first_login,
        scan_enabled: gymInfo ? gymInfo.scan_enabled : 1
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // JWT is stateless, logout is client-side (delete token)
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', authMiddleware, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.user.id;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current user
    const user = await db.get(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const oldPasswordMatch = await comparePassword(old_password, user.password_hash);
    if (!oldPasswordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password and first_login flag
    await db.run(
      `UPDATE users SET password_hash = ?, first_login = 0 WHERE id = ?`,
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password updated successfully', first_login: 0 });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;

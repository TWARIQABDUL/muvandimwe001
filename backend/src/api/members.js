import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// POST /api/members - Register new member (manager only)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { name, email, phone, subscription_id } = req.body;
      const { gym_id } = req.user;

      if (!name || !subscription_id) {
        return res.status(400).json({ error: 'Name and subscription_id required' });
      }

      // Check if email already exists
      if (email) {
        const existing = await db.get(
          `SELECT id FROM members WHERE gym_id = ? AND email = ?`,
          [gym_id, email]
        );
        if (existing) {
          return res.status(409).json({ error: 'Email already registered' });
        }
      }

      const memberId = uuidv4();
      const qrCodeId = uuidv4();
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Insert member
      await db.run(
        `INSERT INTO members (id, gym_id, name, email, phone, qr_code_id, type, current_subscription_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [memberId, gym_id, name, email || null, phone || null, qrCodeId, 'subscription', null]
      );

      // Create initial subscription
      const memberSubId = uuidv4();
      await db.run(
        `INSERT INTO member_subscriptions (id, gym_id, member_id, subscription_id, start_date, next_renewal_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [memberSubId, gym_id, memberId, subscription_id, today, nextMonth, 'active']
      );

      // Update member with current subscription
      await db.run(
        `UPDATE members SET current_subscription_id = ? WHERE id = ?`,
        [memberSubId, memberId]
      );

      // Get subscription details
      const subscription = await db.get(
        `SELECT name FROM subscriptions WHERE id = ?`,
        [subscription_id]
      );

      res.status(201).json({
        id: memberId,
        name,
        email,
        phone,
        qr_code_id: qrCodeId,
        subscription: {
          name: subscription.name,
          next_renewal_date: nextMonth
        }
      });
    } catch (err) {
      console.error('Register member error:', err.message);
      res.status(500).json({ error: 'Failed to register member' });
    }
  }
);

// GET /api/members/search - Search members (manager only)
router.get(
  '/search',
  authMiddleware,
  roleMiddleware(['manager']),
  async (req, res) => {
    try {
      const { q } = req.query;
      const { gym_id } = req.user;

      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const members = await db.all(
        `SELECT m.id, m.name, m.type, ms.status, ms.next_renewal_date
         FROM members m
         LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
         WHERE m.gym_id = ? AND m.name LIKE ?
         LIMIT 20`,
        [gym_id, `%${q}%`]
      );

      res.json({ members });
    } catch (err) {
      console.error('Search members error:', err.message);
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

// POST /api/scan-qr - Scan member QR code (manager only)
// TODO: Replace UUID input with actual QR scanner from teammate
router.post(
  '/scan-qr',
  authMiddleware,
  roleMiddleware(['manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { qr_code_id } = req.body;
      const { gym_id } = req.user;

      if (!qr_code_id) {
        return res.status(400).json({ error: 'QR code ID required' });
      }

      const member = await db.get(
        `SELECT m.*, ms.status, s.included_services
         FROM members m
         LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
         LEFT JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE m.gym_id = ? AND m.qr_code_id = ?`,
        [gym_id, qr_code_id]
      );

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Parse included services
      const allowedServices = member.included_services
        ? member.included_services.split(',')
        : [];

      res.json({
        member: {
          id: member.id,
          name: member.name,
          type: member.type,
          subscription_status: member.status,
          allowed_services: allowedServices
        }
      });
    } catch (err) {
      console.error('Scan QR error:', err.message);
      res.status(500).json({ error: 'QR scan failed' });
    }
  }
);

export default router;

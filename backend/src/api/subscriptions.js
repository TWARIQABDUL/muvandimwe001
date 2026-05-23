import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// GET /api/members/subscriptions - List subscription tiers (manager only)
router.get(
  '/subscriptions',
  authMiddleware,
  roleMiddleware(['manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const subscriptions = await db.all(
        `SELECT id, name, monthly_fee, included_services
         FROM subscriptions
         WHERE gym_id = ?
         ORDER BY monthly_fee ASC`,
        [gym_id]
      );

      res.json({ subscriptions });
    } catch (err) {
      console.error('Get subscriptions error:', err.message);
      res.status(500).json({ error: 'Failed to load subscriptions' });
    }
  }
);

// POST /api/members/:id/subscriptions/renew - Renew subscription (manager only)
router.post(
  '/:id/subscriptions/renew',
  authMiddleware,
  roleMiddleware(['manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const memberId = req.params.id;
      const { gym_id } = req.user;

      // Get current subscription
      const member = await db.get(
        `SELECT m.id, m.name, ms.id as sub_id, ms.next_renewal_date, s.name as sub_name, s.monthly_fee, s.included_services
         FROM members m
         LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
         LEFT JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE m.id = ? AND m.gym_id = ?`,
        [memberId, gym_id]
      );

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (!member.sub_id) {
        return res.status(400).json({ error: 'Member has no active subscription' });
      }

      // Calculate new renewal date (30 days from next_renewal_date)
      const currentRenewalDate = new Date(member.next_renewal_date);
      const newRenewalDate = new Date(currentRenewalDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const newRenewalDateStr = newRenewalDate.toISOString().split('T')[0];

      // Update subscription
      await db.run(
        `UPDATE member_subscriptions 
         SET next_renewal_date = ?, status = 'active'
         WHERE id = ?`,
        [newRenewalDateStr, member.sub_id]
      );

      // Log subscription renewal payment
      const paymentId = uuidv4();
      await db.run(
        `INSERT INTO payments (id, gym_id, member_id, amount, type, service, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          gym_id,
          memberId,
          member.monthly_fee || 0,
          'subscription_renewal',
          member.included_services || 'gym',
          new Date().toISOString()
        ]
      );

      res.json({
        message: 'Subscription renewed successfully',
        member: {
          name: member.name,
          subscription: member.sub_name,
          next_renewal_date: newRenewalDateStr
        }
      });
    } catch (err) {
      console.error('Renew subscription error:', err.message);
      res.status(500).json({ error: 'Failed to renew subscription' });
    }
  }
);

// PATCH /api/members/:id/subscriptions - Update subscription status (manager only)
router.patch(
  '/:id/subscriptions',
  authMiddleware,
  roleMiddleware(['manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const memberId = req.params.id;
      const { status } = req.body;
      const { gym_id } = req.user;

      // Only allow 'active' or 'expired' for now
      if (!['active', 'expired'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'active' or 'expired'" });
      }

      const member = await db.get(
        `SELECT m.id, m.name, ms.id as sub_id
         FROM members m
         LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
         WHERE m.id = ? AND m.gym_id = ?`,
        [memberId, gym_id]
      );

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (!member.sub_id) {
        return res.status(400).json({ error: 'Member has no active subscription' });
      }

      // Update status
      await db.run(
        `UPDATE member_subscriptions SET status = ? WHERE id = ?`,
        [status, member.sub_id]
      );

      res.json({
        message: `Subscription status updated to ${status}`,
        member: {
          name: member.name,
          status
        }
      });
    } catch (err) {
      console.error('Update subscription error:', err.message);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  }
);

// GET /api/members/:id/subscriptions/pending - Get pending renewals (helper for manager)
export async function getPendingRenewals(gymId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    return await db.all(
      `SELECT m.id, m.name, s.name as subscription, ms.next_renewal_date
       FROM members m
       JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
       JOIN subscriptions s ON ms.subscription_id = s.id
       WHERE m.gym_id = ? AND ms.status = 'active' AND DATE(ms.next_renewal_date) <= ?
       ORDER BY ms.next_renewal_date ASC`,
      [gymId, today]
    );
  } catch (err) {
    console.error('Get pending renewals error:', err.message);
    throw err;
  }
}

export default router;

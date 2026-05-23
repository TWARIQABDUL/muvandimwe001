import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// POST /api/checkins - Create check-in (subscription or walk-in, manager only)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { member_id, member_name, type, service, amount } = req.body;
      const { gym_id } = req.user;

      if (!type || !service) {
        return res.status(400).json({ error: 'Type and service required' });
      }

      // For walk-in check-ins, member_name is required
      if (type === 'walk_in' && !member_name) {
        return res.status(400).json({ error: 'member_name required for walk-in check-in' });
      }

      const checkInId = uuidv4();
      const now = new Date().toISOString();

      // Get member name and check subscription details
      let finalMemberName = member_name;
      if (member_id) {
        const member = await db.get(
          `SELECT m.name, ms.id as sub_id, ms.is_card, ms.remaining_taps, ms.next_renewal_date
           FROM members m 
           LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
           WHERE m.id = ? AND m.gym_id = ?`,
          [member_id, gym_id]
        );
        if (!member) {
          return res.status(404).json({ error: 'Member not found' });
        }
        finalMemberName = member.name;

        // Validation for subscription type check-ins
        if (type === 'subscription') {
          if (!member.sub_id) {
            return res.status(400).json({ error: 'Member has no active subscription' });
          }

          if (member.is_card) {
            if (member.remaining_taps <= 0) {
              return res.status(400).json({ error: 'No taps remaining on card. Please renew.' });
            }
            
            // Decrement remaining taps
            const nextTaps = member.remaining_taps - 1;
            const status = nextTaps === 0 ? 'expired' : 'active';
            await db.run(
              `UPDATE member_subscriptions SET remaining_taps = ?, status = ? WHERE id = ?`,
              [nextTaps, status, member.sub_id]
            );
          } else {
            // Standard time-bound subscription expiry check
            const todayStr = new Date().toISOString().split('T')[0];
            if (member.next_renewal_date < todayStr) {
              return res.status(400).json({ error: 'Subscription has expired. Please renew.' });
            }
          }

          // **New Restriction**: Subscriber can only check in once a day
          const today = new Date().toISOString().split('T')[0];
          const existingCheckin = await db.get(
            `SELECT id FROM checkins WHERE member_id = ? AND DATE(timestamp) = ?`,
            [member_id, today]
          );
          if (existingCheckin) {
            return res.status(400).json({ error: 'Member has already checked in today.' });
          }
        }
      }

      // Insert check-in
      await db.run(
        `INSERT INTO checkins (id, gym_id, member_id, member_name, type, service, amount, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [checkInId, gym_id, member_id || null, finalMemberName, type, service, amount || null, now]
      );

      // Log payment transaction if it's cash walk-in or daily pass
      if (type === 'walk_in' || type === 'daily') {
        const paymentId = uuidv4();
        await db.run(
          `INSERT INTO payments (id, gym_id, member_id, amount, type, service, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [paymentId, gym_id, member_id || null, amount || 0, type, service, now]
        );
      }

      // Format timestamp for response
      const checkInTime = new Date(now);
      const timeString = checkInTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      res.status(201).json({
        checkin: {
          id: checkInId,
          member_name: finalMemberName,
          service,
          timestamp: timeString,
          type
        }
      });
    } catch (err) {
      console.error('Create check-in error:', err.message);
      res.status(500).json({ error: 'Failed to create check-in' });
    }
  }
);

// GET /api/checkins/today - Get today's check-ins (manager view only)
router.get(
  '/today',
  authMiddleware,
  roleMiddleware(['manager']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const today = new Date().toISOString().split('T')[0];

      const checkins = await db.all(
        `SELECT member_name, service, type, amount, timestamp
         FROM checkins
         WHERE gym_id = ? AND DATE(timestamp) = ?
         ORDER BY timestamp DESC`,
        [gym_id, today]
      );

      // Format timestamps
      const formattedCheckins = checkins.map(c => ({
        ...c,
        timestamp: new Date(c.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      }));

      // Calculate summary
      const summary = {
        total_checkins: checkins.length,
        total_revenue: checkins.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      };

      res.json({
        date: today,
        checkins: formattedCheckins,
        summary
      });
    } catch (err) {
      console.error('Get today check-ins error:', err.message);
      res.status(500).json({ error: 'Failed to fetch check-ins' });
    }
  }
);

// GET /api/checkins/analytics - Get check-in data for analytics (helper endpoint)
// Used internally by dashboard endpoints
export async function getCheckinsForPeriod(gymId, startDate, endDate) {
  try {
    return await db.all(
      `SELECT member_name, service, type, amount, timestamp
       FROM checkins
       WHERE gym_id = ? AND DATE(timestamp) BETWEEN ? AND ?
       ORDER BY timestamp DESC`,
      [gymId, startDate, endDate]
    );
  } catch (err) {
    console.error('Get analytics checkins error:', err.message);
    throw err;
  }
}

export default router;

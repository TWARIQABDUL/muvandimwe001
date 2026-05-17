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

      // For subscription check-ins, member_id is required
      if (type === 'subscription' && !member_id) {
        return res.status(400).json({ error: 'member_id required for subscription check-in' });
      }

      // For walk-in check-ins, member_name is required
      if (type === 'walk_in' && !member_name) {
        return res.status(400).json({ error: 'member_name required for walk-in check-in' });
      }

      const checkInId = uuidv4();
      const now = new Date().toISOString();

      // Get member name if not provided
      let finalMemberName = member_name;
      if (member_id && !member_name) {
        const member = await db.get(
          `SELECT name FROM members WHERE id = ? AND gym_id = ?`,
          [member_id, gym_id]
        );
        if (!member) {
          return res.status(404).json({ error: 'Member not found' });
        }
        finalMemberName = member.name;
      }

      // Insert check-in
      await db.run(
        `INSERT INTO checkins (id, gym_id, member_id, member_name, type, service, amount, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [checkInId, gym_id, member_id || null, finalMemberName, type, service, amount || null, now]
      );

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
        total_revenue: checkins.reduce((sum, c) => sum + (c.amount || 0), 0)
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
      `SELECT service, type, amount, timestamp
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

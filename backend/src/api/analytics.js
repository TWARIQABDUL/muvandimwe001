import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { getCheckinsForPeriod } from './checkins.js';

const router = express.Router();
const db = getDatabase();

// GET /api/trends/7day - 7-day rolling average trend
router.get(
  '/7day',
  authMiddleware,
  roleMiddleware(['owner']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const checkins = await getCheckinsForPeriod(gym_id, startStr, endStr);

      // Group by date and sum revenue
      const dailyRevenue = {};

      checkins.forEach(c => {
        const dateStr = c.timestamp.split('T')[0];
        if (!dailyRevenue[dateStr]) {
          dailyRevenue[dateStr] = 0;
        }
        dailyRevenue[dateStr] += c.amount || 0;
      });

      // Create array for last 7 days
      const data = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        data.push({
          date: dateStr,
          revenue: dailyRevenue[dateStr] || 0
        });
      }

      res.json({ data });
    } catch (err) {
      console.error('Get 7-day trend error:', err.message);
      res.status(500).json({ error: 'Failed to fetch trend data' });
    }
  }
);

// GET /api/revenue/breakdown - Revenue breakdown by service + type
router.get(
  '/breakdown',
  authMiddleware,
  roleMiddleware(['owner']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const { timeframe = 'today' } = req.query;

      let startDate, endDate;
      const end = new Date();
      const start = new Date();

      switch (timeframe) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          break;
        case 'week':
          start.setDate(end.getDate() - 7);
          break;
        case 'month':
          start.setMonth(end.getMonth() - 1);
          break;
        case 'year':
          start.setFullYear(end.getFullYear() - 1);
          break;
        default:
          start.setHours(0, 0, 0, 0);
      }

      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];

      const checkins = await getCheckinsForPeriod(gym_id, startDate, endDate);

      // Calculate breakdown
      const breakdown = {
        gym: { walk_in: 0, daily: 0, subscription: 0, b2b: 0, total: 0 },
        sauna: { walk_in: 0, daily: 0, subscription: 0, b2b: 0, total: 0 },
        pool: { walk_in: 0, daily: 0, subscription: 0, b2b: 0, total: 0 }
      };

      checkins.forEach(c => {
        if (breakdown[c.service]) {
          if (c.type === 'walk_in' && c.amount) {
            breakdown[c.service].walk_in += c.amount;
          } else if (c.type === 'daily' && c.amount) {
            breakdown[c.service].daily += c.amount;
          } else if (c.type === 'subscription') {
            breakdown[c.service].subscription += 0;
          } else if (c.type === 'b2b' && c.amount) {
            breakdown[c.service].b2b += c.amount;
          }
        }
      });

      // Calculate totals
      Object.keys(breakdown).forEach(service => {
        breakdown[service].total =
          breakdown[service].walk_in +
          breakdown[service].daily +
          breakdown[service].subscription +
          breakdown[service].b2b;
      });

      res.json({ timeframe, breakdown });
    } catch (err) {
      console.error('Get revenue breakdown error:', err.message);
      res.status(500).json({ error: 'Failed to fetch revenue breakdown' });
    }
  }
);

// GET /api/members/active - Active members list with tier breakdown
router.get(
  '/active',
  authMiddleware,
  roleMiddleware(['owner']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;

      // Get active members by tier
      const tierData = await db.all(
        `SELECT s.name, s.monthly_fee, COUNT(m.id) as count
         FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         JOIN members m ON ms.member_id = m.id
         WHERE ms.gym_id = ? AND ms.status = 'active'
         GROUP BY s.id
         ORDER BY s.monthly_fee DESC`,
        [gym_id]
      );

      // Calculate totals
      const totalActive = tierData.reduce((sum, t) => sum + t.count, 0);
      const estimatedMRR = tierData.reduce((sum, t) => sum + t.monthly_fee * t.count, 0);

      res.json({
        total_active: totalActive,
        by_tier: tierData.map(t => ({
          subscription_name: t.name,
          count: t.count,
          monthly_revenue_per_member: t.monthly_fee
        })),
        estimated_mrr: estimatedMRR
      });
    } catch (err) {
      console.error('Get active members error:', err.message);
      res.status(500).json({ error: 'Failed to fetch active members' });
    }
  }
);

export default router;

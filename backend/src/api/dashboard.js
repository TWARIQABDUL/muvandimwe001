import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { getCheckinsForPeriod } from './checkins.js';
import { getPendingRenewals } from './subscriptions.js';

const router = express.Router();
const db = getDatabase();

// Helper function to get date ranges
function getDateRange(timeframe) {
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

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

// Helper function to calculate revenue breakdown
function calculateRevenueBreakdown(checkins) {
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
        breakdown[c.service].subscription += 0; // Subscriptions don't add per check-in
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

  return breakdown;
}

// Helper function to calculate pie chart data
function calculatePieChart(breakdown) {
  const totals = {
    gym: breakdown.gym.total,
    sauna: breakdown.sauna.total,
    pool: breakdown.pool.total
  };

  const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

  return {
    gym: { percentage: grandTotal > 0 ? Math.round((totals.gym / grandTotal) * 100) : 0, amount: totals.gym },
    sauna: { percentage: grandTotal > 0 ? Math.round((totals.sauna / grandTotal) * 100) : 0, amount: totals.sauna },
    pool: { percentage: grandTotal > 0 ? Math.round((totals.pool / grandTotal) * 100) : 0, amount: totals.pool }
  };
}

// GET /api/dashboard/today - Today's snapshot
router.get(
  '/today',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const isOwner = req.user.role === 'owner';

      if (!isOwner) {
        // Manager gets simplified today view
        return getManagerTodayDashboard(req, res);
      }

      const today = new Date().toISOString().split('T')[0];

      // Get check-ins for today
      const checkins = await getCheckinsForPeriod(gym_id, today, today);

      const breakdown = calculateRevenueBreakdown(checkins);
      const pieChart = calculatePieChart(breakdown);

      const totalRevenue = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0);
      const totalCheckins = checkins.length;

      // Get active subscriptions count
      const activeSubs = await db.get(
        `SELECT COUNT(*) as count FROM member_subscriptions 
         WHERE gym_id = ? AND status = 'active'`,
        [gym_id]
      );

      // Calculate MRR (simplified: active subscriptions * average fee)
      const subsData = await db.all(
        `SELECT s.monthly_fee FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE ms.gym_id = ? AND ms.status = 'active'`,
        [gym_id]
      );

      const estimatedMRR = subsData.reduce((sum, s) => sum + s.monthly_fee, 0);

      // Fetch reports
      const reports = await getSubscriberReports(gym_id, today, today);

      res.json({
        timeframe: 'today',
        date: today,
        snapshot: {
          total_checkins: totalCheckins,
          total_revenue: totalRevenue,
          active_subscriptions: activeSubs.count,
          estimated_mrr: estimatedMRR
        },
        revenue_breakdown: breakdown,
        revenue_by_service: pieChart,
        reports
      });
    } catch (err) {
      console.error('Get today dashboard error:', err.message);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
);

// Manager's simplified today dashboard
async function getManagerTodayDashboard(req, res) {
  try {
    const { gym_id } = req.user;
    const today = new Date().toISOString().split('T')[0];

    // Get check-ins for today
    const checkins = await getCheckinsForPeriod(gym_id, today, today);

    // Get pending renewals
    const pendingRenewals = await getPendingRenewals(gym_id);

    const totalRevenue = checkins.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalCheckins = checkins.length;

    // Get recent check-ins for display
    const recentCheckins = checkins
      .slice(0, 10)
      .map(c => ({
        member_name: c.member_name,
        service: c.service,
        timestamp: new Date(c.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        type: c.type
      }));

    // Fetch reports
    const reports = await getSubscriberReports(gym_id, today, today);

    res.json({
      date: today,
      summary: {
        checkins_today: totalCheckins,
        revenue_today: totalRevenue,
        renewals_done: 0, // Would need separate tracking
        renewals_pending: pendingRenewals.length
      },
      pending_renewals: pendingRenewals,
      recent_checkins: recentCheckins,
      reports
    });
  } catch (err) {
    console.error('Get manager today error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
}

// GET /api/dashboard/week - This week's snapshot
router.get(
  '/week',
  authMiddleware,
  roleMiddleware(['owner']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const dateRange = getDateRange('week');

      const checkins = await getCheckinsForPeriod(gym_id, dateRange.start, dateRange.end);

      const breakdown = calculateRevenueBreakdown(checkins);
      const pieChart = calculatePieChart(breakdown);

      const totalRevenue = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0);
      const totalCheckins = checkins.length;

      const activeSubs = await db.get(
        `SELECT COUNT(*) as count FROM member_subscriptions 
         WHERE gym_id = ? AND status = 'active'`,
        [gym_id]
      );

      const subsData = await db.all(
        `SELECT s.monthly_fee FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE ms.gym_id = ? AND ms.status = 'active'`,
        [gym_id]
      );

      const estimatedMRR = subsData.reduce((sum, s) => sum + s.monthly_fee, 0);

      const reports = await getSubscriberReports(gym_id, dateRange.start, dateRange.end);

      res.json({
        timeframe: 'week',
        snapshot: {
          total_checkins: totalCheckins,
          total_revenue: totalRevenue,
          active_subscriptions: activeSubs.count,
          estimated_mrr: estimatedMRR
        },
        revenue_breakdown: breakdown,
        revenue_by_service: pieChart,
        reports
      });
    } catch (err) {
      console.error('Get week dashboard error:', err.message);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
);

// GET /api/dashboard/month - This month's snapshot
router.get(
  '/month',
  authMiddleware,
  roleMiddleware(['owner']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const dateRange = getDateRange('month');

      const checkins = await getCheckinsForPeriod(gym_id, dateRange.start, dateRange.end);

      const breakdown = calculateRevenueBreakdown(checkins);
      const pieChart = calculatePieChart(breakdown);

      const totalRevenue = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0);
      const totalCheckins = checkins.length;

      const activeSubs = await db.get(
        `SELECT COUNT(*) as count FROM member_subscriptions 
         WHERE gym_id = ? AND status = 'active'`,
        [gym_id]
      );

      const subsData = await db.all(
        `SELECT s.monthly_fee FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE ms.gym_id = ? AND ms.status = 'active'`,
        [gym_id]
      );

      const estimatedMRR = subsData.reduce((sum, s) => sum + s.monthly_fee, 0);

      const reports = await getSubscriberReports(gym_id, dateRange.start, dateRange.end);

      res.json({
        timeframe: 'month',
        snapshot: {
          total_checkins: totalCheckins,
          total_revenue: totalRevenue,
          active_subscriptions: activeSubs.count,
          estimated_mrr: estimatedMRR
        },
        revenue_breakdown: breakdown,
        revenue_by_service: pieChart,
        reports
      });
    } catch (err) {
      console.error('Get month dashboard error:', err.message);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
);

// GET /api/dashboard/year - This year's snapshot
router.get(
  '/year',
  authMiddleware,
  roleMiddleware(['owner']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const dateRange = getDateRange('year');

      const checkins = await getCheckinsForPeriod(gym_id, dateRange.start, dateRange.end);

      const breakdown = calculateRevenueBreakdown(checkins);
      const pieChart = calculatePieChart(breakdown);

      const totalRevenue = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0);
      const totalCheckins = checkins.length;

      const activeSubs = await db.get(
        `SELECT COUNT(*) as count FROM member_subscriptions 
         WHERE gym_id = ? AND status = 'active'`,
        [gym_id]
      );

      const subsData = await db.all(
        `SELECT s.monthly_fee FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE ms.gym_id = ? AND ms.status = 'active'`,
        [gym_id]
      );

      const estimatedMRR = subsData.reduce((sum, s) => sum + s.monthly_fee, 0);

      const reports = await getSubscriberReports(gym_id, dateRange.start, dateRange.end);

      res.json({
        timeframe: 'year',
        snapshot: {
          total_checkins: totalCheckins,
          total_revenue: totalRevenue,
          active_subscriptions: activeSubs.count,
          estimated_mrr: estimatedMRR
        },
        revenue_breakdown: breakdown,
        revenue_by_service: pieChart,
        reports
      });
    } catch (err) {
      console.error('Get year dashboard error:', err.message);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
);

// Helper to fetch subscriber reports (new registrations vs old checked in subscribers)
async function getSubscriberReports(gymId, startDate, endDate) {
  try {
    // 1. New Subscribers (registrations during this period)
    const newSubscribers = await db.all(
      `SELECT m.id, m.name, s.name as plan, ms.start_date, s.monthly_fee, ms.is_card
       FROM member_subscriptions ms
       JOIN members m ON ms.member_id = m.id
       JOIN subscriptions s ON ms.subscription_id = s.id
       WHERE ms.gym_id = ? AND ms.start_date BETWEEN ? AND ?
       ORDER BY ms.start_date DESC`,
      [gymId, startDate, endDate]
    );

    // 2. Old checked in subscribers (subscribers checked in during period but whose subscription start date was before startDate)
    const oldCheckedIn = await db.all(
      `SELECT DISTINCT m.id, m.name, s.name as plan, c.service, c.timestamp
       FROM checkins c
       JOIN members m ON c.member_id = m.id
       JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
       JOIN subscriptions s ON ms.subscription_id = s.id
       WHERE c.gym_id = ? AND c.type = 'subscription'
         AND DATE(c.timestamp) BETWEEN ? AND ?
         AND ms.start_date < ?
       ORDER BY c.timestamp DESC`,
      [gymId, startDate, endDate, startDate]
    );

    return {
      new_subscribers: newSubscribers,
      old_checked_in: oldCheckedIn
    };
  } catch (err) {
    console.error('getSubscriberReports error:', err.message);
    return { new_subscribers: [], old_checked_in: [] };
  }
}

export default router;

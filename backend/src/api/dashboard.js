import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';
import { getCheckinsForPeriod } from './checkins.js';
import { getPendingRenewals } from './subscriptions.js';

const router = express.Router();
const db = getDatabase();

// Helper to retrieve payments for a period
async function getPaymentsForPeriod(gymId, startDate, endDate) {
  const query = startDate === endDate
    ? `SELECT * FROM payments WHERE (gym_id = ? OR ? = 'all') AND DATE(timestamp) = ?`
    : `SELECT * FROM payments WHERE (gym_id = ? OR ? = 'all') AND DATE(timestamp) BETWEEN ? AND ?`;
  const params = startDate === endDate
    ? [gymId, gymId, startDate]
    : [gymId, gymId, startDate, endDate];
  return await db.all(query, params);
}

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

// Helper function to calculate revenue breakdown based on true payments
function calculateRevenueBreakdown(payments) {
  const breakdown = {
    gym: { walk_in: 0, walk_in_count: 0, daily: 0, daily_count: 0, subscription: 0, subscription_count: 0, b2b: 0, b2b_count: 0, total: 0, total_count: 0 },
    sauna: { walk_in: 0, walk_in_count: 0, daily: 0, daily_count: 0, subscription: 0, subscription_count: 0, b2b: 0, b2b_count: 0, total: 0, total_count: 0 },
    pool: { walk_in: 0, walk_in_count: 0, daily: 0, daily_count: 0, subscription: 0, subscription_count: 0, b2b: 0, b2b_count: 0, total: 0, total_count: 0 }
  };

  payments.forEach(p => {
    const services = p.service.split(',');
    const amount = Number(p.amount) || 0;
    const share = amount / services.length;

    services.forEach(s => {
      const cleanService = s.trim().toLowerCase();
      if (breakdown[cleanService]) {
        if (p.type === 'walk_in') {
          breakdown[cleanService].walk_in += share;
          breakdown[cleanService].walk_in_count += 1;
        } else if (p.type === 'daily') {
          breakdown[cleanService].daily += share;
          breakdown[cleanService].daily_count += 1;
        } else if (p.type === 'subscription_signup' || p.type === 'subscription_renewal') {
          breakdown[cleanService].subscription += share;
          breakdown[cleanService].subscription_count += 1;
        } else if (p.type === 'b2b') {
          breakdown[cleanService].b2b += share;
          breakdown[cleanService].b2b_count += 1;
        }
      }
    });
  });

  // Calculate totals
  Object.keys(breakdown).forEach(service => {
    breakdown[service].total =
      breakdown[service].walk_in +
      breakdown[service].daily +
      breakdown[service].subscription +
      breakdown[service].b2b;
    breakdown[service].total_count =
      breakdown[service].walk_in_count +
      breakdown[service].daily_count +
      breakdown[service].subscription_count +
      breakdown[service].b2b_count;
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
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);
      const isOwner = req.user.role === 'owner';

      if (!isOwner) {
        return getManagerTodayDashboard(req, res);
      }

      const today = new Date().toISOString().split('T')[0];

      // Get check-ins and payments for today
      const checkins = await getCheckinsForPeriod(gym_id, today, today);
      const payments = await getPaymentsForPeriod(gym_id, today, today);

      const breakdown = calculateRevenueBreakdown(payments);
      const pieChart = calculatePieChart(breakdown);

      const totalRevenue = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0);
      const cashRevenue = payments.filter(p => !p.payment_method || p.payment_method === 'Cash').reduce((sum, p) => sum + Number(p.amount), 0);
      const momoRevenue = payments.filter(p => p.payment_method === 'MOMO').reduce((sum, p) => sum + Number(p.amount), 0);
      const totalCheckins = checkins.length;
      const walkInCheckins = checkins.filter(c => c.type === 'walk_in' || c.type === 'daily').length;
      const subscriberCheckins = checkins.filter(c => c.type === 'subscription').length;
      const partnerCheckins = checkins.filter(c => c.type === 'b2b').length;
      
      const recentCheckins = checkins.map(c => ({
        member_name: c.member_name,
        service: c.service,
        timestamp: new Date(c.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        type: c.type
      }));

      const walkInRevenue = payments
        .filter(p => p.type === 'walk_in' || p.type === 'daily')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const subscriptionRevenue = payments
        .filter(p => p.type === 'subscription_signup' || p.type === 'subscription_renewal')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Get active subscriptions count
      const activeSubs = await db.get(
        `SELECT COUNT(*) as count FROM member_subscriptions 
         WHERE (gym_id = ? OR ? = 'all') AND status = 'active'`,
        [gym_id, gym_id]
      );

      // Calculate MRR
      const subsData = await db.all(
        `SELECT s.monthly_fee FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE (ms.gym_id = ? OR ? = 'all') AND ms.status = 'active'`,
        [gym_id, gym_id]
      );

      const estimatedMRR = subsData.reduce((sum, s) => sum + Number(s.monthly_fee), 0);

      // Fetch reports
      const reports = await getSubscriberReports(gym_id, today, today);

      res.json({
        timeframe: 'today',
        date: today,
        snapshot: {
          total_checkins: totalCheckins,
          walk_in_checkins: walkInCheckins,
          subscriber_checkins: subscriberCheckins,
          partner_checkins: partnerCheckins,
          total_revenue: totalRevenue,
          cash_revenue: cashRevenue,
          momo_revenue: momoRevenue,
          walk_in_revenue: walkInRevenue,
          subscription_revenue: subscriptionRevenue,
          active_subscriptions: activeSubs.count,
          estimated_mrr: estimatedMRR
        },
        recent_checkins: recentCheckins,
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
    const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);
    const today = new Date().toISOString().split('T')[0];

    // Get check-ins and payments for today
    const checkins = await getCheckinsForPeriod(gym_id, today, today);
    const payments = await getPaymentsForPeriod(gym_id, today, today);

    // Get pending renewals
    const pendingRenewals = await getPendingRenewals(gym_id);

    const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const cashRevenue = payments.filter(p => !p.payment_method || p.payment_method === 'Cash').reduce((sum, p) => sum + Number(p.amount), 0);
      const momoRevenue = payments.filter(p => p.payment_method === 'MOMO').reduce((sum, p) => sum + Number(p.amount), 0);
    const walkInRevenue = payments
      .filter(p => p.type === 'walk_in' || p.type === 'daily')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const subscriptionRevenue = payments
      .filter(p => p.type === 'subscription_signup' || p.type === 'subscription_renewal')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalCheckins = checkins.length;
    const walkInCheckins = checkins.filter(c => c.type === 'walk_in' || c.type === 'daily').length;
    const subscriberCheckins = checkins.filter(c => c.type === 'subscription').length;
    const partnerCheckins = checkins.filter(c => c.type === 'b2b').length;

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
        walkin_checkins: walkInCheckins,
        subscriber_checkins: subscriberCheckins,
        partner_checkins: partnerCheckins,
        revenue_today: totalRevenue,
        cash_revenue_today: cashRevenue,
        momo_revenue_today: momoRevenue,
        walk_in_revenue_today: walkInRevenue,
        subscription_revenue_today: subscriptionRevenue,
        new_subscriptions: payments.filter(p => p.type === 'subscription_signup').length,
        renewals_done: payments.filter(p => p.type === 'subscription_renewal').length,
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
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);
      const dateRange = getDateRange('week');

      const checkins = await getCheckinsForPeriod(gym_id, dateRange.start, dateRange.end);
      const payments = await getPaymentsForPeriod(gym_id, dateRange.start, dateRange.end);

      const breakdown = calculateRevenueBreakdown(payments);
      const pieChart = calculatePieChart(breakdown);

      const totalRevenue = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0);
      const cashRevenue = payments.filter(p => !p.payment_method || p.payment_method === 'Cash').reduce((sum, p) => sum + Number(p.amount), 0);
      const momoRevenue = payments.filter(p => p.payment_method === 'MOMO').reduce((sum, p) => sum + Number(p.amount), 0);
      const totalCheckins = checkins.length;
      const walkInCheckins = checkins.filter(c => c.type === 'walk_in' || c.type === 'daily').length;
      const subscriberCheckins = checkins.filter(c => c.type === 'subscription').length;
      const partnerCheckins = checkins.filter(c => c.type === 'b2b').length;

      const recentCheckins = checkins.slice(0, 50).map(c => ({
        member_name: c.member_name,
        service: c.service,
        timestamp: new Date(c.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        type: c.type
      }));

      const walkInRevenue = payments
        .filter(p => p.type === 'walk_in' || p.type === 'daily')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const subscriptionRevenue = payments
        .filter(p => p.type === 'subscription_signup' || p.type === 'subscription_renewal')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const activeSubs = await db.get(
        `SELECT COUNT(*) as count FROM member_subscriptions 
         WHERE (gym_id = ? OR ? = 'all') AND status = 'active'`,
        [gym_id, gym_id]
      );

      const subsData = await db.all(
        `SELECT s.monthly_fee FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE (ms.gym_id = ? OR ? = 'all') AND ms.status = 'active'`,
        [gym_id, gym_id]
      );

      const estimatedMRR = subsData.reduce((sum, s) => sum + Number(s.monthly_fee), 0);

      const reports = await getSubscriberReports(gym_id, dateRange.start, dateRange.end);

      res.json({
        timeframe: 'week',
        snapshot: {
          total_checkins: totalCheckins,
          walk_in_checkins: walkInCheckins,
          subscriber_checkins: subscriberCheckins,
          partner_checkins: partnerCheckins,
          total_revenue: totalRevenue,
          cash_revenue: cashRevenue,
          momo_revenue: momoRevenue,
          walk_in_revenue: walkInRevenue,
          subscription_revenue: subscriptionRevenue,
          active_subscriptions: activeSubs.count,
          estimated_mrr: estimatedMRR
        },
        recent_checkins: recentCheckins,
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
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);
      const dateRange = getDateRange('month');

      const checkins = await getCheckinsForPeriod(gym_id, dateRange.start, dateRange.end);
      const payments = await getPaymentsForPeriod(gym_id, dateRange.start, dateRange.end);

      const breakdown = calculateRevenueBreakdown(payments);
      const pieChart = calculatePieChart(breakdown);

      const totalRevenue = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0);
      const cashRevenue = payments.filter(p => !p.payment_method || p.payment_method === 'Cash').reduce((sum, p) => sum + Number(p.amount), 0);
      const momoRevenue = payments.filter(p => p.payment_method === 'MOMO').reduce((sum, p) => sum + Number(p.amount), 0);
      const totalCheckins = checkins.length;
      const walkInCheckins = checkins.filter(c => c.type === 'walk_in' || c.type === 'daily').length;
      const subscriberCheckins = checkins.filter(c => c.type === 'subscription').length;
      const partnerCheckins = checkins.filter(c => c.type === 'b2b').length;

      const recentCheckins = checkins.slice(0, 50).map(c => ({
        member_name: c.member_name,
        service: c.service,
        timestamp: new Date(c.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        type: c.type
      }));

      const walkInRevenue = payments
        .filter(p => p.type === 'walk_in' || p.type === 'daily')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const subscriptionRevenue = payments
        .filter(p => p.type === 'subscription_signup' || p.type === 'subscription_renewal')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const activeSubs = await db.get(
        `SELECT COUNT(*) as count FROM member_subscriptions 
         WHERE (gym_id = ? OR ? = 'all') AND status = 'active'`,
        [gym_id, gym_id]
      );

      const subsData = await db.all(
        `SELECT s.monthly_fee FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE (ms.gym_id = ? OR ? = 'all') AND ms.status = 'active'`,
        [gym_id, gym_id]
      );

      const estimatedMRR = subsData.reduce((sum, s) => sum + Number(s.monthly_fee), 0);

      const reports = await getSubscriberReports(gym_id, dateRange.start, dateRange.end);

      res.json({
        timeframe: 'month',
        snapshot: {
          total_checkins: totalCheckins,
          walk_in_checkins: walkInCheckins,
          subscriber_checkins: subscriberCheckins,
          partner_checkins: partnerCheckins,
          total_revenue: totalRevenue,
          cash_revenue: cashRevenue,
          momo_revenue: momoRevenue,
          walk_in_revenue: walkInRevenue,
          subscription_revenue: subscriptionRevenue,
          active_subscriptions: activeSubs.count,
          estimated_mrr: estimatedMRR
        },
        recent_checkins: recentCheckins,
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
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);
      const dateRange = getDateRange('year');

      const checkins = await getCheckinsForPeriod(gym_id, dateRange.start, dateRange.end);
      const payments = await getPaymentsForPeriod(gym_id, dateRange.start, dateRange.end);

      const breakdown = calculateRevenueBreakdown(payments);
      const pieChart = calculatePieChart(breakdown);

      const totalRevenue = Object.values(breakdown).reduce((sum, service) => sum + service.total, 0);
      const cashRevenue = payments.filter(p => !p.payment_method || p.payment_method === 'Cash').reduce((sum, p) => sum + Number(p.amount), 0);
      const momoRevenue = payments.filter(p => p.payment_method === 'MOMO').reduce((sum, p) => sum + Number(p.amount), 0);
      const totalCheckins = checkins.length;
      const walkInCheckins = checkins.filter(c => c.type === 'walk_in' || c.type === 'daily').length;
      const subscriberCheckins = checkins.filter(c => c.type === 'subscription').length;
      const partnerCheckins = checkins.filter(c => c.type === 'b2b').length;

      const recentCheckins = checkins.slice(0, 50).map(c => ({
        member_name: c.member_name,
        service: c.service,
        timestamp: new Date(c.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        type: c.type
      }));

      const walkInRevenue = payments
        .filter(p => p.type === 'walk_in' || p.type === 'daily')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const subscriptionRevenue = payments
        .filter(p => p.type === 'subscription_signup' || p.type === 'subscription_renewal')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const activeSubs = await db.get(
        `SELECT COUNT(*) as count FROM member_subscriptions 
         WHERE (gym_id = ? OR ? = 'all') AND status = 'active'`,
        [gym_id, gym_id]
      );

      const subsData = await db.all(
        `SELECT s.monthly_fee FROM member_subscriptions ms
         JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE (ms.gym_id = ? OR ? = 'all') AND ms.status = 'active'`,
        [gym_id, gym_id]
      );

      const estimatedMRR = subsData.reduce((sum, s) => sum + Number(s.monthly_fee), 0);

      const reports = await getSubscriberReports(gym_id, dateRange.start, dateRange.end);

      res.json({
        timeframe: 'year',
        snapshot: {
          total_checkins: totalCheckins,
          walk_in_checkins: walkInCheckins,
          subscriber_checkins: subscriberCheckins,
          partner_checkins: partnerCheckins,
          total_revenue: totalRevenue,
          cash_revenue: cashRevenue,
          momo_revenue: momoRevenue,
          walk_in_revenue: walkInRevenue,
          subscription_revenue: subscriptionRevenue,
          active_subscriptions: activeSubs.count,
          estimated_mrr: estimatedMRR
        },
        recent_checkins: recentCheckins,
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

// Helper to fetch subscriber reports
async function getSubscriberReports(gymId, startDate, endDate) {
  try {
    // 1. New Subscribers (registrations during this period)
    const newSubscribers = await db.all(
      `SELECT m.id, m.name, s.name as plan, ms.start_date, s.monthly_fee, ms.is_card
       FROM member_subscriptions ms
       JOIN members m ON ms.member_id = m.id
       JOIN subscriptions s ON ms.subscription_id = s.id
       WHERE (ms.gym_id = ? OR ? = 'all') AND ms.start_date BETWEEN ? AND ?
       ORDER BY ms.start_date DESC`,
      [gymId, gymId, startDate, endDate]
    );

    // 2. Old checked in subscribers
    const oldCheckedIn = await db.all(
      `SELECT DISTINCT m.id, m.name, s.name as plan, c.service, c.timestamp
       FROM checkins c
       JOIN members m ON c.member_id = m.id
       JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
       JOIN subscriptions s ON ms.subscription_id = s.id
       WHERE (c.gym_id = ? OR ? = 'all') AND c.type = 'subscription'
         AND DATE(c.timestamp) BETWEEN ? AND ?
         AND ms.start_date < ?
       ORDER BY c.timestamp DESC`,
      [gymId, gymId, startDate, endDate, startDate]
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

// GET /api/dashboard/report - Daily Report for a specific date
router.get(
  '/report',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      // Fetch all check-ins for the specified date
      const checkins = await getCheckinsForPeriod(gym_id, date, date);

      // Group them cleanly for the frontend
      const walkins = [];
      const subscribers = [];
      const partners = [];

      checkins.forEach(c => {
        const formatted = {
          member_name: c.member_name,
          service: c.service,
          amount: c.amount,
          timestamp: new Date(c.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          type: c.type
        };

        if (c.type === 'b2b') {
          partners.push(formatted);
        } else if (c.type === 'subscription') {
          subscribers.push(formatted);
        } else {
          // 'walk_in' or 'daily'
          walkins.push(formatted);
        }
      });

      res.json({
        date,
        data: {
          walkins,
          subscribers,
          partners
        }
      });
    } catch (err) {
      console.error('Get daily report error:', err.message);
      res.status(500).json({ error: 'Failed to fetch daily report' });
    }
  }
);

export default router;

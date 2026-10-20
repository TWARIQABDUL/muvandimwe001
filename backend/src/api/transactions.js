import express from 'express';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';
import { logAction } from '../utils/auditLog.js';

const router = express.Router();
const db = {
  get: (...args) => getDatabase().get(...args),
  run: (...args) => getDatabase().run(...args),
  all: (...args) => getDatabase().all(...args)
};

const ownerOnly = [authMiddleware, roleMiddleware(['owner']), gymIsolationMiddleware];

const gymOf = (req) => (req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id));

// Date range defaults to today; both ends are inclusive YYYY-MM-DD.
function rangeOf(req) {
  const today = new Date().toISOString().split('T')[0];
  const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : today;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : from;
  return { from, to };
}

// Flags rows that look entered twice: same key on the same day.
function markDuplicates(rows, keyOf) {
  const seen = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return rows.map(row => ({ ...row, possible_duplicate: seen.get(keyOf(row)) > 1 }));
}

// GET /api/transactions/checkins?from=&to=
router.get('/checkins', ...ownerOnly, async (req, res) => {
  try {
    const gym_id = gymOf(req);
    const { from, to } = rangeOf(req);
    const rows = await db.all(
      `SELECT c.id, c.gym_id, c.member_id, c.member_name, c.type, c.service, c.amount, c.timestamp,
              u.username AS recorded_by
       FROM checkins c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE (c.gym_id = ? OR ? = 'all') AND DATE(c.timestamp) BETWEEN ? AND ?
       ORDER BY c.timestamp DESC`,
      [gym_id, gym_id, from, to]
    );
    const checkins = markDuplicates(rows, c =>
      [c.gym_id, c.member_id || c.member_name.toLowerCase(), c.service.toLowerCase(), String(c.timestamp).slice(0, 10)].join('|'));
    res.json({ from, to, checkins });
  } catch (err) {
    console.error('List check-ins error:', err.message);
    res.status(500).json({ error: 'Failed to load check-ins' });
  }
});

// GET /api/transactions/payments?from=&to=
router.get('/payments', ...ownerOnly, async (req, res) => {
  try {
    const gym_id = gymOf(req);
    const { from, to } = rangeOf(req);
    const rows = await db.all(
      `SELECT p.id, p.gym_id, p.member_id, p.amount, p.type, p.service, p.payment_method, p.months, p.timestamp,
              m.name AS member_name, u.username AS recorded_by
       FROM payments p
       LEFT JOIN members m ON m.id = p.member_id
       LEFT JOIN users u ON u.id = p.user_id
       WHERE (p.gym_id = ? OR ? = 'all') AND DATE(p.timestamp) BETWEEN ? AND ?
       ORDER BY p.timestamp DESC`,
      [gym_id, gym_id, from, to]
    );
    // Walk-ins have no member, so only member payments can be told apart by who paid.
    const payments = markDuplicates(rows, p =>
      p.member_id
        ? [p.gym_id, p.member_id, p.type, p.service.toLowerCase(), Number(p.amount), String(p.timestamp).slice(0, 10)].join('|')
        : `unique|${p.id}`);
    res.json({ from, to, payments });
  } catch (err) {
    console.error('List payments error:', err.message);
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

// GET /api/transactions/sales?from=&to= - Shop sales (deleted through DELETE /api/products/sales/:id)
router.get('/sales', ...ownerOnly, async (req, res) => {
  try {
    const gym_id = gymOf(req);
    const { from, to } = rangeOf(req);
    const rows = await db.all(
      `SELECT ps.id, ps.gym_id, ps.product_id, ps.quantity, ps.unit_price, ps.amount, ps.payment_method, ps.sold_at AS timestamp,
              p.name AS product_name, u.username AS recorded_by
       FROM product_sales ps
       LEFT JOIN products p ON p.id = ps.product_id
       LEFT JOIN users u ON u.id = ps.user_id
       WHERE (ps.gym_id = ? OR ? = 'all') AND DATE(ps.sold_at) BETWEEN ? AND ?
       ORDER BY ps.sold_at DESC`,
      [gym_id, gym_id, from, to]
    );
    const sales = markDuplicates(rows, s =>
      [s.gym_id, s.product_id, s.quantity, Number(s.amount), s.payment_method, String(s.timestamp).slice(0, 16)].join('|'));
    res.json({ from, to, sales });
  } catch (err) {
    console.error('List sales error:', err.message);
    res.status(500).json({ error: 'Failed to load shop sales' });
  }
});

// DELETE /api/transactions/checkins/:id - Remove a check-in entered by mistake.
// Undoes its effects: a card gets its tap back, and the payment written with a
// walk-in/daily check-in goes with it.
router.delete('/checkins/:id', ...ownerOnly, async (req, res) => {
  try {
    const gym_id = gymOf(req);
    const checkin = await db.get(
      `SELECT * FROM checkins WHERE id = ? AND (gym_id = ? OR ? = 'all')`,
      [req.params.id, gym_id, gym_id]
    );
    if (!checkin) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    const undone = [];

    if (checkin.type === 'subscription' && checkin.member_id) {
      const sub = await db.get(
        `SELECT ms.id, ms.remaining_taps
         FROM members m JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
         WHERE m.id = ? AND ms.is_card = 1`,
        [checkin.member_id]
      );
      if (sub) {
        await db.run(
          `UPDATE member_subscriptions SET remaining_taps = remaining_taps + 1, status = 'active' WHERE id = ?`,
          [sub.id]
        );
        undone.push('Gave one tap back to the card');
      }
    }

    const linked = await db.run(`DELETE FROM payments WHERE checkin_id = ?`, [checkin.id]);
    if (linked.changes > 0) undone.push('Removed the payment recorded with it');

    await db.run(`DELETE FROM checkins WHERE id = ?`, [checkin.id]);

    await logAction(req, {
      action: 'checkin.delete',
      entityType: 'checkin',
      entityId: checkin.id,
      gymId: checkin.gym_id,
      details: {
        member_name: checkin.member_name,
        service: checkin.service,
        type: checkin.type,
        amount: checkin.amount,
        recorded_at: checkin.timestamp,
        undone
      }
    });

    res.json({ success: true, message: ['Check-in removed', ...undone].join('. ') });
  } catch (err) {
    console.error('Delete check-in error:', err.message);
    res.status(500).json({ error: 'Failed to remove check-in' });
  }
});

// DELETE /api/transactions/payments/:id - Remove a payment entered by mistake.
// A removed renewal also takes back the months it added to the subscription.
router.delete('/payments/:id', ...ownerOnly, async (req, res) => {
  try {
    const gym_id = gymOf(req);
    const payment = await db.get(
      `SELECT * FROM payments WHERE id = ? AND (gym_id = ? OR ? = 'all')`,
      [req.params.id, gym_id, gym_id]
    );
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const undone = [];

    if (payment.type === 'subscription_renewal' && payment.member_id) {
      const sub = await db.get(
        `SELECT ms.id, ms.next_renewal_date, ms.is_card
         FROM members m JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
         WHERE m.id = ?`,
        [payment.member_id]
      );
      if (sub && !sub.is_card) {
        const months = Number(payment.months) || 1;
        const back = new Date(new Date(sub.next_renewal_date).getTime() - 30 * months * 24 * 60 * 60 * 1000);
        const backStr = back.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        await db.run(
          `UPDATE member_subscriptions SET next_renewal_date = ?, status = ? WHERE id = ?`,
          [backStr, backStr < today ? 'expired' : 'active', sub.id]
        );
        undone.push(`Moved the renewal date back ${months} month${months > 1 ? 's' : ''} to ${backStr}`);
      }
    }

    await db.run(`DELETE FROM payments WHERE id = ?`, [payment.id]);

    await logAction(req, {
      action: 'payment.delete',
      entityType: 'payment',
      entityId: payment.id,
      gymId: payment.gym_id,
      details: {
        member_id: payment.member_id,
        type: payment.type,
        service: payment.service,
        amount: payment.amount,
        payment_method: payment.payment_method,
        recorded_at: payment.timestamp,
        undone
      }
    });

    res.json({ success: true, message: ['Payment removed', ...undone].join('. ') });
  } catch (err) {
    console.error('Delete payment error:', err.message);
    res.status(500).json({ error: 'Failed to remove payment' });
  }
});

// GET /api/transactions/audit-logs?from=&to=&user=&q=
router.get('/audit-logs', ...ownerOnly, async (req, res) => {
  try {
    const gym_id = gymOf(req);
    const { from, to } = rangeOf(req);
    const params = [gym_id, gym_id, from, to];
    let sql = `SELECT id, gym_id, user_id, username, role, action, entity_type, entity_id, details, created_at
               FROM audit_logs
               WHERE (gym_id = ? OR ? = 'all') AND DATE(created_at) BETWEEN ? AND ?`;
    if (req.query.user) {
      sql += ` AND username = ?`;
      params.push(req.query.user);
    }
    sql += ` ORDER BY created_at DESC LIMIT 500`;
    const logs = await db.all(sql, params);
    res.json({
      from,
      to,
      logs: logs.map(l => ({ ...l, details: l.details ? JSON.parse(l.details) : null }))
    });
  } catch (err) {
    console.error('List audit logs error:', err.message);
    res.status(500).json({ error: 'Failed to load activity log' });
  }
});

export default router;

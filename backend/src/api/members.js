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
      let { qr_code_id } = req.body;
      const { name, email, phone, subscription_id, services, is_card, taps, coupon, employer_id, payment_method, start_date } = req.body;
      const { gym_id } = req.user;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      if (qr_code_id) {
        const validCard = await db.get(
          `SELECT status FROM valid_qr_cards WHERE gym_id = ? AND id = ?`,
          [gym_id, qr_code_id]
        );
        
        if (!validCard) {
          return res.status(403).json({ error: 'Unauthorized QR Card. Please use a valid pre-printed gym card.' });
        }
        
        if (validCard.status !== 'unassigned') {
          return res.status(409).json({ error: 'This QR card is already assigned to a member.' });
        }
      } else {
        const unassignedCard = await db.get(
          `SELECT id FROM valid_qr_cards WHERE gym_id = ? AND status = 'unassigned' LIMIT 1`,
          [gym_id]
        );
        if (unassignedCard) {
          qr_code_id = unassignedCard.id;
        } else {
          qr_code_id = uuidv4();
          await db.run(
            `INSERT INTO valid_qr_cards (id, gym_id, status) VALUES (?, ?, 'unassigned')`,
            [qr_code_id, gym_id]
          );
        }
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

      // If B2B member, skip subscription logic
      if (employer_id) {
        const memberId = uuidv4();

        await db.run(
          `INSERT INTO members (id, gym_id, name, email, phone, qr_code_id, type, employer_id, current_subscription_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [memberId, gym_id, name, email || null, phone || null, qr_code_id, 'b2b', employer_id, null]
        );

        if (qr_code_id) {
          await db.run(
            `UPDATE valid_qr_cards SET status = 'assigned', assigned_member_id = ? WHERE id = ? AND gym_id = ?`,
            [memberId, qr_code_id, gym_id]
          );
        }

        return res.status(201).json({
          id: memberId,
          name,
          email,
          phone,
          type: 'b2b',
          employer_id
        });
      }

      // Calculate dynamic price
      let baseFee = 0;
      let servicesList = [];
      if (services && services.length > 0) {
        for (const serviceName of services) {
          const service = await db.get(
            `SELECT * FROM services WHERE gym_id = ? AND name = ?`,
            [gym_id, serviceName.trim().toLowerCase()]
          );
          if (service) {
            baseFee += Number(service.price_monthly) || 0;
            servicesList.push(service.name);
          }
        }
      }

      // If no dynamic services, check if static subscription was passed
      if (servicesList.length === 0 && subscription_id) {
        const sub = await db.get(
          `SELECT * FROM subscriptions WHERE id = ? AND gym_id = ?`,
          [subscription_id, gym_id]
        );
        if (sub) {
          baseFee = Number(sub.monthly_fee) || 0;
          servicesList = sub.included_services ? sub.included_services.split(',') : ['gym'];
        }
      }

      // Fallback default
      if (servicesList.length === 0) {
        servicesList = ['gym'];
        baseFee = 40000;
      }

      // Apply coupon
      let discountPercent = 0;
      if (coupon) {
        const cleanCoupon = coupon.trim().toUpperCase();
        const foundCoupon = await db.get(
          `SELECT discount_percent FROM coupons WHERE gym_id = ? AND code = ? AND active = 1`,
          [gym_id, cleanCoupon]
        );
        if (foundCoupon) {
          discountPercent = foundCoupon.discount_percent;
        } else {
          return res.status(400).json({ error: 'Invalid or inactive coupon code' });
        }
      }
      const discountAmount = Math.round(baseFee * (discountPercent / 100));
      const finalFee = baseFee - discountAmount;

      // Find or create dynamically generated subscription in database
      const servicesStr = servicesList.join(',');
      const dynamicSubName = `Dynamic: ${servicesList.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' + ')} (${finalFee.toLocaleString()} RWF)${coupon ? ` - Coupon ${coupon.toUpperCase()}` : ''}`;

      let subPlan = await db.get(
        `SELECT id, name FROM subscriptions WHERE gym_id = ? AND name = ?`,
        [gym_id, dynamicSubName]
      );

      let finalSubId;
      if (subPlan) {
        finalSubId = subPlan.id;
      } else {
        finalSubId = uuidv4();
        await db.run(
          `INSERT INTO subscriptions (id, gym_id, name, monthly_fee, included_services)
           VALUES (?, ?, ?, ?, ?)`,
          [finalSubId, gym_id, dynamicSubName, finalFee, servicesStr]
        );
      }

      // Expiration / renewal string
      let effectiveStartDate = new Date();
      if (start_date) {
        effectiveStartDate = new Date(start_date);
      }
      const startStr = effectiveStartDate.toISOString().split('T')[0];

      let nextRenewalStr;
      if (is_card) {
        // Bound by 1 year for card validity
        const nextYear = new Date(effectiveStartDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        nextRenewalStr = nextYear.toISOString().split('T')[0];
      } else {
        const nextMonth = new Date(effectiveStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        nextRenewalStr = nextMonth.toISOString().split('T')[0];
      }

      const memberId = uuidv4();

      // Insert member
      await db.run(
        `INSERT INTO members (id, gym_id, name, email, phone, qr_code_id, type, current_subscription_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [memberId, gym_id, name, email || null, phone || null, qr_code_id, 'subscription', null]
      );

      // Create subscription
      const memberSubId = uuidv4();
      await db.run(
        `INSERT INTO member_subscriptions (id, gym_id, member_id, subscription_id, start_date, next_renewal_date, status, is_card, remaining_taps)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [memberSubId, gym_id, memberId, finalSubId, startStr, nextRenewalStr, 'active', is_card ? 1 : 0, is_card ? (Number(taps) || 20) : null]
      );

      // Update member current subscription link
      await db.run(
        `UPDATE members SET current_subscription_id = ? WHERE id = ?`,
        [memberSubId, memberId]
      );

      if (qr_code_id) {
        await db.run(
          `UPDATE valid_qr_cards SET status = 'assigned', assigned_member_id = ? WHERE id = ? AND gym_id = ?`,
          [memberId, qr_code_id, gym_id]
        );
      }

      // Log payment transaction
      const paymentId = uuidv4();
      await db.run(
        `INSERT INTO payments (id, gym_id, member_id, amount, type, service, payment_method, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [paymentId, gym_id, memberId, finalFee, 'subscription_signup', servicesStr, payment_method || 'Cash', new Date().toISOString()]
      );

      res.status(201).json({
        id: memberId,
        name,
        email,
        phone,
        subscription: {
          name: dynamicSubName,
          next_renewal_date: nextRenewalStr,
          is_card: is_card ? 1 : 0,
          remaining_taps: is_card ? (Number(taps) || 20) : null
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
        `SELECT m.id, m.name, m.type, m.employer_id, e.name as employer_name, ms.status as subscription_status, ms.next_renewal_date, ms.is_card, ms.remaining_taps, s.included_services
         FROM members m
         LEFT JOIN employers e ON m.employer_id = e.id
         LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
         LEFT JOIN subscriptions s ON ms.subscription_id = s.id
         WHERE m.gym_id = ? AND m.name LIKE ?
         LIMIT 20`,
        [gym_id, `%${q}%`]
      );

      // format the results similarly to scan-qr
      const formattedMembers = members.map(m => ({
        ...m,
        allowed_services: m.included_services ? m.included_services.split(',') : []
      }));

      res.json({ members: formattedMembers });
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
        `SELECT m.*, e.name as employer_name, ms.status, ms.is_card, ms.remaining_taps, ms.next_renewal_date, s.included_services
         FROM members m
         LEFT JOIN employers e ON m.employer_id = e.id
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
          employer_id: member.employer_id,
          employer_name: member.employer_name,
          subscription_status: member.status,
          allowed_services: allowedServices,
          is_card: member.is_card || 0,
          remaining_taps: member.remaining_taps,
          next_renewal_date: member.next_renewal_date
        }
      });
    } catch (err) {
      console.error('Scan QR error:', err.message);
      res.status(500).json({ error: 'QR scan failed' });
    }
  }
);

export default router;

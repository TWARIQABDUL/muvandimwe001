import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// GET /api/employers - List all employers for the gym
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const employers = await db.all(
        `SELECT id, name, contact_email, phone, created_at
         FROM employers
         WHERE gym_id = ?
         ORDER BY name ASC`,
        [gym_id]
      );
      res.json({ employers });
    } catch (err) {
      console.error('Get employers error:', err.message);
      res.status(500).json({ error: 'Failed to load employers' });
    }
  }
);

// POST /api/employers - Create a new employer
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { name, contact_email, phone } = req.body;
      const { gym_id } = req.user;

      if (!name) {
        return res.status(400).json({ error: 'Organization name is required' });
      }

      // Check if employer already exists
      const existing = await db.get(
        `SELECT id FROM employers WHERE gym_id = ? AND name = ?`,
        [gym_id, name.trim()]
      );

      if (existing) {
        return res.status(409).json({ error: 'Organization already exists' });
      }

      const employerId = uuidv4();
      await db.run(
        `INSERT INTO employers (id, gym_id, name, contact_email, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [employerId, gym_id, name.trim(), contact_email?.trim() || null, phone?.trim() || null]
      );

      res.status(201).json({
        id: employerId,
        name: name.trim(),
        contact_email: contact_email?.trim() || null,
        phone: phone?.trim() || null
      });
    } catch (err) {
      console.error('Create employer error:', err.message);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
);

// PATCH /api/employers/:id - Update employer details
router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const employerId = req.params.id;
      const { name, contact_email, phone } = req.body;
      const { gym_id } = req.user;

      const employer = await db.get(
        `SELECT * FROM employers WHERE id = ? AND gym_id = ?`,
        [employerId, gym_id]
      );

      if (!employer) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const updateName = name ? name.trim() : employer.name;
      const updateEmail = contact_email !== undefined ? contact_email?.trim() || null : employer.contact_email;
      const updatePhone = phone !== undefined ? phone?.trim() || null : employer.phone;

      // Check for name collision
      if (updateName !== employer.name) {
        const existing = await db.get(
          `SELECT id FROM employers WHERE gym_id = ? AND name = ?`,
          [gym_id, updateName]
        );
        if (existing) {
          return res.status(409).json({ error: 'Another organization with this name already exists' });
        }
      }

      await db.run(
        `UPDATE employers
         SET name = ?, contact_email = ?, phone = ?
         WHERE id = ? AND gym_id = ?`,
        [updateName, updateEmail, updatePhone, employerId, gym_id]
      );

      res.json({
        id: employerId,
        name: updateName,
        contact_email: updateEmail,
        phone: updatePhone
      });
    } catch (err) {
      console.error('Update employer error:', err.message);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

// DELETE /api/employers/:id - Delete an employer
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const employerId = req.params.id;
      const { gym_id } = req.user;

      const employer = await db.get(
        `SELECT * FROM employers WHERE id = ? AND gym_id = ?`,
        [employerId, gym_id]
      );

      if (!employer) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Check if there are active B2B members associated.
      // Assuming B2B members might be linked via employer_id later, 
      // but right now there's no foreign key from members to employers.
      // We just delete the employer.
      await db.run(
        `DELETE FROM employers WHERE id = ? AND gym_id = ?`,
        [employerId, gym_id]
      );

      res.json({ success: true, message: 'Organization deleted' });
    } catch (err) {
      console.error('Delete employer error:', err.message);
      res.status(500).json({ error: 'Failed to delete organization' });
    }
  }
);

// GET /api/employers/:id/billing - Get 30-day billing report for an employer
router.get(
  '/:id/billing',
  authMiddleware,
  roleMiddleware(['owner', 'manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const employerId = req.params.id;
      const { gym_id } = req.user;

      const employer = await db.get(
        `SELECT * FROM employers WHERE id = ? AND gym_id = ?`,
        [employerId, gym_id]
      );

      if (!employer) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Determine date range from month parameter (e.g. '2026-06') or default to current month
      const monthParam = req.query.month;
      let startDateStr, endDateStr;

      if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
        startDateStr = `${monthParam}-01T00:00:00.000Z`;
        const start = new Date(startDateStr);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        endDateStr = end.toISOString();
      } else {
        // Default to last 30 days if no valid month is provided
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startDateStr = thirtyDaysAgo.toISOString();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        endDateStr = tomorrow.toISOString();
      }

      // Fetch all services to build a price map
      const services = await db.all(
        `SELECT name, price_daily FROM services WHERE gym_id = ?`,
        [gym_id]
      );
      
      const servicePrices = {};
      services.forEach(s => {
        servicePrices[s.name.toLowerCase()] = Number(s.price_daily) || 0;
      });

      // Fetch all B2B check-ins for this employer's members in the date range
      const checkins = await db.all(
        `SELECT c.id, c.timestamp, c.member_name, c.service
         FROM checkins c
         JOIN members m ON c.member_id = m.id
         WHERE m.employer_id = ? AND c.gym_id = ? AND c.type = 'b2b' AND c.timestamp >= ? AND c.timestamp < ?
         ORDER BY c.timestamp DESC`,
        [employerId, gym_id, startDateStr, endDateStr]
      );

      let totalCost = 0;
      const report = checkins.map(c => {
        let cost = 0;
        const accessedServices = c.service.split(',').map(s => s.trim().toLowerCase());
        accessedServices.forEach(s => {
          cost += (servicePrices[s] || 0); // Apply standard daily price for each accessed service
        });
        totalCost += cost;
        
        return {
          id: c.id,
          date: c.timestamp,
          member_name: c.member_name,
          service: c.service,
          cost
        };
      });

      res.json({ employer, report, total_cost: totalCost });
    } catch (err) {
      console.error('Get employer billing error:', err.message);
      res.status(500).json({ error: 'Failed to generate billing report' });
    }
  }
);

export default router;

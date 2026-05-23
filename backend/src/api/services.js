import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// GET /api/services - List all services for the gym (manager + owner)
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const services = await db.all(
        `SELECT id, name, price_daily, price_monthly
         FROM services
         WHERE gym_id = ?
         ORDER BY name ASC`,
        [gym_id]
      );
      res.json({ services });
    } catch (err) {
      console.error('Get services error:', err.message);
      res.status(500).json({ error: 'Failed to load services' });
    }
  }
);

// POST /api/services - Create a new service (owner only)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { name, price_daily, price_monthly } = req.body;
      const { gym_id } = req.user;

      if (!name) {
        return res.status(400).json({ error: 'Service name is required' });
      }

      const dailyRate = Number(price_daily) || 0;
      const monthlyRate = Number(price_monthly) || 0;

      // Check if service already exists
      const existing = await db.get(
        `SELECT id FROM services WHERE gym_id = ? AND name = ?`,
        [gym_id, name.trim().toLowerCase()]
      );

      if (existing) {
        return res.status(409).json({ error: 'Service already exists' });
      }

      const serviceId = uuidv4();
      await db.run(
        `INSERT INTO services (id, gym_id, name, price_daily, price_monthly)
         VALUES (?, ?, ?, ?, ?)`,
        [serviceId, gym_id, name.trim().toLowerCase(), dailyRate, monthlyRate]
      );

      res.status(201).json({
        id: serviceId,
        name: name.trim().toLowerCase(),
        price_daily: dailyRate,
        price_monthly: monthlyRate
      });
    } catch (err) {
      console.error('Create service error:', err.message);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
);

// PATCH /api/services/:id - Update service prices (owner only)
router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const serviceId = req.params.id;
      const { name, price_daily, price_monthly } = req.body;
      const { gym_id } = req.user;

      const service = await db.get(
        `SELECT * FROM services WHERE id = ? AND gym_id = ?`,
        [serviceId, gym_id]
      );

      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const updateName = name ? name.trim().toLowerCase() : service.name;
      const dailyRate = price_daily !== undefined ? Number(price_daily) : service.price_daily;
      const monthlyRate = price_monthly !== undefined ? Number(price_monthly) : service.price_monthly;

      await db.run(
        `UPDATE services
         SET name = ?, price_daily = ?, price_monthly = ?
         WHERE id = ?`,
        [updateName, dailyRate, monthlyRate, serviceId]
      );

      res.json({
        id: serviceId,
        name: updateName,
        price_daily: dailyRate,
        price_monthly: monthlyRate
      });
    } catch (err) {
      console.error('Update service error:', err.message);
      res.status(500).json({ error: 'Failed to update service' });
    }
  }
);

// DELETE /api/services/:id - Delete a service (owner only)
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const serviceId = req.params.id;
      const { gym_id } = req.user;

      const service = await db.get(
        `SELECT * FROM services WHERE id = ? AND gym_id = ?`,
        [serviceId, gym_id]
      );

      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      await db.run(
        `DELETE FROM services WHERE id = ? AND gym_id = ?`,
        [serviceId, gym_id]
      );

      res.json({ success: true, message: 'Service deleted' });
    } catch (err) {
      console.error('Delete service error:', err.message);
      res.status(500).json({ error: 'Failed to delete service' });
    }
  }
);

export default router;

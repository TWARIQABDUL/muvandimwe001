import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// GET /api/coupons - List all coupons (manager + owner)
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { gym_id } = req.user;
      const coupons = await db.all(
        `SELECT id, code, discount_percent, active, created_at
         FROM coupons
         WHERE gym_id = ?
         ORDER BY created_at DESC`,
        [gym_id]
      );
      res.json({ coupons });
    } catch (err) {
      console.error('Get coupons error:', err.message);
      res.status(500).json({ error: 'Failed to load coupons' });
    }
  }
);

// POST /api/coupons - Create coupon (owner only)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { code, discount_percent } = req.body;
      const { gym_id } = req.user;

      if (!code || !discount_percent) {
        return res.status(400).json({ error: 'Coupon code and discount percentage are required' });
      }

      const percent = Number(discount_percent);
      if (isNaN(percent) || percent < 1 || percent > 100) {
        return res.status(400).json({ error: 'Discount percent must be a valid integer between 1 and 100' });
      }

      const cleanCode = code.trim().toUpperCase();

      // Check if coupon already exists
      const existing = await db.get(
        `SELECT id FROM coupons WHERE gym_id = ? AND code = ?`,
        [gym_id, cleanCode]
      );
      if (existing) {
        return res.status(409).json({ error: 'Coupon code already exists' });
      }

      const couponId = uuidv4();
      await db.run(
        `INSERT INTO coupons (id, gym_id, code, discount_percent, active)
         VALUES (?, ?, ?, ?, 1)`,
        [couponId, gym_id, cleanCode, percent]
      );

      res.status(201).json({
        id: couponId,
        code: cleanCode,
        discount_percent: percent,
        active: 1
      });
    } catch (err) {
      console.error('Create coupon error:', err.message);
      res.status(500).json({ error: 'Failed to create coupon' });
    }
  }
);

// PATCH /api/coupons/:id - Toggle active state or edit coupon (owner only)
router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const couponId = req.params.id;
      const { active, discount_percent, code } = req.body;
      const { gym_id } = req.user;

      const coupon = await db.get(
        `SELECT * FROM coupons WHERE id = ? AND gym_id = ?`,
        [couponId, gym_id]
      );

      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      const updateActive = active !== undefined ? (active ? 1 : 0) : coupon.active;
      const updatePercent = discount_percent !== undefined ? Number(discount_percent) : coupon.discount_percent;
      const updateCode = code ? code.trim().toUpperCase() : coupon.code;

      if (isNaN(updatePercent) || updatePercent < 1 || updatePercent > 100) {
        return res.status(400).json({ error: 'Discount percent must be a valid integer between 1 and 100' });
      }

      await db.run(
        `UPDATE coupons
         SET code = ?, discount_percent = ?, active = ?
         WHERE id = ? AND gym_id = ?`,
        [updateCode, updatePercent, updateActive, couponId, gym_id]
      );

      res.json({
        id: couponId,
        code: updateCode,
        discount_percent: updatePercent,
        active: updateActive
      });
    } catch (err) {
      console.error('Update coupon error:', err.message);
      res.status(500).json({ error: 'Failed to update coupon' });
    }
  }
);

// DELETE /api/coupons/:id - Delete coupon (owner only)
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const couponId = req.params.id;
      const { gym_id } = req.user;

      const coupon = await db.get(
        `SELECT * FROM coupons WHERE id = ? AND gym_id = ?`,
        [couponId, gym_id]
      );

      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      await db.run(
        `DELETE FROM coupons WHERE id = ? AND gym_id = ?`,
        [couponId, gym_id]
      );

      res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
      console.error('Delete coupon error:', err.message);
      res.status(500).json({ error: 'Failed to delete coupon' });
    }
  }
);

export default router;

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// All routes require owner role
router.use(authMiddleware, roleMiddleware(['owner']), gymIsolationMiddleware);

// GET /api/plans - Get all plans (active and inactive)
router.get('/', async (req, res) => {
  try {
    const { gym_id } = req.user;
    const plans = await db.all(
      `SELECT id, name, monthly_fee, included_services, active
       FROM subscriptions
       WHERE gym_id = ?
       ORDER BY monthly_fee ASC`,
      [gym_id]
    );
    res.json({ plans });
  } catch (err) {
    console.error('Get plans error:', err.message);
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

// POST /api/plans - Create a new plan
router.post('/', async (req, res) => {
  try {
    const { name, monthly_fee, included_services } = req.body;
    const { gym_id } = req.user;

    if (!name || monthly_fee === undefined || !included_services) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    await db.run(
      `INSERT INTO subscriptions (id, gym_id, name, monthly_fee, included_services, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, gym_id, name, monthly_fee, included_services]
    );

    res.status(201).json({
      message: 'Plan created successfully',
      plan: { id, name, monthly_fee, included_services, active: 1 }
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A plan with this name already exists' });
    }
    console.error('Create plan error:', err.message);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// PATCH /api/plans/:id - Update a plan (or deactivate it)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, monthly_fee, included_services, active } = req.body;
    const { gym_id } = req.user;

    // Verify ownership
    const existing = await db.get(
      'SELECT id FROM subscriptions WHERE id = ? AND gym_id = ?',
      [id, gym_id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Build dynamic update query based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (monthly_fee !== undefined) {
      updates.push('monthly_fee = ?');
      values.push(monthly_fee);
    }
    if (included_services !== undefined) {
      updates.push('included_services = ?');
      values.push(included_services);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      values.push(active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, gym_id);

    await db.run(
      `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ? AND gym_id = ?`,
      values
    );

    const updatedPlan = await db.get(
      'SELECT id, name, monthly_fee, included_services, active FROM subscriptions WHERE id = ?',
      [id]
    );

    res.json({ message: 'Plan updated successfully', plan: updatedPlan });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A plan with this name already exists' });
    }
    console.error('Update plan error:', err.message);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// DELETE /api/plans/:id - Delete a plan
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { gym_id } = req.user;

    // Check if any members are currently using this plan
    const membersUsingPlan = await db.get(
      `SELECT COUNT(*) as count 
       FROM member_subscriptions 
       WHERE subscription_id = ? AND gym_id = ?`,
      [id, gym_id]
    );

    if (membersUsingPlan && membersUsingPlan.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot permanently delete this package because there are members currently subscribed to it. Please Deactivate it instead.' 
      });
    }

    const result = await db.run(
      'DELETE FROM subscriptions WHERE id = ? AND gym_id = ?',
      [id, gym_id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan deleted successfully' });
  } catch (err) {
    // Check for foreign key constraints just in case the above check missed something
    if (err.message.includes('FOREIGN KEY constraint failed')) {
       return res.status(400).json({ 
        error: 'Cannot delete package because it is referenced by existing member records. Deactivate it instead.' 
      });
    }
    console.error('Delete plan error:', err.message);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

export default router;

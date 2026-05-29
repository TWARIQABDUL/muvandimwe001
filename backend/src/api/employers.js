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

export default router;

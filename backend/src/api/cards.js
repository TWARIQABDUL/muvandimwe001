import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// POST /api/cards/generate - Generate bulk QR cards (owner only)
router.post(
  '/generate',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { count } = req.body;
      const { gym_id } = req.user;

      if (!count || isNaN(count) || count < 1 || count > 1000) {
        return res.status(400).json({ error: 'Valid count between 1 and 1000 is required' });
      }

      const newCards = [];
      for (let i = 0; i < count; i++) {
        newCards.push(uuidv4());
      }

      // SQLite doesn't natively support easy bulk insert array passing without building query strings
      // But we are actually using Postgres via pg library with a wrapper, let's just loop and insert or build parameterized query.
      // Postgres supports bulk inserts via UNNEST or multiple value groups, but looping for <1000 is fine for now
      
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      newCards.forEach((cardId) => {
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, 'unassigned')`);
        values.push(cardId, gym_id);
      });
      
      const query = `INSERT INTO valid_qr_cards (id, gym_id, status) VALUES ${placeholders.join(', ')}`;
      await db.run(query, values);

      res.status(201).json({ 
        message: `Successfully generated ${count} cards.`,
        cards: newCards
      });
    } catch (err) {
      console.error('Generate cards error:', err.message);
      res.status(500).json({ error: 'Failed to generate cards' });
    }
  }
);

// GET /api/cards - List all cards for the gym (owner only)
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['owner']),
  async (req, res) => {
    try {
      const { gym_id } = req.user;

      const cards = await db.all(
        `SELECT c.id, c.status, c.created_at, m.name as assigned_member_name 
         FROM valid_qr_cards c 
         LEFT JOIN members m ON c.assigned_member_id = m.id 
         WHERE c.gym_id = ? 
         ORDER BY c.created_at DESC`,
        [gym_id]
      );

      res.json({ cards });
    } catch (err) {
      console.error('Fetch cards error:', err.message);
      res.status(500).json({ error: 'Failed to fetch cards' });
    }
  }
);

export default router;

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/init.js';
import { authMiddleware, roleMiddleware, gymIsolationMiddleware } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// GET /api/products - Catalogue of point-of-sale items (manager + owner)
router.get(
  '/',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);
      const products = await db.all(
        `SELECT id, name, unit_price, active, sort_order
         FROM products
         WHERE (gym_id = ? OR ? = 'all')
         ORDER BY sort_order ASC, name ASC`,
        [gym_id, gym_id]
      );
      res.json({ products });
    } catch (err) {
      console.error('Get products error:', err.message);
      res.status(500).json({ error: 'Failed to load products' });
    }
  }
);

// POST /api/products - Create a product (owner only)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { name, unit_price, sort_order } = req.body;
      const gym_id = req.user.gym_id_override || req.user.gym_id;

      if (req.user.query_all_gyms) {
        return res.status(400).json({ error: 'Select a specific branch before creating a product' });
      }
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Product name is required' });
      }

      const cleanName = name.trim().toLowerCase();
      const existing = await db.get(
        `SELECT id FROM products WHERE gym_id = ? AND name = ?`,
        [gym_id, cleanName]
      );
      if (existing) {
        return res.status(409).json({ error: 'Product already exists' });
      }

      const productId = uuidv4();
      const price = Number(unit_price) || 0;
      const order = Number(sort_order) || 100;

      await db.run(
        `INSERT INTO products (id, gym_id, name, unit_price, active, sort_order)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [productId, gym_id, cleanName, price, order]
      );

      res.status(201).json({ id: productId, name: cleanName, unit_price: price, active: 1, sort_order: order });
    } catch (err) {
      console.error('Create product error:', err.message);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

// PATCH /api/products/:id - Update a product (owner only)
router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { name, unit_price, active, sort_order } = req.body;
      const gym_id = req.user.gym_id_override || req.user.gym_id;

      const product = await db.get(
        `SELECT * FROM products WHERE id = ? AND gym_id = ?`,
        [req.params.id, gym_id]
      );
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updateName = name ? name.trim().toLowerCase() : product.name;
      const price = unit_price !== undefined ? Number(unit_price) : product.unit_price;
      const activeVal = active !== undefined ? (active ? 1 : 0) : product.active;
      const order = sort_order !== undefined ? Number(sort_order) : product.sort_order;

      await db.run(
        `UPDATE products SET name = ?, unit_price = ?, active = ?, sort_order = ? WHERE id = ?`,
        [updateName, price, activeVal, order, req.params.id]
      );

      res.json({ id: req.params.id, name: updateName, unit_price: price, active: activeVal, sort_order: order });
    } catch (err) {
      console.error('Update product error:', err.message);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

// DELETE /api/products/:id - Remove a product (owner only)
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.gym_id_override || req.user.gym_id;

      const product = await db.get(
        `SELECT id FROM products WHERE id = ? AND gym_id = ?`,
        [req.params.id, gym_id]
      );
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Past sales keep the product row alive, so retire it instead of deleting.
      const sold = await db.get(
        `SELECT COUNT(*) as count FROM product_sales WHERE product_id = ?`,
        [req.params.id]
      );

      if (Number(sold.count) > 0) {
        await db.run(`UPDATE products SET active = 0 WHERE id = ?`, [req.params.id]);
        return res.json({ success: true, message: 'Product has recorded sales, so it was deactivated instead of deleted' });
      }

      await db.run(`DELETE FROM products WHERE id = ?`, [req.params.id]);
      res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
      console.error('Delete product error:', err.message);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
);

// GET /api/products/sales?date=YYYY-MM-DD - Sales recorded on a date
router.get(
  '/sales',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);
      const date = req.query.date || new Date().toISOString().split('T')[0];

      const sales = await db.all(
        `SELECT ps.id, ps.quantity, ps.unit_price, ps.amount, ps.payment_method, ps.sold_at,
                pr.name AS product_name
         FROM product_sales ps
         JOIN products pr ON ps.product_id = pr.id
         WHERE (ps.gym_id = ? OR ? = 'all') AND DATE(ps.sold_at) = ?
         ORDER BY ps.sold_at DESC`,
        [gym_id, gym_id, date]
      );

      const total = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      res.json({ date, sales, total });
    } catch (err) {
      console.error('Get product sales error:', err.message);
      res.status(500).json({ error: 'Failed to load product sales' });
    }
  }
);

// POST /api/products/sales - Record a sale (manager only)
router.post(
  '/sales',
  authMiddleware,
  roleMiddleware(['manager']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const { product_id, quantity, unit_price, payment_method, date } = req.body;
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);

      if (!product_id) {
        return res.status(400).json({ error: 'Product is required' });
      }

      const product = await db.get(
        `SELECT id, name, unit_price FROM products WHERE id = ? AND (gym_id = ? OR ? = 'all')`,
        [product_id, gym_id, gym_id]
      );
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const qty = Number(quantity) || 1;
      if (qty < 1) {
        return res.status(400).json({ error: 'Quantity must be at least 1' });
      }

      const price = unit_price !== undefined && unit_price !== '' ? Number(unit_price) : Number(product.unit_price);
      const amount = price * qty;

      // Backdating is allowed so a missed sale can still land on the right report.
      const soldAt = date
        ? new Date(`${date}T${new Date().toISOString().split('T')[1]}`).toISOString()
        : new Date().toISOString();

      const saleId = uuidv4();
      await db.run(
        `INSERT INTO product_sales (id, gym_id, product_id, user_id, quantity, unit_price, amount, payment_method, sold_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, gym_id, product_id, req.user.id, qty, price, amount, payment_method || 'Cash', soldAt]
      );

      res.status(201).json({
        sale: { id: saleId, product_name: product.name, quantity: qty, unit_price: price, amount, sold_at: soldAt }
      });
    } catch (err) {
      console.error('Record product sale error:', err.message);
      res.status(500).json({ error: 'Failed to record sale' });
    }
  }
);

// DELETE /api/products/sales/:id - Undo a sale entered by mistake (manager + owner)
router.delete(
  '/sales/:id',
  authMiddleware,
  roleMiddleware(['manager', 'owner']),
  gymIsolationMiddleware,
  async (req, res) => {
    try {
      const gym_id = req.user.query_all_gyms ? 'all' : (req.user.gym_id_override || req.user.gym_id);

      const result = await db.run(
        `DELETE FROM product_sales WHERE id = ? AND (gym_id = ? OR ? = 'all')`,
        [req.params.id, gym_id, gym_id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      res.json({ success: true, message: 'Sale removed' });
    } catch (err) {
      console.error('Delete product sale error:', err.message);
      res.status(500).json({ error: 'Failed to remove sale' });
    }
  }
);

export default router;

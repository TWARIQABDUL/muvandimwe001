import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/init.js';

console.log('🚀 Starting Gym Management SaaS Backend...');

// 1. FORCE database initialization BEFORE importing any routes
try {
  await initializeDatabase();
  console.log('✓ Database initialized successfully.');
} catch (err) {
  console.error('❌ Failed to initialize database:', err.message);
  process.exit(1);
}

// 2. NOW it is safe to import routes, as the DB is guaranteed to exist
import authRoutes from './api/auth.js';
import membersRoutes from './api/members.js';
import checkinsRoutes from './api/checkins.js';
import subscriptionsRoutes from './api/subscriptions.js';
import dashboardRoutes from './api/dashboard.js';
import analyticsRoutes from './api/analytics.js';
import servicesRoutes from './api/services.js';
import couponsRoutes from './api/coupons.js';
import plansRoutes from './api/plans.js';
import usersRoutes from './api/users.js';
import employersRoutes from './api/employers.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/members', subscriptionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/trends', analyticsRoutes);
app.use('/api/revenue', analyticsRoutes);
app.use('/api/members', analyticsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/employers', employersRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// 3. Start the server listening process if not running in a serverless environment
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📝 Demo Credentials:');
    console.log('   Manager: manager@demo.com / demo123');
    console.log('   Owner: owner@demo.com / demo123');
    console.log('');
    console.log('📚 API Documentation:');
    console.log('   POST /api/auth/login');
    console.log('   POST /api/members (manager only)');
    console.log('   GET /api/members/search (manager only)');
    console.log('   POST /api/scan-qr (manager only)');
    console.log('   POST /api/checkins (manager only)');
    console.log('   GET /api/checkins/today (manager only)');
    console.log('   POST /api/members/:id/subscriptions/renew (manager only)');
    console.log('   GET /api/dashboard/today|week|month|year (owner only)');
    console.log('   GET /api/trends/7day (owner only)');
    console.log('   GET /api/revenue/breakdown (owner only)');
    console.log('   GET /api/members/active (owner only)');
  });
}

// Export for serverless
export default app;

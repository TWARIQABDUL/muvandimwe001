# Gym Management SaaS - MVP

A lightweight, operational gym management system for fitness facilities in East Africa.

## Quick Start

### Prerequisites
- Node.js 18+ (installed)
- npm or yarn

### Installation

1. **Download & Extract** the monorepo files

2. **Install Dependencies**
```bash
npm install
npm run setup  # Installs deps for both backend & frontend
```

3. **Start Development Servers**
```bash
npm run dev
```

This starts both:
- **Backend** on http://localhost:3000
- **Frontend** on http://localhost:5173

### Demo Credentials

**Manager (On-Site Staff):**
- Email: `manager@demo.com`
- Password: `demo123`

**Owner (Remote Monitoring):**
- Email: `owner@demo.com`
- Password: `demo123`

⚠️ You'll be forced to change your password on first login.

---

## Project Structure

```
gym-management-saas/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── server.js     # Express server setup
│   │   ├── api/          # Route handlers
│   │   ├── middleware/   # Auth & validation
│   │   ├── db/           # Database schema & init
│   │   └── utils/        # JWT, password hashing
│   ├── package.json
│   └── .env.example
│
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── pages/        # Login, dashboards
│   │   ├── components/   # Modal, cards, etc.
│   │   ├── hooks/        # useAuth, useDashboard
│   │   ├── store/        # Zustand auth store
│   │   ├── styles/       # CSS files
│   │   └── App.jsx       # Router & main app
│   ├── package.json
│   └── vite.config.js
│
├── docs/                 # Documentation
├── package.json          # Root workspace config
└── README.md
```

---

## Architecture Overview

### Backend (Node.js + Express)

**Database:** SQLite (local file: `backend/src/db/gym.db`)

**Multi-Tenancy:** Single codebase, single database, multiple gyms (via `gym_id` isolation)

**Authentication:** JWT tokens + role-based access control (manager vs owner)

**API Endpoints:** 18 endpoints across auth, members, check-ins, subscriptions, dashboards, analytics

### Frontend (React + Vite)

**State Management:** Zustand (auth store)

**HTTP Client:** Axios with auth interceptor

**Routing:** React Router v6

**Styling:** CSS (no frameworks for simplicity)

**Key Pages:**
- Login (both roles)
- Manager Dashboard (operations)
- Owner Dashboard (analytics)

---

## Development Workflow

### Phase 1: Backend Setup ✅ COMPLETE
- Database schema initialized
- All 18 API endpoints built
- Demo data seeded (2 users, 15 members, 15 sample check-ins)
- Auth middleware with JWT + role-based access control

### Phase 2: Frontend Setup (CURRENT)
- [ ] Build Manager Dashboard UI (QR scan, check-in, renewals)
- [ ] Build Owner Dashboard UI (analytics, trends, reports)
- [ ] Integrate all API calls
- [ ] Test full workflows

### Phase 3: Integration & Testing
- [ ] End-to-end testing
- [ ] Bug fixes & optimizations
- [ ] Performance testing

### Phase 4: Soft Launch
- [ ] User acceptance testing (real gym)
- [ ] Gather feedback
- [ ] Final polish

---

## API Reference

### Auth Endpoints
```
POST   /api/auth/login              Login (manager or owner)
POST   /api/auth/logout             Logout
PATCH  /api/auth/change-password    Update password
```

### Manager Endpoints
```
POST   /api/members                 Register new member
GET    /api/members/search?q=name   Search members
POST   /api/scan-qr                 Scan member QR code
POST   /api/checkins                Create check-in
GET    /api/checkins/today          View today's check-ins
POST   /api/members/:id/subscriptions/renew  Renew subscription
GET    /api/dashboard/today         Today's summary
```

### Owner Endpoints
```
GET    /api/dashboard/today         Today's snapshot
GET    /api/dashboard/week          This week's snapshot
GET    /api/dashboard/month         This month's snapshot
GET    /api/dashboard/year          This year's snapshot
GET    /api/trends/7day             7-day trend data
GET    /api/revenue/breakdown       Revenue breakdown
GET    /api/members/active          Active members list
```

---

## Important Notes

### QR Code Integration
Currently uses **UUID placeholder** for testing. Your teammate should:
1. Install a QR scanner library (jsQR, zbar, etc.)
2. Replace the UUID input in `QRScanner.jsx` component
3. Still call `POST /api/scan-qr` with the `qr_code_id`

### Multi-Tenancy
Every database query includes `WHERE gym_id = ?` for data isolation.
- Manager can only see their own gym's data
- Owner can only see their own gym's data
- Platform admin (you) can see all gyms (future admin panel)

### Subscription Status
Only `'active'` and `'expired'` statuses are supported in MVP.
- Pause/cancel is locked out (policy unclear)
- Can be added later if needed

### Payment Processing
Not in scope for MVP. Amounts are logged but not charged.

---

## Customization

### Change Gym Name
Edit the gym name in the seed data:
```js
// backend/src/db/init.js (line ~100)
await db.run(
  `INSERT INTO gyms (id, name, location, country, ...)
   VALUES (?, ?, ?, ?, ...)`,
  [gymId, 'Your Gym Name', ...]  // <-- Change here
);
```

Then reset database:
```bash
rm backend/src/db/gym.db
npm run backend:dev  # Reinitializes with new data
```

### Add Demo Members
Edit the `memberNames` array in `backend/src/db/init.js`.

### Change Subscription Tiers
Edit the `subscriptions` array in `backend/src/db/init.js`.

### Customize Styling
All CSS files are in `frontend/src/styles/`. Edit as needed.

---

## Troubleshooting

### "Port 3000 already in use"
```bash
# Kill the process
pkill -f "node src/server.js"
# Or specify a different port
PORT=3001 npm run backend:dev
```

### "Database is locked"
SQLite doesn't support multiple concurrent writers. Ensure only one backend instance is running.

### "Token invalid or expired"
This is normal for development. Just log in again.

### Frontend can't reach backend
Ensure:
1. Backend is running on http://localhost:3000
2. Frontend is running on http://localhost:5173
3. Vite proxy is configured correctly in `vite.config.js`

---

## Production Deployment

Before deploying to production:

1. **Change JWT Secret**
```bash
# backend/.env
JWT_SECRET=your-long-random-secret-key-change-this
```

2. **Swap SQLite for PostgreSQL**
Update connection string in `backend/.env`:
```
DATABASE_URL=postgres://user:pass@host:5432/gym_db
```
(Keep the same schema, just change the driver)

3. **Set NODE_ENV**
```
NODE_ENV=production
```

4. **Build Frontend**
```bash
npm run frontend:build
```

5. **Use a Process Manager** (PM2, systemd, etc.)

---

## Support & Questions

Refer to the implementation plan: `GYM_SAAS_IMPLEMENTATION_PLAN.md`

For technical questions, use Claude Code in your terminal for real-time development assistance.

---

**Last Updated:** May 16, 2026  
**Status:** Phase 2 - Frontend Development (In Progress)

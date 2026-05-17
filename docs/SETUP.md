# Setup Guide

## Installation & Running

### 1. Prerequisites
- Node.js 18+ installed
- npm (comes with Node.js)

### 2. Download & Extract
Extract the monorepo folder to your desired location.

### 3. Install All Dependencies
```bash
cd gym-management-saas
npm install
npm run setup
```

This installs dependencies for:
- Root workspace
- Backend (`/backend`)
- Frontend (`/frontend`)

### 4. Start Development
```bash
npm run dev
```

This runs **both** backend and frontend concurrently:
- **Backend:** http://localhost:3000
- **Frontend:** http://localhost:5173

You should see:
```
✓ Database schema initialized
✓ Demo data seeded
✓ Server running on http://localhost:3000

🚀 Frontend dev server running at:
  ➜  Local:   http://localhost:5173/
```

### 5. Open in Browser
Navigate to **http://localhost:5173** in your browser.

You'll see the login page with demo credentials.

---

## Demo Accounts

### Manager (On-Site Staff)
```
Email: manager@demo.com
Password: demo123
```

Manages daily operations:
- Check in members (QR code or walk-in)
- Renew subscriptions
- View today's revenue
- See pending renewals

### Owner (Remote Monitoring)
```
Email: owner@demo.com
Password: owner123
```

Monitors business:
- View analytics (today/week/month/year)
- See revenue breakdown by service
- Track active members
- Monitor trends

---

## First-Time Login

1. Click "Sign In"
2. Enter email and password
3. You'll be **forced to change your password** for security
4. After changing, you'll be redirected to your dashboard

---

## Project Commands

### Development
```bash
npm run dev                 # Start both backend + frontend
npm run backend:dev        # Start backend only
npm run frontend:dev       # Start frontend only
```

### Building
```bash
npm run backend:build      # Build backend
npm run frontend:build     # Build frontend
```

### Database
The SQLite database is at: `backend/src/db/gym.db`

To reset with fresh demo data:
```bash
rm backend/src/db/gym.db
npm run backend:dev  # Reinitializes database
```

---

## File Structure

```
gym-management-saas/
│
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── server.js          # Express entry point
│   │   ├── api/               # Route handlers (auth, members, etc.)
│   │   ├── middleware/        # Auth, role-based access, gym isolation
│   │   ├── db/                # Database schema & seeding
│   │   └── utils/             # JWT, password utilities
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── pages/             # Login, ManagerDashboard, OwnerDashboard
│   │   ├── components/        # PasswordChangeModal, etc.
│   │   ├── hooks/             # useAuth, useDashboard
│   │   ├── store/             # Zustand auth store
│   │   ├── styles/            # CSS files
│   │   ├── App.jsx            # Router setup
│   │   └── main.jsx           # React entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── docs/                       # Documentation
│   ├── API_DOCS.md            # Complete API reference
│   └── SETUP.md               # This file
│
├── GYM_SAAS_IMPLEMENTATION_PLAN.md  # Full implementation plan
├── package.json               # Root workspace config
├── README.md                  # Project overview
└── .gitignore
```

---

## Next Steps

### For Frontend Development
1. Open `frontend/src/pages/ManagerDashboard.jsx` to build manager UI
2. Open `frontend/src/pages/OwnerDashboard.jsx` to build owner UI
3. Check `frontend/src/components/` for available components
4. Import `useAuth()` hook for authentication
5. Import `useDashboard()` hook for fetching data

### For Backend Development
- API endpoints are ready in `backend/src/api/`
- Database seeding is in `backend/src/db/init.js`
- Auth middleware is in `backend/src/middleware/auth.js`

### For Integration Testing
1. Test manager workflow:
   - Login → Change password → Scan QR/Walk-in → Check-in
2. Test owner workflow:
   - Login → Change password → View dashboards → Switch timeframes
3. Use Postman/curl to test API endpoints directly

---

## Troubleshooting

### Port Already in Use
```bash
# If port 3000 is taken, specify a different port
PORT=3001 npm run backend:dev

# If port 5173 is taken, Vite will use 5174, 5175, etc.
```

### Database Issues
```bash
# Reset database to fresh demo data
rm backend/src/db/gym.db
npm run backend:dev  # This reinitializes the database
```

### Frontend Can't Connect to Backend
- Check that backend is running on http://localhost:3000
- Check browser console for CORS errors
- Ensure Vite proxy in `vite.config.js` is correct

### Node Module Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
npm run setup
```

---

## Environment Variables

### Backend (.env)
Create `backend/.env` from `backend/.env.example`:

```
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-production
DATABASE_URL=./src/db/gym.db
```

Change `JWT_SECRET` before deploying to production!

---

## Using Claude Code

Once you're familiar with the project structure, use Claude Code for real-time development:

1. Open a terminal in your project folder
2. Use `claude code` (if installed) or `npx @anthropic-ai/claude-code`
3. Say "Open project gym-management-saas"
4. Claude can now edit files and run commands in real-time

---

## Key Resources

- **API Documentation:** `docs/API_DOCS.md`
- **Implementation Plan:** `GYM_SAAS_IMPLEMENTATION_PLAN.md`
- **Backend README:** `backend/README.md`
- **Frontend README:** `frontend/README.md`

---

## Support

If you encounter any issues:
1. Check the relevant README file
2. Check browser console for errors
3. Check backend logs (terminal where `npm run dev` is running)
4. Refer to the implementation plan for architecture details

---

**Last Updated:** May 16, 2026

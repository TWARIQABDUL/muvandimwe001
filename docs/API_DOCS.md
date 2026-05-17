# API Documentation

Base URL: `http://localhost:3000/api`

All requests (except login) require Authorization header:
```
Authorization: Bearer {token}
```

---

## Authentication

### POST /api/auth/login

Login with email and password.

**Request:**
```json
{
  "email": "manager@demo.com",
  "password": "demo123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-1",
    "email": "manager@demo.com",
    "role": "manager",
    "gym_id": "gym-1",
    "first_login": 1
  }
}
```

**Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### POST /api/auth/logout

Logout (client-side: delete token from localStorage).

**Request:** (empty body)

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### PATCH /api/auth/change-password

Change user password. Sets `first_login: 0`.

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "old_password": "demo123",
  "new_password": "newSecurePass123"
}
```

**Response (200):**
```json
{
  "message": "Password updated successfully",
  "first_login": 0
}
```

**Response (401):**
```json
{
  "error": "Current password is incorrect"
}
```

---

## Members (Manager Only)

### POST /api/members

Register a new member. **Manager only.**

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "phone": "+250123456789",
  "subscription_id": "sub-1"
}
```

**Response (201):**
```json
{
  "id": "member-1",
  "name": "Alice",
  "qr_code_id": "550e8400-e29b-41d4-a716-446655440000",
  "subscription": {
    "name": "40k Gym Only",
    "next_renewal_date": "2026-06-16"
  }
}
```

---

### GET /api/members/search?q=name

Search for members by name. **Manager only.**

**Query Parameters:**
- `q` (string, min 2 chars): Search query

**Example:**
```
GET /api/members/search?q=Alice
```

**Response (200):**
```json
{
  "members": [
    {
      "id": "member-1",
      "name": "Alice",
      "type": "subscription",
      "subscription_status": "active",
      "next_renewal_date": "2026-06-16"
    }
  ]
}
```

---

## QR Code Scanning

### POST /api/scan-qr

Scan/lookup member by QR code. **Manager only.**

Currently uses **UUID placeholder** (your teammate will integrate real QR scanner).

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "qr_code_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "member": {
    "id": "member-1",
    "name": "Alice",
    "type": "subscription",
    "subscription_status": "active",
    "allowed_services": ["gym", "sauna"]
  }
}
```

**Response (404):**
```json
{
  "error": "Member not found"
}
```

---

## Check-Ins

### POST /api/checkins

Create a check-in (subscription member or walk-in). **Manager only.**

**Headers:**
```
Authorization: Bearer {token}
```

**Request (Subscription Member):**
```json
{
  "member_id": "member-1",
  "service": "gym"
}
```

**Request (Walk-In):**
```json
{
  "member_name": "John (Walk-in)",
  "type": "walk_in",
  "service": "gym",
  "amount": 15000
}
```

**Response (201):**
```json
{
  "checkin": {
    "id": "checkin-1",
    "member_name": "Alice",
    "service": "gym",
    "timestamp": "10:15 AM",
    "type": "subscription"
  }
}
```

---

### GET /api/checkins/today

Get all check-ins for today. **Manager only.**

**Response (200):**
```json
{
  "date": "2026-05-16",
  "checkins": [
    {
      "member_name": "Alice",
      "service": "gym",
      "timestamp": "10:15 AM",
      "type": "subscription"
    },
    {
      "member_name": "John (Walk-in)",
      "service": "gym",
      "timestamp": "10:45 AM",
      "type": "walk_in",
      "amount": 15000
    }
  ],
  "summary": {
    "total_checkins": 32,
    "total_revenue": 215000
  }
}
```

---

## Subscriptions (Manager Only)

### POST /api/members/:id/subscriptions/renew

Renew a member's subscription for the next 30 days. **Manager only.**

**Headers:**
```
Authorization: Bearer {token}
```

**Example:**
```
POST /api/members/member-1/subscriptions/renew
```

**Request:** (empty body)

**Response (200):**
```json
{
  "message": "Subscription renewed successfully",
  "member": {
    "name": "Alice",
    "subscription": "40k Gym Only",
    "next_renewal_date": "2026-06-16"
  }
}
```

---

### PATCH /api/members/:id/subscriptions

Update subscription status (active/expired). **Manager only.**

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "status": "active"
}
```

**Response (200):**
```json
{
  "message": "Subscription status updated to active",
  "member": {
    "name": "Alice",
    "status": "active"
  }
}
```

---

## Dashboards

### GET /api/dashboard/today

Get today's snapshot. **Manager gets simplified view, Owner gets full analytics.**

**Headers:**
```
Authorization: Bearer {token}
```

**Manager Response (200):**
```json
{
  "date": "2026-05-16",
  "summary": {
    "checkins_today": 32,
    "revenue_today": 215000,
    "renewals_done": 4,
    "renewals_pending": 1
  },
  "pending_renewals": [
    {
      "member_id": "member-2",
      "name": "Bob",
      "subscription": "40k Gym",
      "renewal_due": "2026-05-16"
    }
  ],
  "recent_checkins": [
    {
      "member_name": "Alice",
      "service": "gym",
      "timestamp": "10:15 AM"
    }
  ]
}
```

**Owner Response (200):**
```json
{
  "timeframe": "today",
  "date": "2026-05-16",
  "snapshot": {
    "total_checkins": 32,
    "total_revenue": 215000,
    "active_subscriptions": 52,
    "estimated_mrr": 2860000
  },
  "revenue_breakdown": {
    "gym": {
      "walk_in": 60000,
      "daily": 30000,
      "subscription": 0,
      "b2b": 0,
      "total": 90000
    },
    "sauna": {
      "walk_in": 20000,
      "daily": 0,
      "subscription": 0,
      "b2b": 0,
      "total": 20000
    },
    "pool": {
      "walk_in": 12000,
      "daily": 12000,
      "subscription": 0,
      "b2b": 0,
      "total": 24000
    },
    "grand_total": 134000
  },
  "revenue_by_service": {
    "gym": { "percentage": 67, "amount": 90000 },
    "sauna": { "percentage": 15, "amount": 20000 },
    "pool": { "percentage": 18, "amount": 24000 }
  }
}
```

---

### GET /api/dashboard/week

Get this week's snapshot. **Owner only.**

Same response structure as `/dashboard/today`, but with `timeframe: "week"` and aggregated data.

---

### GET /api/dashboard/month

Get this month's snapshot. **Owner only.**

Same response structure, `timeframe: "month"`.

---

### GET /api/dashboard/year

Get this year's snapshot. **Owner only.**

Same response structure, `timeframe: "year"`.

---

## Analytics (Owner Only)

### GET /api/trends/7day

Get 7-day rolling average revenue trend. **Owner only.**

**Response (200):**
```json
{
  "data": [
    { "date": "2026-05-10", "revenue": 200000 },
    { "date": "2026-05-11", "revenue": 220000 },
    { "date": "2026-05-12", "revenue": 180000 },
    { "date": "2026-05-13", "revenue": 250000 },
    { "date": "2026-05-14", "revenue": 240000 },
    { "date": "2026-05-15", "revenue": 210000 },
    { "date": "2026-05-16", "revenue": 215000 }
  ]
}
```

---

### GET /api/revenue/breakdown?timeframe=today

Get detailed revenue breakdown. **Owner only.**

**Query Parameters:**
- `timeframe` (optional): `today`, `week`, `month`, `year` (default: today)

**Response (200):**
```json
{
  "timeframe": "today",
  "breakdown": {
    "gym": {
      "walk_in": 60000,
      "daily": 30000,
      "subscription": 0,
      "b2b": 0,
      "total": 90000
    },
    "sauna": { ... },
    "pool": { ... }
  }
}
```

---

### GET /api/members/active

Get active members list with tier breakdown. **Owner only.**

**Response (200):**
```json
{
  "total_active": 52,
  "by_tier": [
    {
      "subscription_name": "40k Gym Only",
      "count": 32,
      "monthly_revenue_per_member": 40000
    },
    {
      "subscription_name": "70k Gym+Sauna",
      "count": 20,
      "monthly_revenue_per_member": 70000
    }
  ],
  "estimated_mrr": 2860000
}
```

---

## Error Responses

All errors follow this format:

**400 (Bad Request):**
```json
{
  "error": "Email and password required"
}
```

**401 (Unauthorized):**
```json
{
  "error": "Invalid or expired token"
}
```

**403 (Forbidden):**
```json
{
  "error": "This action requires one of: manager"
}
```

**404 (Not Found):**
```json
{
  "error": "Member not found"
}
```

**500 (Server Error):**
```json
{
  "error": "Internal server error"
}
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "manager@demo.com", "password": "demo123"}'
```

### Get Today's Check-ins
```bash
curl -X GET http://localhost:3000/api/checkins/today \
  -H "Authorization: Bearer {token}"
```

### Create Check-in
```bash
curl -X POST http://localhost:3000/api/checkins \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"member_id": "member-1", "service": "gym"}'
```

---

**Last Updated:** May 16, 2026

# Maddie — Medical Test Booking Backend

> MVP Backend for a medical lab test booking platform.  
> Built with **Node.js + Express + MongoDB (Mongoose)**

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js (ESModules) |
| Framework | Express v5 |
| Database | MongoDB + Mongoose v9 |
| Auth | JWT (Access + Refresh Tokens) |
| Validation | **Zod** (Schema-based request validation) |
| Password | bcryptjs |
| Cookies | cookie-parser |
| Dev Server | nodemon |

---

## Project Structure

```
src/
├── app.js                          ← Express app setup (middlewares + routes)
├── server.js                       ← DB connect + server start (with crash handlers)
├── config/
│   ├── db.js                       ← MongoDB connection + event listeners
│   └── constants.js                ← ⭐ ALL enums live here (roles, slots, statuses, categories)
├── middlewares/
│   ├── auth.middleware.js           ← protect + restrictTo guards (with auth fail logs)
│   ├── errorHandler.js             ← Global error handler (with full error logging)
│   ├── requestLogger.middleware.js  ← HTTP request logger (method, url, status, latency)
│   └── validate.middleware.js       ← 🛡️ Zod schema validation middleware
├── utils/
│   ├── ApiError.js                  ← AppError class (supports validation errors array)
│   ├── ApiResponse.js              ← Standardized response shape
│   ├── catchAsync.js               ← Async error wrapper
│   ├── logger.js                   ← 🪵 Central colored logger (info, warn, error, debug, http)
│   └── validation.utils.js         ← ObjectId & common parameter schemas
├── modules/
│   ├── auth/
│   │   ├── models/user.model.js    ← User schema (name, email, password, role, refreshToken)
│   │   ├── services/auth.services.js
│   │   ├── controllers/auth.controller.js
│   │   ├── routes/auth.routes.js
│   │   ├── validators/auth.validator.js  ← Register, login, refreshToken Zod schemas
│   │   └── utils/token.utils.js    ← JWT generation + cookie options
│   ├── medical-test/
│   │   ├── models/medical-test.model.js
│   │   ├── services/medical-test.services.js
│   │   ├── controllers/medical-test.controller.js
│   │   ├── routes/medical-test.routes.js
│   │   └── validators/medical-test.validator.js ← Create & update test Zod schemas
│   └── booking/
│       ├── models/booking.model.js
│       ├── services/booking.services.js
│       ├── controllers/booking.controller.js
│       ├── routes/booking.routes.js
│       └── validators/booking.validator.js     ← Create booking & query filter schemas
└── scripts/
    ├── seedMedicalTests.js         ← Seeds 8 sample tests
    └── seedUsers.js                ← Seeds 3 test users (admin, lab_staff, user)
```

---

## Environment Variables (`.env`)

```env
PORT=8000
MONGO_URI=your_mongodb_connection_string

# JWT
ACCESS_TOKEN_SECRET=your_access_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=7d

NODE_ENV=development
```

---

## NPM Scripts

```bash
npm run dev          # Start dev server with nodemon
npm run seed         # Seed 8 sample medical tests into DB
npm run seed:users   # Seed 3 test users (admin, lab_staff, user)
```

---

## Test Credentials

```
┌─────────────┬──────────────────────┬──────────────────┐
│ Role        │ Email                │ Password         │
├─────────────┼──────────────────────┼──────────────────┤
│ admin       │ admin@maddie.com     │ admin@123        │
│ lab_staff   │ labstaff@maddie.com  │ labstaff@123     │
│ user        │ user@maddie.com      │ user@123         │
└─────────────┴──────────────────────┴──────────────────┘
```

> ⚠️ Run `npm run seed:users` to recreate these if wiped.

---

## API Endpoints

**Base URL:** `http://localhost:8000/api/v1`

### Auth — `/api/v1/auth`

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/register` | ❌ | `name, email, password, role?` | Create account |
| POST | `/auth/login` | ❌ | `email, password` | Login → sets httpOnly cookies |
| POST | `/auth/refresh-token` | ❌ | `refreshToken?` (mobile only) | Rotate tokens — browser uses cookie automatically |
| POST | `/auth/logout` | 🔐 Any | — | Logout → clears cookies + invalidates token in DB |
| GET | `/auth/me` | 🔐 Any | — | Get current logged-in user's profile |

**Login Response** sets two httpOnly cookies:
- `accessToken` — expires in 15 minutes
- `refreshToken` — expires in 7 days

Also returns `accessToken` in body for mobile clients.

---

### Medical Tests — `/api/v1/tests`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tests` | ❌ | Get all available tests |
| GET | `/tests/:id` | ❌ | Get single test by ID |
| POST | `/tests` | 🔐 Admin | Create a new test |
| PUT | `/tests/:id` | 🔐 Admin | Update test details |
| DELETE | `/tests/:id` | 🔐 Admin | Soft-delete (deactivate) a test |

**POST/PUT Body:**
```json
{
  "name": "Complete Blood Count",
  "description": "Checks RBC, WBC, platelets and hemoglobin.",
  "price": 299,
  "category": "Blood"
}
```

**Test Categories** (from `constants.js`):
`Blood` | `Urine` | `Radiology` | `Full Body`

---

### Bookings — `/api/v1/bookings`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bookings` | 🔐 Any | Create a booking |
| GET | `/bookings/my` | 🔐 Any | Get my bookings |
| GET | `/bookings/:id` | 🔐 Owner / Admin / Lab Staff | Get single booking |
| PATCH | `/bookings/:id/cancel` | 🔐 Owner | Cancel own pending booking |
| GET | `/bookings?status=&date=` | 🔐 Admin / Lab Staff | Get all bookings (filterable) |
| PATCH | `/bookings/:id/status` | 🔐 Admin / Lab Staff | Update booking status |

**POST `/bookings` Body:**
```json
{
  "testId": "<mongodb_test_id>",
  "patientName": "Rahul Chaudhary",
  "patientAge": 25,
  "patientGender": "male",
  "address": {
    "street": "123, Green Park Main",
    "city": "New Delhi",
    "state": "Delhi",
    "pincode": "110016",
    "landmark": "Near Metro Station"
  },
  "appointmentDate": "2026-12-01",
  "timeSlot": "09:00-10:00",
  "notes": "Fasting test"
}
```

**PATCH `/bookings/:id/status` Body:**
```json
{ "status": "confirmed" }
```

**Time Slots** (from `constants.js`):
```
06:00-07:00 | 07:00-08:00 | 08:00-09:00 | 09:00-10:00 | 10:00-11:00
11:00-12:00 | 12:00-13:00 | 13:00-14:00 | 14:00-15:00
```

**Booking Status Lifecycle:**
```
pending → confirmed → completed
   └──────────────────→ cancelled
```
> Once `completed` or `cancelled`, status cannot be changed again.

---

## Auth Flow

```
1. POST /auth/login         → Server validates credentials
2. Server generates:
   - accessToken  (JWT, 15m, payload: { _id, role })
   - refreshToken (JWT, 7d,  payload: { _id })
3. Both stored as httpOnly cookies
4. refreshToken also saved in User DB document
5. On logout → DB refreshToken field unset ($unset)
   → Cookie cleared → Token truly invalidated
```

**Sending token from mobile/Postman:**
```
Authorization: Bearer <accessToken>
```

---

## Role-Based Access Control

```js
// Usage in any route:
router.delete('/:id', protect, restrictTo('admin'), handler);
router.patch('/:id', protect, restrictTo('admin', 'lab_staff'), handler);
```

**Current Roles** (from `constants.js`):
```
user | admin | lab_staff
```

---

## ⭐ How to Add / Change Things

> All enums are centralized in `src/config/constants.js`.  
> Edit **only that file** — everything else auto-updates.

### Add a new role (e.g. `doctor`)
```js
// constants.js
export const USER_ROLES = {
    USER:      'user',
    ADMIN:     'admin',
    LAB_STAFF: 'lab_staff',
    DOCTOR:    'doctor',   // ← add here
};
```
Then use in routes: `restrictTo('doctor')`

### Add a new test category (e.g. `ECG`)
```js
// constants.js
export const TEST_CATEGORIES = {
    ...
    ECG: 'ECG',  // ← add here
};
```

### Change operating hours (slots)
```js
// constants.js
const START_HOUR = 6;   // ← change start (6 AM)
const END_HOUR   = 15;  // ← change end   (3 PM = last slot 14:00–15:00)
```

### Add a new booking status (e.g. `rescheduled`)
```js
// constants.js
export const BOOKING_STATUS = {
    ...
    RESCHEDULED: 'rescheduled',  // ← add here
};
```

---

## Standard API Response Shape

Success Response (2xx):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Tests fetched successfully",
  "data": { ... }
}
```

Standard Error Response (4xx / 5xx):
```json
{
  "success": false,
  "status": "fail",
  "message": "Invalid email or password"
}
```

Validation Error Response (400 Bad Request):
```json
{
  "success": false,
  "status": "fail",
  "message": "Validation failed: email: Invalid email address format, password: Password must be at least 6 characters long",
  "errors": [
    { "field": "email", "message": "Invalid email address format" },
    { "field": "password", "message": "Password must be at least 6 characters long" }
  ]
}
```

---

## Validation & Business Rules

| Rule | Validation Type | Where enforced |
|------|-----------------|---------------|
| User registration name (2-50 chars) | Zod Schema | `auth.validator.js` |
| Valid email format (RFC / lowercase) | Zod Schema | `auth.validator.js` |
| Password minimum length (6+ chars) | Zod Schema | `auth.validator.js` |
| User role enum (`user`, `admin`, `lab_staff`) | Zod Schema | `auth.validator.js` |
| MongoDB ID format (24 hex characters) | Zod Schema | `validation.utils.js` |
| Medical test price > 0 | Zod Schema | `medical-test.validator.js` |
| Medical test category (`TEST_CATEGORIES`) | Zod Schema | `medical-test.validator.js` |
| Patient age (1-120 integer) | Zod Schema | `booking.validator.js` |
| Patient gender (`male`, `female`, `other`) | Zod Schema | `booking.validator.js` |
| Operating hours time slots (`TIME_SLOTS`) | Zod Schema | `booking.validator.js` |
| Booking status transitions (`UPDATABLE_BOOKING_STATUSES`) | Zod Schema | `booking.validator.js` |
| Duplicate email on register | DB Business Rule | `auth.services.js` |
| Wrong credentials → generic error (no enumeration) | Business Rule | `auth.services.js` |
| Duplicate test name | DB Business Rule | `medical-test.services.js` |
| Same test + same date + same slot = double booking (409) | DB Business Rule | `booking.services.js` |
| User can only cancel their own `pending` bookings | Auth & Status Rule | `booking.services.js` |
| Cannot update `completed`/`cancelled` bookings | Status Lifecycle Rule | `booking.services.js` |
| Test price snapshotted at booking time | Data Integrity Rule | `booking.services.js` |
| Password hidden from DB queries (`select: false`) | Schema Security | `user.model.js` |
| Refresh token hidden from DB queries (`select: false`) | Schema Security | `user.model.js` |

---

## Logging & Debugging System

Backend mein complete leveled, colored logging system implemented hai:

| Log Level | Method | Purpose & Color | Example |
|-----------|--------|-----------------|---------|
| `[HTTP]` | `logger.http` | Har incoming HTTP request aur latency (Cyan) | `GET /api/v1/tests 200 (15ms)` |
| `[INFO]` | `logger.info` | Successful business events (Green) | `✅ Booking created: ID=..., Amount=₹500` |
| `[WARN]` | `logger.warn` | Handled client errors & 4xx (Yellow) | `⚠️ [401 Handled Error] - Invalid credentials` |
| `[ERROR]` | `logger.error` | 500 Server crashes & exceptions (Red) | `💥 [500 Server Error] with full stack trace` |
| `[DEBUG]` | `logger.debug` | Dev-only granular details (Magenta) | `Fetching test details for ID:...` |

### Key Features:
- **Automatic Timing**: Har API call ka response duration (e.g., `12ms`) terminal par dikhega.
- **Sensitive Data Masking**: `password`, `accessToken`, `refreshToken` logs mein automatically masked ho jaate hain.
- **Terminal Crash Protection**: `uncaughtException` aur `unhandledRejection` handlers server crash hone se pehle full error stack trace log karte hain.


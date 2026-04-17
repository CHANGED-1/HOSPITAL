# Bugembe HCIV — REST API

Express.js + MySQL backend for the Patient Record Management system.

---

## Stack

- **Node.js** + **Express.js** — HTTP server
- **MySQL 8+** — primary database (via `mysql2`)
- **JWT** — access tokens (15 min) + refresh tokens (7 days, rotated)
- **bcryptjs** — password hashing
- **express-validator** — request validation
- **helmet** + **cors** + **rate-limit** — security

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
```

### 3. Create database & tables
```bash
npm run db:migrate
```

### 4. Seed default users
```bash
npm run db:seed
```

### 5. Start the server
```bash
npm run dev        # development (nodemon)
npm start          # production
```

Server runs at **http://localhost:3000**

---

## Default Users (after seed)

| Username       | Password           | Role          |
|----------------|--------------------|---------------|
| admin          | admin123           | admin         |
| doctor         | doctor123          | doctor        |
| nurse1         | nurse123           | nurse         |
| receptionist   | receptionist123    | receptionist  |
| accountant     | accountant123      | accountant    |
| pharmacist     | pharmacist123      | pharmacist    |

> ⚠️ Change all passwords after first login in production.

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected routes require:
```
Authorization: Bearer <accessToken>
```

---

### Auth  `/api/auth`

| Method | Path        | Auth | Description              |
|--------|-------------|------|--------------------------|
| POST   | `/login`    | ✗    | Login, returns tokens    |
| POST   | `/refresh`  | ✗    | Rotate refresh token     |
| POST   | `/logout`   | ✗    | Revoke refresh token     |
| GET    | `/me`       | ✓    | Get current user profile |

**Login request:**
```json
{ "username": "admin", "password": "admin123" }
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": "...", "name": "Administrator", "role": "admin" }
  }
}
```

---

### Users  `/api/users`  *(admin only)*

| Method | Path                  | Description           |
|--------|-----------------------|-----------------------|
| GET    | `/`                   | List users (paginated)|
| GET    | `/:id`                | Get user by ID        |
| POST   | `/`                   | Create user           |
| PATCH  | `/:id`                | Update user           |
| PATCH  | `/:id/password`       | Change password       |
| DELETE | `/:id`                | Deactivate user       |

**Query params for GET /:** `role`, `status`, `search`, `page`, `limit`

---

### Patients  `/api/patients`

| Method | Path              | Roles allowed              |
|--------|-------------------|----------------------------|
| GET    | `/`               | All staff                  |
| GET    | `/:id`            | All staff                  |
| GET    | `/:id/history`    | All staff                  |
| POST   | `/`               | admin, doctor, nurse, receptionist |
| PATCH  | `/:id`            | admin, doctor, nurse, receptionist |

**Query params for GET /:** `search`, `status`, `gender`, `page`, `limit`

Patient numbers are auto-generated: `P-YYYYMMDD-0001`

---

### Appointments  `/api/appointments`

| Method | Path    | Description        |
|--------|---------|--------------------|
| GET    | `/`     | List appointments  |
| GET    | `/:id`  | Get one            |
| POST   | `/`     | Create             |
| PATCH  | `/:id`  | Update / cancel    |

**Query params:** `date`, `doctor_id`, `patient_id`, `status`, `page`, `limit`

**Status values:** `scheduled` | `completed` | `cancelled` | `no-show`

---

### OPD  `/api/opd`

| Method | Path    | Description   |
|--------|---------|---------------|
| GET    | `/`     | List visits   |
| GET    | `/:id`  | Get visit     |
| POST   | `/`     | Create visit  |
| PATCH  | `/:id`  | Update visit  |

**Status values:** `waiting` | `in-progress` | `completed`

Vitals stored as JSON: `{ bp, pulse, temp, weight, height, spo2 }`

---

### IPD  `/api/ipd`

| Method | Path    | Description         |
|--------|---------|---------------------|
| GET    | `/`     | List admissions     |
| GET    | `/:id`  | Get admission       |
| POST   | `/`     | Admit patient       |
| PATCH  | `/:id`  | Update / discharge  |

**Status values:** `admitted` | `discharged` | `transferred`

---

### Pharmacy  `/api/pharmacy`

| Method | Path                          | Roles              |
|--------|-------------------------------|--------------------|
| GET    | `/drugs`                      | All staff          |
| GET    | `/drugs/:id`                  | All staff          |
| POST   | `/drugs`                      | admin, pharmacist  |
| PATCH  | `/drugs/:id`                  | admin, pharmacist  |
| PATCH  | `/drugs/:id/stock`            | admin, pharmacist  |
| GET    | `/prescriptions`              | All staff          |
| PATCH  | `/prescriptions/:id/dispense` | admin, pharmacist  |

**Stock adjustment:** `{ "adjustment": 50 }` (positive = restock, negative = dispense)

**Query params for GET /drugs:** `search`, `category`, `status`, `low_stock=true`, `page`, `limit`

---

### Billing  `/api/billing`

| Method | Path             | Roles                          |
|--------|------------------|--------------------------------|
| GET    | `/summary`       | admin, accountant              |
| GET    | `/`              | admin, accountant, receptionist|
| GET    | `/:id`           | admin, accountant, receptionist|
| POST   | `/`              | admin, accountant, receptionist|
| PATCH  | `/:id/payment`   | admin, accountant, receptionist|

**Create bill body:**
```json
{
  "patient_id": "...",
  "bill_date": "2026-04-16",
  "items": [
    { "description": "Consultation", "quantity": 1, "unit_price": 5000 },
    { "description": "Malaria Test",  "quantity": 1, "unit_price": 15000 }
  ],
  "payment_method": "cash"
}
```

**Status values:** `pending` | `partial` | `paid` | `cancelled`

---

## Pagination

All list endpoints return:
```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 100, "page": 1, "limit": 20, "pages": 5 }
}
```

---

## Angular Integration

### 1. Register the HTTP interceptor in `app.config.ts`
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    // ...
  ]
};
```

### 2. The interceptor automatically:
- Attaches `Authorization: Bearer <token>` to every request
- Retries with a fresh access token on 401 responses
- Calls `logout()` if the refresh token is also expired

---

## Security Notes

- JWT secrets must be long random strings in production (32+ chars)
- Refresh tokens are rotated on every use (old token revoked immediately)
- Login endpoint is rate-limited to 10 attempts per 15 minutes per IP
- Passwords hashed with bcrypt (cost factor 10)
- Run `DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked = 1;` periodically to clean up old tokens
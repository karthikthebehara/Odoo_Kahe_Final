# Odoo Cafe POS

A full-stack Point of Sale (POS) system built with React (frontend) and Node.js/Express + MySQL (backend).

## 🏗️ Project Structure

```
Odoo_Kahe_Final/
├── frontend/          # React app (Create React App)
│   └── src/
│       ├── pages/     # PosTerminal, Kds, AdminDashboard, Login, Signup...
│       ├── context/   # AuthContext
│       └── utils/     # api.js (Axios instance)
└── backend/           # Express API + MySQL
    ├── controllers/   # Business logic
    ├── routes/        # API routes (all under /api)
    ├── models/        # schema.sql
    ├── config/        # db.js, seed.js
    └── middleware/    # auth.js (JWT)
```

## 🚀 Quick Setup for Teammates

### Prerequisites
- Node.js v18+
- MySQL 8+

### 1. Clone & Install

```bash
git clone <repo-url>
cd Odoo_Kahe_Final

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure the Backend Environment

```bash
cd backend
# Copy the example env and fill in your MySQL credentials
copy .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD    # ← change this
DB_NAME=odoo_cafe_pos
JWT_SECRET=any_long_random_string  # ← change this
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
```

### 3. Create the Database

In MySQL (run this once):
```sql
CREATE DATABASE IF NOT EXISTS odoo_cafe_pos;
```

The backend will **auto-create all tables and seed demo data** on first start.

### 4. Start the Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → Running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# → Opens http://localhost:3000
```

## 🔐 Demo Credentials

| Role     | Email                  | Password  |
|----------|------------------------|-----------|
| Admin    | admin@odoocafe.com     | admin123  |
| Employee | employee@odoocafe.com  | emp123    |

## 📡 API Endpoints

| Method | Endpoint                        | Description                      |
|--------|---------------------------------|----------------------------------|
| POST   | /api/auth/login                 | Login                            |
| POST   | /api/auth/signup                | Register                         |
| GET    | /api/categories                 | List categories                  |
| GET    | /api/products                   | List products                    |
| POST   | /api/orders                     | Create order (3-tier promo)      |
| GET    | /api/orders                     | List active orders (KDS)         |
| PUT    | /api/orders/:id/status          | Advance order status             |
| POST   | /api/orders/:id/pay             | Mark order as paid               |
| GET    | /api/floors                     | List floors                      |
| GET    | /api/tables                     | List tables                      |
| GET    | /api/customers                  | List customers                   |
| POST   | /api/customers                  | Create customer                  |
| GET    | /api/payment-methods            | List payment methods             |
| GET    | /api/coupons                    | List promotions/coupons          |
| POST   | /api/coupons/validate           | Validate a coupon code           |
| GET    | /api/employees                  | List employees                   |
| GET    | /api/sessions/active            | Get active session               |
| POST   | /api/sessions                   | Open a session                   |
| PUT    | /api/sessions/:id/close         | Close a session                  |
| GET    | /api/reports/dashboard          | Admin dashboard metrics          |

## 🖥️ Pages

| Route               | Description                              |
|---------------------|------------------------------------------|
| /pos                | POS Terminal (main cashier view)         |
| /kds                | Kitchen Display System                   |
| /admin              | Admin Dashboard                          |
| /login              | Login page                               |
| /signup             | Employee registration                    |
| /customer-display   | Customer-facing display (second screen)  |

## ⚠️ Common Issues for Teammates

### "Cannot connect to database"
- Make sure MySQL is running
- Check your `backend/.env` — `DB_PASSWORD` must match your MySQL root password
- Make sure the database exists: `CREATE DATABASE odoo_cafe_pos;`

### "Module not found" errors
- Run `npm install` inside both `frontend/` and `backend/` folders

### Frontend shows blank page
- Check the browser console for errors
- Make sure backend is running on port 5000
- Check that `frontend/.env` has `REACT_APP_API_URL=http://localhost:5000` (optional, defaults to 5000)

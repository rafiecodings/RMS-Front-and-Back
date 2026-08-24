# RMS — Restaurant Management System (Monorepo)

Full-stack restaurant management platform.

## Structure

| Path | Stack | Notes |
|---|---|---|
| `restaurant-frontend/` | Next.js · React · TypeScript · Tailwind | POS, Orders, Kitchen, Reservations, Reports & Analytics, AI Demand Forecast UI |
| `restaurant-backend/` | Laravel 12 · PostgreSQL/SQLite · Sanctum | REST API, TimechoAI + Gemini integrations, RBAC |

## Quick start

**Backend**
```bash
cd restaurant-backend
composer install
cp .env.example .env   # then fill in credentials
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

**Frontend**
```bash
cd restaurant-frontend
npm install
npm run dev
```

## AI services
- **TimechoAI** — demand forecasting (`TIMECHO_*` in backend `.env`)
- **Gemini 3.x Flash** — insights/recommendations (`GEMINI_*` in backend `.env`)

Keys live only in `restaurant-backend/.env` (gitignored).

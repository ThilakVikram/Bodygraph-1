# Bodygraph Manager

A professional gym management web application built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma ORM on SQLite.

## Features

- Role-based access for Admin, Receptionist, Trainer, and Member, enforced server-side on every page and Server Action
- Admin dashboard with real database-backed stats and charts (revenue, attendance, membership growth/status, trainer performance, peak hours)
- Member, trainer, membership plan, and membership management with search/filter/sort/pagination
- Attendance tracking with QR code check-in (manual entry, keyboard-wedge scanners, and browser-native camera scanning)
- Payments with printable/PDF receipts (browser print), invoice numbers, and status tracking
- Workout plans, an exercise library, diet plans, and progress tracking with charts and photos
- Internal notifications (including admin announcements) and low-stock inventory management
- Reports with CSV export, a central user directory, branch settings, and an audit log
- Light/dark theme, responsive layout, toasts, and a small reusable UI kit

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and adjust as needed (the defaults work out of the box for local development):

   ```bash
   cp .env.example .env
   ```

3. Apply the database schema and seed demo data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Demo logins (seed data)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@bodygraph.dev` | `Admin@123` |
| Receptionist | `reception@bodygraph.dev` | `Reception@123` |
| Trainer | `trainer@bodygraph.dev` | `Trainer@123` |
| Trainer 2 | `trainer2@bodygraph.dev` | `Trainer@123` |
| Member | `member@bodygraph.dev` | `Member@123` |

Re-run `npm run db:seed` at any time to reset demo data back to this baseline (it wipes and reseeds all tables).

## Useful scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply a Prisma migration |
| `npm run db:seed` | Reset and reseed the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Drop and recreate the database from migrations |

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions, Route Handlers)
- **Prisma ORM 7** with the `@prisma/adapter-better-sqlite3` driver adapter over **SQLite**
- **Tailwind CSS v4** for styling, with light/dark theme tokens in `app/globals.css`
- **Zod** for validation, **Recharts** for charts, **lucide-react** for icons, **qrcode** for QR generation

See [AGENTS.md](./AGENTS.md) for notes on this project's Next.js version and where to find its docs.

# 📊 E-Report Frontend — Next.js 16 Web Client

[![Framework: Next.js 16](https://img.shields.io/badge/Framework-Next.js%2016-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Styling: Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![State Store: Zustand](https://img.shields.io/badge/State-Zustand-orange?style=flat-square)](https://github.com/pmndrs/zustand)
[![Data Fetching: TanStack Query](https://img.shields.io/badge/Data%20Fetching-TanStack%20Query-ff4154?style=flat-square&logo=react-query)](https://tanstack.com/query/latest)

A decoupled, modern Single Page Application (SPA) dashboard built using **Next.js 16 (App Router)** and **TypeScript** for the E-Report Management System. It communicates with a backend Laravel 11 API using stateful cookie-based authentication (Laravel Sanctum).

---

## ✨ Features

- 🔐 **Stateful Authentication**: Login/Logout using Laravel Sanctum cookie-based session with auto-fetching user details on app load (`/auth/me`).
- 📁 **Routing Guards**: Middleware-like protection via `AuthGuard` ensuring unauthenticated users are redirected to `/login`, and vice versa.
- ⚡ **Optimized Search**: Integrated `useDebounce` (400ms delay) on search inputs to limit API payload and avoid server overload.
- 🔄 **Pagination Reset**: Smart search interaction that automatically resets current page indexes to `1` when searching or filtering.
- 🛠️ **Master Data Management**: Full CRUD interfaces for Accounts, Consultations, Attendance, Audit Logs, and Analytics.
- 📊 **Dynamic Charts**: Interactive data visualizations and analytics using `Recharts`.
- 🗺️ **Geo Analytics**: Interactive map view of leads distribution across Indonesian provinces/kabkota using GeoJSON layers.
- 🌓 **Theme Toggle**: Built-in support for Light and Dark modes.

---

## 🛠️ Tech Stack

- **Core**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion (for sleek micro-animations)
- **UI Components**: Shadcn UI & Base UI
- **State Management**: Zustand (for light, atomic store configurations)
- **Data Fetching**: TanStack Query (React Query) for state caching, query validation, and mutations
- **Forms & Validation**: React Hook Form with Zod schema verification

---

## 📂 Folder Structure

```text
e-report-frontend/
├── public/                  # Static assets (images, icons)
├── src/
│   ├── app/                 # Next.js App Router (Pages, layouts)
│   │   ├── accounts/        # Account management pages
│   │   ├── analytics/       # System and consultation analytics
│   │   ├── geo-analytics/   # Geographic map analytics (leads by province/kabkota)
│   │   ├── audit-logs/      # System security logs view
│   │   ├── consultations/   # Consultation CRUD pages
│   │   ├── report-attendances/ # Attendance summary pages
│   │   ├── login/           # Custom login screen
│   │   └── page.tsx         # Dashboard landing page
│   ├── components/          # Reusable UI component library
│   │   ├── layout/          # Sidebar, Header, NotificationCenter, ThemeToggle
│   │   ├── ui/              # Atom level Shadcn components (Button, Input, etc.)
│   │   └── auth-guard.tsx   # Client-side route authorization controller
│   ├── lib/
│   │   ├── api/             # API clients & configuration (Axios Instance)
│   │   ├── hooks/           # Custom React Query hooks (CRUD)
│   │   ├── stores/          # Zustand global stores (e.g. authStore, sidebarStore)
│   │   └── utils.ts         # Utility helper functions
│   └── types/               # TypeScript interfaces & types
├── package.json             # NPM dependencies & scripts
├── tsconfig.json            # TypeScript compile settings
└── next.config.ts           # Next.js configurations
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env.local` file inside the root directory `e-report-frontend/` to connect to the Laravel API:

```env
# URL where Laravel API is running (must match SANCTUM_STATEFUL_DOMAINS configuration in backend)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Application title displayed in layout header
NEXT_PUBLIC_APP_NAME="Home Putra Interior — E-Report"
```

> [!IMPORTANT]
> When running the frontend and backend on different ports or IP addresses (e.g. local area network), make sure the Laravel API `.env` includes:
> - `SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000` (or the respective frontend IP/port)
> - `SESSION_DOMAIN=localhost` (or appropriate shared domain)

---

## 🚀 Installation & Development

### 1. Prerequisite
Ensure that your backend Laravel service is running and accessible.

### 2. Install Dependencies
Navigate into the frontend project directory and install the packages:
```bash
cd e-report-frontend
npm install
```

### 3. Run Development Server
Start the local Next.js dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 4. Build for Production
To generate a compiled, optimized production bundle:
```bash
npm run build
```
To run the built production bundle:
```bash
npm run start
```

---

## 🔐 Sanctum Cookie Authentication Flow

Authentication is managed via cookies to ensure protection against XSS/CSRF:

1. **CSRF Cookie**: The frontend first requests a CSRF token using `/sanctum/csrf-cookie` from the backend API.
2. **Login**: Credentials (email/username & password) are POSTed to `/auth/login`. If valid, the browser stores the session cookie set by Laravel.
3. **Session Check**: The `AuthGuard` checks the session at mount-time by calling `/auth/me`. If authenticated, user data is saved to Zustand (`authStore`) and route is allowed; otherwise redirected back to `/login`.
4. **Subsequent API Requests**: All requests use `{ withCredentials: true }` so that cookies are sent automatically.

---

## 🛡️ Security & Performance Enhancements

- **Debounced Search**: Text inputs on filter bars utilize `useDebounce` with a **400ms delay** before triggering network requests, preserving server resources.
- **Client-Side Validation**: Zod-enforced schemas run during password setups and field edits to provide instant visual feedback to users before sending data.
- **Clean Disconnects**: Destroys cookies and clears Zustand local storage state immediately on Logout commands.

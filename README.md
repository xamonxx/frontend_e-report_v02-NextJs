# E-Report Frontend — Next.js SPA Client

This is the decoupled Next.js frontend built with App Router, TypeScript, Tailwind CSS, Zustand, and TanStack Query. It interacts with the Laravel backend API using stateful cookie-based Sanctum authentication.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 & Shadcn UI
- **State Management**: Zustand
- **Data Fetching & Caching**: TanStack Query (React Query)
- **Forms & Validation**: React Hook Form & Zod
- **Charts**: Recharts

## Prerequisites
Ensure the Laravel backend is running. By default, the frontend expects the backend API at `http://localhost:8000`.

## Installation

```bash
# Navigate to frontend directory
cd e-report-frontend

# Install dependencies
npm install
```

## Running Locally

To run the Next.js frontend local development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

## Production Build

To build the project for production deployment:

```bash
# Build & compile
npm run build

# Start production server
npm run start
```

## Sanctum Cookie Auth Flow
1. The app initializes auth state by calling the `/auth/me` endpoint in `AuthGuard`.
2. If unauthenticated, it redirects the user to `/login`.
3. During login, `useLogin` requests the CSRF cookie (`/sanctum/csrf-cookie`) first, then posts credentials to `/auth/login`.
4. Laravel sets the session cookie. Subsequent API requests are authenticated automatically.

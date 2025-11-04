# EVT - Feuerwehr-Einsatzverwaltungstool

## Overview

EVT (Einsatzverwaltungstool) is a fire department deployment management system for managing personnel, vehicles, mission readiness, and event coordination. It tracks crew qualifications, vehicle assignments, verifies minimum staffing, and manages calendar events with RSVP functionality. The system supports three user roles: Admin (full access), Moderator (event management), and Member (view deployment, readiness, RSVP). Key capabilities include an automatic crew assignment system based on qualifications and vehicle configurations, a unified user/personnel management system, self-service registration, role-based dashboards, availability management with automatic crew reassignment, **real-time push notifications** for assignment changes, **fairness/rotation system** ensuring equitable position distribution with driver positions rotating fastest, **availability templates** for shift-worker patterns (Mo-Fr 08:00-16:00), and **configurable push reminders** for availability status updates.

**Progressive Web App (PWA)**: The application is configured as a PWA, enabling installation on mobile devices (Android, iOS 16.4+) and supporting push notifications. iOS requires installation to home screen for push notification support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite.
**Progressive Web App (PWA)**: 
  - Web App Manifest (`/manifest.json`) for installation
  - Service Worker (`/sw.js`) for push notifications and offline support
  - iOS 16.4+ support with installation instructions in UI
  - Android full support (no installation required)
**UI Component Library**: Shadcn/ui (Radix UI, Tailwind CSS).
**Design System**: "new-york" variant of Shadcn/ui, neutral color palette, drawing from Carbon Design System and Material Design for high information density.
**State Management**: TanStack Query for server state, React Context API for authentication, local component state with React hooks.
**Routing**: Wouter.
**Styling**: Tailwind CSS with custom CSS variables, supports light/dark modes.
**Form Handling**: React Hook Form with Zod validation.
**Push Notifications**: Custom hook (`usePushNotifications`) manages subscription lifecycle, iOS detection, and browser permission handling.

### Backend Architecture

**Runtime**: Node.js with Express.js.
**Language**: TypeScript with ES modules.
**Session Management**: Express-session with server-side session data.
**Authentication**: Session-based, three-tier role system (admin, moderator, member). Middleware (`requireAuth`, `requireAdmin`, `requireModerator`) protects routes. Password storage appears to be plain text (security concern).
**API Design**: RESTful API endpoints under `/api` for authentication, user management (including qualifications, roles, password reset), vehicle management, qualification management, mission info, system settings, staffing verification, calendar events (CRUD, RSVP, export), vehicle configurations (CRUD, import/export), automatic crew assignment, **push notification management** (subscribe, unsubscribe, VAPID public key), **availability templates** (CRUD, apply to week), and **reminder settings** (GET, PATCH).
**Data Layer**: Uses an in-memory storage implementation (`MemStorage`) designed to support database persistence through an `IStorage` interface.
**Push Notifications**: PushNotificationService handles Web Push with VAPID authentication. Automatically detects reassignments when availability changes and sends notifications to affected users (excluding the user who made the change). VAPID keys configurable via environment variables (dev fallback with security warning).
**Fairness/Rotation System**: FairnessScorer class implements position rotation with configurable weights. Tracks assignment history and metrics per user. Scoring combines qualification fit, recency penalty (0-10+ points), scarcity bonus (1.5-3 points), and position weights (Maschinist=3.0, Führung=2.0, Standard=1.0). Batch-loads user data for performance (O(users) instead of O(users × slots) queries). Automatic history tracking after each assignment. Configurable rotation window (default 4 weeks) in settings.
**Availability Templates**: Users can create reusable availability patterns (e.g., "Frühschicht Mo-Fr 08:00-16:00") for recurring schedules. Templates support weekday selection, time ranges, and can be applied to specific weeks.
**Reminder Scheduler**: ReminderScheduler service runs every minute, checking user reminder settings and sending push notifications at configured times (e.g., Sunday 18:00). Prevents duplicate notifications via last_reminder_sent tracking. Configurable per-user (weekdays, time, enabled/disabled).

### Data Storage Solutions

**Current Implementation**: In-memory storage; data is lost on server restart.
**Database Schema Design**: Drizzle ORM schema for PostgreSQL (`shared/schema.ts`) includes:
- **users**: Unified user/personnel model with roles, authentication, names, qualifications (array), and `muss_passwort_aendern` flag.
- **vehicles**: Fire trucks with capacity and call signs.
- **qualifikationen**: 14 predefined qualifications.
- **vehicle_configs**: JSONB storage for flexible vehicle slot requirements and constraints.
- **einsatz**: Mission information.
- **settings**: System configuration including rotation_window (weeks) and rotation_weights (JSONB).
- **termine**: Calendar events with details and creator reference.
- **termin_zusagen**: Event RSVPs.
- **push_subscriptions**: Browser push notification subscriptions (endpoint, p256dh, auth keys).
- **availabilities**: User availability tracking by date with optional time ranges (start_time, end_time) and weekday patterns.
- **availability_templates**: Reusable availability patterns (name, weekdays array, start_time, end_time, status, active flag).
- **user_reminder_settings**: Per-user reminder configuration (reminder_enabled, reminder_time, reminder_weekdays array, last_reminder_sent).
- **current_assignments**: Current vehicle/position assignments with trupp partners, effective_from/to dates, history reference.
- **assignment_history**: Complete assignment audit trail (user_id, vehicle_name, position, assigned_for_date, batch_id, assigned_by).
- **assignment_fairness**: Aggregated per-user metrics (total_assignments, per_position_counts JSONB, last_position, last_assigned_at, rolling_fairness_score).
**Intended Database**: PostgreSQL via Neon serverless.
**Migration Strategy**: Drizzle Kit for schema migrations.

## External Dependencies

**Database Service**: Neon Serverless PostgreSQL (configured, but not actively used).
**Session Storage**: `connect-pg-simple` (suggests PostgreSQL-backed, but currently in-memory).
**Development Tools**: Replit-specific plugins, runtime error overlay, cartographer.
**Build Tools**: Vite (frontend), esbuild (server production), tsx (TypeScript dev).
**UI Dependencies**: Radix UI, Lucide React (icons), date-fns, embla-carousel-react.
**Validation**: Zod, drizzle-zod.
**Push Notifications**: web-push library with VAPID authentication for Web Push API.
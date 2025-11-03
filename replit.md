# EVT - Feuerwehr-Einsatzverwaltungstool

## Overview

EVT (Einsatzverwaltungstool) is a fire department deployment management system for managing personnel, vehicles, mission readiness, and event coordination. It tracks crew qualifications, vehicle assignments, verifies minimum staffing, and manages calendar events with RSVP functionality. The system supports three user roles: Admin (full access), Moderator (event management), and Member (view deployment, readiness, RSVP). Key capabilities include an automatic crew assignment system based on qualifications and vehicle configurations, a unified user/personnel management system, self-service registration, role-based dashboards, and availability management with automatic crew reassignment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite.
**UI Component Library**: Shadcn/ui (Radix UI, Tailwind CSS).
**Design System**: "new-york" variant of Shadcn/ui, neutral color palette, drawing from Carbon Design System and Material Design for high information density.
**State Management**: TanStack Query for server state, React Context API for authentication, local component state with React hooks.
**Routing**: Wouter.
**Styling**: Tailwind CSS with custom CSS variables, supports light/dark modes.
**Form Handling**: React Hook Form with Zod validation.

### Backend Architecture

**Runtime**: Node.js with Express.js.
**Language**: TypeScript with ES modules.
**Session Management**: Express-session with server-side session data.
**Authentication**: Session-based, three-tier role system (admin, moderator, member). Middleware (`requireAuth`, `requireAdmin`, `requireModerator`) protects routes. Password storage appears to be plain text (security concern).
**API Design**: RESTful API endpoints under `/api` for authentication, user management (including qualifications, roles, password reset), vehicle management, qualification management, mission info, system settings, staffing verification, calendar events (CRUD, RSVP, export), vehicle configurations (CRUD, import/export), and automatic crew assignment.
**Data Layer**: Uses an in-memory storage implementation (`MemStorage`) designed to support database persistence through an `IStorage` interface.

### Data Storage Solutions

**Current Implementation**: In-memory storage; data is lost on server restart.
**Database Schema Design**: Drizzle ORM schema for PostgreSQL (`shared/schema.ts`) includes:
- **users**: Unified user/personnel model with roles, authentication, names, qualifications (array), and `muss_passwort_aendern` flag.
- **vehicles**: Fire trucks with capacity and call signs.
- **qualifikationen**: 14 predefined qualifications.
- **vehicle_configs**: JSONB storage for flexible vehicle slot requirements and constraints.
- **einsatz**: Mission information.
- **settings**: System configuration.
- **termine**: Calendar events with details and creator reference.
- **termin_zusagen**: Event RSVPs.
**Intended Database**: PostgreSQL via Neon serverless.
**Migration Strategy**: Drizzle Kit for schema migrations.

## External Dependencies

**Database Service**: Neon Serverless PostgreSQL (configured, but not actively used).
**Session Storage**: `connect-pg-simple` (suggests PostgreSQL-backed, but currently in-memory).
**Development Tools**: Replit-specific plugins, runtime error overlay, cartographer.
**Build Tools**: Vite (frontend), esbuild (server production), tsx (TypeScript dev).
**UI Dependencies**: Radix UI, Lucide React (icons), date-fns, embla-carousel-react.
**Validation**: Zod, drizzle-zod.
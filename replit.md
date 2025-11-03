# EVT - Feuerwehr-Einsatzverwaltungstool

## Overview

EVT (Einsatzverwaltungstool) is a fire department deployment management system designed for managing personnel, vehicles, mission readiness, and event coordination. The application enables fire departments to track crew qualifications, vehicle assignments, verify minimum staffing requirements for emergency responses, and manage calendar events with RSVP functionality.

The system supports three user roles with different access levels:
- **Admin**: Full system access including user role management, vehicle management, personnel management, system settings, and calendar event creation
- **Moderator**: Can create and manage calendar events in addition to member privileges
- **Member**: Can view deployment information, check mission readiness status, and RSVP to calendar events

## Recent Changes (November 2025)

**Self-Service Registration & Role-Based Dashboard (November 3, 2025):**
- Implemented self-service user registration with first name and last name
- New users receive auto-generated username (firstname.lastname) and default password "Feuer123"
- Mandatory password change on first login enforced via `muss_passwort_aendern` flag
- Moved user management and registration from Settings to Kameraden page (Benutzer tab)
- Implemented role-based dashboard views: Members see simplified interface (calendar, basic info), Admins/Moderators see full operational dashboard
- Enhanced security: Password change endpoint validates old password before allowing updates

**Calendar System & Role Management Implementation:**
- Extended user roles from two-tier (admin/member) to three-tier (admin/moderator/member)
- Implemented complete calendar/event management system with RSVP functionality
- Added user role assignment interface for admins
- Created CSV export functionality for calendar events with participant tracking
- Security enhancement: Event creator ID now derived server-side from session to prevent forgery

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**UI Component Library**: Shadcn/ui built on Radix UI primitives, providing accessible, customizable components styled with Tailwind CSS.

**Design System**: Follows the "new-york" variant of Shadcn/ui with a neutral color palette. The design approach draws from Carbon Design System and Material Design principles, adapted for emergency services context with high information density and operational confidence.

**State Management**: 
- TanStack Query (React Query) for server state management, data fetching, and caching
- React Context API for authentication state via `AuthContext`
- Local component state with React hooks

**Routing**: Wouter, a lightweight routing library providing client-side navigation.

**Styling**: Tailwind CSS with custom CSS variables for theming. Supports light/dark modes through CSS custom properties defined in `index.css`.

**Form Handling**: React Hook Form with Zod validation via `@hookform/resolvers`.

### Backend Architecture

**Runtime**: Node.js with Express.js framework.

**Language**: TypeScript with ES modules (`"type": "module"`).

**Session Management**: Express-session with session data stored server-side. Sessions include `userId` for authentication tracking.

**Authentication**: 
- Session-based authentication (no JWT)
- Password storage appears to be plain text in the current implementation (security concern)
- Middleware functions `requireAuth`, `requireAdmin`, and `requireModerator` protect routes
- Three-tier role system: admin (full access), moderator (calendar management), member (read/RSVP access)

**API Design**: RESTful API endpoints under `/api` namespace:
- `/api/auth/*` - Authentication endpoints (login, logout, me, register, change-password)
  - `/api/auth/register` - Self-service registration with vorname/nachname (creates username as firstname.lastname)
  - `/api/auth/change-password` - Password change with old password validation
- `/api/users` - User listing and role management (admin only)
- `/api/users/:id/role` - User role assignment (admin only)
- `/api/vehicles` - Vehicle CRUD operations (admin only)
- `/api/kameraden` - Personnel CRUD operations
- `/api/qualifikationen` - Qualification management (admin only)
- `/api/einsatz` - Mission/deployment information
- `/api/settings` - System settings management (admin only)
- `/api/besetzungscheck` - Staffing verification endpoint
- `/api/termine` - Calendar event CRUD operations (create/update/delete: moderator/admin, read: all authenticated)
- `/api/termine/:id/zusagen` - Event RSVP listing (all authenticated)
- `/api/termine/:id/zusage` - Event RSVP submission (all authenticated)
- `/api/termine/export` - CSV export of events with participant data (all authenticated)

**Data Layer**: Uses an in-memory storage implementation (`MemStorage` class) that implements the `IStorage` interface. The architecture is designed to support database persistence through the interface pattern.

### Data Storage Solutions

**Current Implementation**: In-memory storage using JavaScript Maps for data persistence during runtime. Data is lost on server restart.

**Database Schema Design**: Drizzle ORM schema is defined for PostgreSQL in `shared/schema.ts`:

- **users**: User accounts with roles (admin/moderator/member), authentication credentials, names, and `muss_passwort_aendern` flag for first-login password enforcement
- **vehicles**: Fire trucks/vehicles with crew capacity and radio call signs
- **kameraden**: Crew members with qualification arrays stored as references to qualifikationen table
- **qualifikationen**: Available qualifications/certifications (e.g., TM, AGT, Maschinist)
- **einsatz**: Mission information including keyword (Stichwort), crew requirements
- **settings**: System configuration for shift length and minimum qualification requirements
- **termine**: Calendar events with title, description, date, time, location, and creator reference
- **termin_zusagen**: Event RSVPs linking users to events with status (zugesagt/abgesagt)

**Intended Database**: PostgreSQL via Neon serverless (`@neondatabase/serverless`). The Drizzle configuration points to a PostgreSQL database, but the current implementation uses in-memory storage.

**Migration Strategy**: Drizzle Kit configured for schema migrations with `npm run db:push` command.

### External Dependencies

**Database Service**: 
- Neon Serverless PostgreSQL (configured but not actively used)
- Connection via `DATABASE_URL` environment variable

**Session Storage**: 
- `connect-pg-simple` package suggests PostgreSQL-backed session store capability
- Current implementation uses default in-memory session store

**Development Tools**:
- Replit-specific plugins for development environment (`@replit/vite-plugin-*`)
- Runtime error overlay and cartographer for enhanced debugging

**Build Tools**:
- Vite for frontend bundling and development server
- esbuild for server-side code bundling in production
- tsx for TypeScript execution in development

**UI Dependencies**:
- Comprehensive Radix UI component primitives
- Lucide React for iconography
- date-fns for date manipulation
- embla-carousel-react for carousel functionality

**Validation**:
- Zod for schema validation
- drizzle-zod for generating Zod schemas from Drizzle ORM schemas

**Key Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption (defaults to "dev-secret-change-me")
- `NODE_ENV`: Environment designation (development/production)
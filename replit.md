# EVT - Feuerwehr-Einsatzverwaltungstool

## Overview

EVT (Einsatzverwaltungstool) is a fire department deployment management system designed for managing personnel, vehicles, and mission readiness. The application enables fire departments to track crew qualifications, vehicle assignments, and verify that minimum staffing requirements are met for emergency responses.

The system supports two user roles (admin and member) with different access levels. Admins can manage vehicles, personnel (Kameraden), and system settings, while members can view deployment information and check mission readiness status.

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
- Middleware functions `requireAuth` and `requireAdmin` protect routes

**API Design**: RESTful API endpoints under `/api` namespace:
- `/api/auth/*` - Authentication endpoints (login, logout, me)
- `/api/vehicles` - Vehicle CRUD operations
- `/api/kameraden` - Personnel CRUD operations
- `/api/einsatz` - Mission/deployment information
- `/api/settings` - System settings management
- `/api/besetzungscheck` - Staffing verification endpoint

**Data Layer**: Uses an in-memory storage implementation (`MemStorage` class) that implements the `IStorage` interface. The architecture is designed to support database persistence through the interface pattern.

### Data Storage Solutions

**Current Implementation**: In-memory storage using JavaScript Maps for data persistence during runtime. Data is lost on server restart.

**Database Schema Design**: Drizzle ORM schema is defined for PostgreSQL in `shared/schema.ts`:

- **users**: User accounts with roles (admin/member), authentication credentials
- **vehicles**: Fire trucks/vehicles with crew capacity and radio call signs
- **kameraden**: Crew members with qualification arrays (TM, AGT, Maschinist, GF, Sprechfunker, San)
- **einsatz**: Mission information including keyword (Stichwort), crew requirements
- **settings**: System configuration for shift length and minimum qualification requirements

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
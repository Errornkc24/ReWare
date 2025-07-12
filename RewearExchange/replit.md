# ReWear - Sustainable Fashion Exchange Platform

## Overview

ReWear is a full-stack web application for sustainable fashion exchange, built with React frontend and Express backend. The platform allows users to list clothing items, browse available items, and create swap requests using a points-based system. It promotes sustainable fashion practices by enabling users to exchange clothes rather than buying new ones.

## Recent Changes

### Admin Panel Enhancement (January 2025)
- Complete redesign of admin interface with distinct visual identity
- Added gradient header with shield icon and admin branding
- Enhanced dashboard with better stats cards (4 columns with color-coded borders)
- Implemented tabbed interface with Pending Items, Overview, and Settings
- Added professional loading states and improved empty states
- Distinguished admin navigation with shield emoji and purple color scheme
- Enhanced mobile navigation for admin access

### Authentication System Fixed (December 2024)
- Fixed JWT token authentication by updating apiRequest and getQueryFn functions
- Tokens are now properly included in Authorization headers for all authenticated requests
- Resolved "Invalid token" and "Access token required" errors
- Users can now successfully list items, access dashboard, and make swap requests
- Fixed login/register redirect functionality to properly redirect to dashboard

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context API for authentication, TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom eco-friendly color palette

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Uploads**: Multer for handling image uploads
- **Authentication**: JWT-based authentication with bcrypt for password hashing

## Key Components

### Database Schema
- **Users**: User accounts with email, password, points balance, and admin status
- **Items**: Clothing items with details like title, description, category, condition, images, and point value
- **Swaps**: Exchange requests between users with status tracking

### Authentication System
- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control (admin/user)
- Protected routes for authenticated users

### File Upload System
- Image upload functionality for item photos
- File type validation (JPEG, PNG, GIF)
- Size limits (10MB per file)
- Multiple image support per item

### Points System
- Users start with 100 points
- Items have assigned point values
- Swaps can be made with points or item exchanges
- Points are transferred between users during successful swaps

## Data Flow

### User Registration/Login
1. User submits credentials
2. Backend validates and hashes password
3. JWT token generated and returned
4. Frontend stores token and updates auth context

### Item Listing
1. User uploads item with images and details
2. Images processed and stored via Multer
3. Item saved to database with "pending" status
4. Admin approval required before item becomes available

### Swap Process
1. User browses available items
2. Creates swap request with points or item offer
3. Item owner receives notification
4. Owner can accept/decline the swap
5. Upon acceptance, points transfer and item availability updates

## External Dependencies

### Frontend Dependencies
- **@radix-ui/react-***: UI component primitives
- **@tanstack/react-query**: Server state management
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing library
- **lucide-react**: Icon library

### Backend Dependencies
- **@neondatabase/serverless**: PostgreSQL database connector
- **drizzle-orm**: TypeScript ORM
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token handling
- **multer**: File upload middleware
- **express**: Web framework

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution
- **esbuild**: Fast bundler for production builds

## Deployment Strategy

### Build Process
1. Frontend builds to `dist/public` directory
2. Backend builds to `dist` directory using esbuild
3. Single deployable artifact contains both frontend and backend

### Environment Configuration
- Database URL required for PostgreSQL connection
- JWT secret for token signing
- Development vs production environment handling

### Database Migration
- Drizzle Kit for database schema management
- `db:push` command for applying schema changes
- PostgreSQL as the target database dialect

### Server Configuration
- Express serves static files in production
- Vite dev server integration in development
- Error handling middleware for API routes
- Request logging for API endpoints

### File Structure
- `client/`: React frontend application
- `server/`: Express backend application
- `shared/`: Shared TypeScript types and schemas
- `migrations/`: Database migration files
- Monorepo structure with shared dependencies
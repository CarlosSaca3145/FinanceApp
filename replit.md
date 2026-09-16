# Overview

This is a **Brand Campaign Manager** web application built for managing brand outreach campaigns and email automation. The application allows users to manage brand contacts, create email templates, and send personalized outreach emails. It's designed specifically for campaign management workflows, enabling users to track brands through different stages of outreach (pending, sent, responded, etc.) and manage content templates for different industry niches.

The system provides a dashboard for campaign oversight, brand management capabilities, and template management for consistent email communications across different market segments.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## September 20, 2025 - AI Content Generation Optimization
- **Optimized AI idea generation**: Reduced response time from 33+ seconds to ~2.4 seconds using optimized prompts and token limits
- **Enhanced content workflow**: AI now uses existing email templates as base and only generates content sections instead of full emails
- **Added custom suggestion feature**: Prominent field allowing users to guide AI generation with "Get Ideas Based on This" and "Use Directly" options
- **Implemented concise AI responses**: Ideas are now 2-3 lines maximum instead of long paragraphs
- **Fixed OpenAI API compatibility**: Resolved multiple GPT-5 API issues including temperature, max_completion_tokens, and JSON format requirements

# System Architecture

## Frontend Architecture

The frontend is built with **React 18** using **TypeScript** and **Vite** as the build tool. The application follows a modern React architecture with:

- **Component-based design** using React functional components and hooks
- **shadcn/ui component library** providing consistent, accessible UI components
- **Tailwind CSS** for styling with a custom design system using CSS variables
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** for server state management and caching
- **React Hook Form** with Zod validation for form handling
- **Radix UI primitives** as the foundation for the component library

The frontend structure separates concerns with dedicated directories for components, pages, hooks, and utilities. The UI components are built on Radix primitives, ensuring accessibility and consistent behavior.

## Backend Architecture

The backend uses **Express.js** with **TypeScript** running on **Node.js**. The architecture emphasizes:

- **RESTful API design** with clear endpoint organization
- **Modular route handling** separating different resource endpoints
- **Storage abstraction layer** allowing for flexible data persistence implementations
- **Service layer pattern** for business logic separation (email services)
- **Middleware integration** for logging, error handling, and request processing

The server includes development tooling with Vite integration for hot module replacement during development, and production build optimization using esbuild.

## Data Storage Solutions

The application uses **Drizzle ORM** with **PostgreSQL** as the primary database:

- **Type-safe database operations** through Drizzle's TypeScript integration
- **Schema-first approach** with shared type definitions between client and server
- **Migration management** through drizzle-kit
- **Connection handling** via Neon Database serverless PostgreSQL
- **In-memory storage implementation** for development/testing scenarios

The database schema includes tables for users, brands, content templates, followup templates, and email logs, with proper relationships and constraints.

## Authentication and Authorization

Currently implements a **basic user system** with:

- **User authentication** through username/password
- **Session-based authentication** (infrastructure present but not fully implemented in current codebase)
- **Prepared for expansion** with existing user schema and authentication hooks

## External Service Integrations

**Email Service Integration:**
- **Nodemailer** for email sending capabilities
- **Gmail/SMTP support** with environment-based configuration
- **HTML email generation** with dynamic content templating
- **Email logging and tracking** for campaign analytics

**Development Tools:**
- **Replit integration** with specialized development plugins
- **Vite development server** with hot module replacement
- **TypeScript compilation** and type checking

The architecture is designed for scalability and maintainability, with clear separation of concerns between frontend presentation, backend business logic, and data persistence layers. The use of TypeScript throughout ensures type safety and better developer experience, while the modular design allows for easy extension and modification of functionality.

# External Dependencies

## Database and ORM
- **PostgreSQL** - Primary database via Neon Database serverless
- **Drizzle ORM** - Type-safe database operations and schema management
- **connect-pg-simple** - PostgreSQL session store for Express sessions

## UI and Styling
- **Radix UI** - Comprehensive set of accessible UI primitives
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Pre-built component library built on Radix UI
- **Lucide React** - Icon library for consistent iconography
- **class-variance-authority** - Utility for creating variant-based component APIs

## Frontend State and Routing
- **TanStack React Query** - Server state management and caching
- **Wouter** - Lightweight client-side routing
- **React Hook Form** - Form state management and validation
- **Zod** - Runtime type validation and schema validation

## Email Services
- **Nodemailer** - Email sending library with SMTP/Gmail support
- **@sendgrid/mail** - SendGrid email service integration (available but not actively used)

## Development and Build Tools
- **Vite** - Build tool and development server
- **esbuild** - JavaScript/TypeScript bundler for production builds
- **tsx** - TypeScript execution for Node.js development
- **@replit/vite-plugin-runtime-error-modal** - Replit-specific error handling
- **@replit/vite-plugin-cartographer** - Replit development enhancements
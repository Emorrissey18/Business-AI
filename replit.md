# AI Business Assistant

## Overview

This is a full-stack TypeScript application that provides AI-powered business document analysis and goal tracking. The system combines document processing, artificial intelligence insights, and goal management to help businesses make data-driven decisions.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **AI Integration**: OpenAI API for document analysis and insights
- **File Processing**: Multer for file uploads with support for PDF, TXT, and DOCX files
- **Session Management**: PostgreSQL-based session storage

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state
- **UI Components**: Radix UI with custom styling
- **Styling**: Tailwind CSS with custom design system

### Data Storage
- **Primary Database**: PostgreSQL (via Neon Database)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema**: Centralized schema definition in `shared/schema.ts`
- **File Storage**: Local file system for temporary uploads

## Key Components

### Database Schema
- **Users**: Authentication and user management
- **Documents**: File metadata, content, and processing status
- **Goals**: Business goals with progress tracking
- **AI Insights**: AI-generated insights linked to documents

### Core Services
- **File Processor**: Handles document uploads and text extraction
- **OpenAI Service**: Analyzes documents and generates business insights
- **Storage Layer**: Abstracted database operations with in-memory fallback

### Frontend Components
- **Document Management**: Upload, list, and view documents
- **Goal Tracking**: Create, update, and monitor business goals
- **AI Insights**: Display AI-generated business recommendations
- **Dashboard**: Overview of key metrics and recent activity

## Data Flow

1. **Document Upload**: Users upload documents through the file upload component
2. **Text Extraction**: Server processes files and extracts text content
3. **AI Analysis**: OpenAI API analyzes document content for business insights
4. **Storage**: Document metadata, content, and insights are stored in PostgreSQL
5. **Frontend Updates**: React Query manages cache invalidation and UI updates
6. **Goal Tracking**: Users can create and track business goals independently

## External Dependencies

### AI Services
- **OpenAI API**: Document summarization and business insight generation
- **Model**: GPT-4o for advanced text analysis

### Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Connection**: @neondatabase/serverless driver

### File Processing
- **Multer**: File upload handling
- **Supported Formats**: PDF, TXT, DOCX (10MB limit)

### UI Framework
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

## Deployment Strategy

### Development
- **Environment**: NODE_ENV=development
- **Server**: tsx with hot reloading
- **Client**: Vite dev server with HMR
- **Database**: Drizzle push for schema changes

### Production
- **Build Process**: Vite build for client, esbuild for server
- **Server Bundle**: ESM format with external packages
- **Static Assets**: Served from dist/public
- **Database**: Drizzle migrations for schema management

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `NODE_ENV`: Environment mode (development/production)

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 08, 2025. Initial setup
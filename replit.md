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
- **Tasks**: Task management with status, priority, and due dates
- **Calendar Events**: Event scheduling with all-day and timed support
- **Conversations**: Chat conversation management
- **Messages**: Chat message storage with role-based organization

### Core Services
- **File Processor**: Handles document uploads and text extraction
- **OpenAI Service**: Analyzes documents and generates business insights
- **Storage Layer**: Abstracted database operations with in-memory fallback

### Frontend Components
- **Document Management**: Upload, list, and view documents
- **Goal Tracking**: Create, update, and monitor business goals
- **AI Insights**: Display AI-generated business recommendations
- **Dashboard**: Overview of key metrics and recent activity
- **Calendar System**: Full-featured calendar with event management
- **Task Management**: Kanban-style task board with status tracking
- **Chat Interface**: AI assistant with context-aware responses

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
- July 08, 2025. Fixed chat feature routing and conversation flow issues
- July 08, 2025. Implemented complete tasks management system with:
  - Database integration with PostgreSQL
  - Task creation modal with form validation
  - Kanban-style task board (Pending, In Progress, Completed)
  - Task status toggling and deletion
  - Priority levels (high, medium, low) and due date support
  - Backend API routes for full CRUD operations
- July 08, 2025. Enhanced AI assistant with comprehensive data access:
  - AI now has access to all tasks, goals, documents, and insights
  - Context-aware responses that reference specific business data
  - Calendar events system foundation (storage layer implemented)
  - Improved business analysis and planning capabilities
  - Fixed date handling issues across all entities (tasks, goals, calendar events)
- July 08, 2025. Complete calendar/event system implementation:
  - Full CRUD API for calendar events (/api/calendar-events)
  - Interactive calendar interface with weekly view
  - Event creation modal with form validation
  - All-day and timed event support
  - Event deletion and management
  - Calendar events integrated into AI assistant context
  - Weekly navigation with Today button
  - Upcoming events sidebar with event details
- July 08, 2025. AI assistant task and goal modification capabilities:
  - AI can now update task statuses (pending, in_progress, completed)
  - AI can update goal progress percentages (0-100)
  - Function calling integration with OpenAI API
  - New API endpoints: /api/ai/update-task-status and /api/ai/update-goal-progress
  - AI actions executed automatically when requested by user or deemed helpful
  - Enhanced AI system message to explain available actions
- July 08, 2025. Fixed critical application startup issues:
  - Resolved TypeScript compilation errors preventing app loading
  - Fixed DOM nesting warnings (button-in-button) that caused runtime failures
  - Corrected CSS class references for proper styling
  - Stabilized workflow execution and server startup process
  - App now consistently loads with full functionality
- July 08, 2025. Fixed AI goal update functionality:
  - Corrected OpenAI function calling implementation with proper tools parameter
  - Enhanced goal identification by including goal IDs in AI context data
  - Improved system prompts to ensure AI uses function calls for data modifications
  - Fixed response handling for tool calls to provide proper user feedback
  - AI now correctly identifies goals by title and updates the right goal progress
- July 08, 2025. Resolved AI function calling consistency issues:
  - Fixed critical bug where AI would calculate progress correctly but not call update functions
  - Strengthened system prompts with explicit function calling requirements
  - Added concrete examples of when to use functions (revenue changes, task completions)
  - Eliminated misleading "updating now" language without actual function calls
  - AI now consistently calls update_goal_progress and update_task_status functions
  - Function calls work reliably for natural language requests about progress changes
- July 08, 2025. Fixed goal progress capping and consistency issues:
  - Resolved "two-try" function calling problem - AI now calls functions immediately in first response
  - Implemented automatic progress capping at 100% on backend (/api/ai/update-goal-progress)
  - Enhanced AI prompts to eliminate "updating now" delays without actual function calls
  - Goal progress now correctly shows 100% maximum even when targets are exceeded
  - Function calls now work consistently on first attempt for all progress updates
- July 08, 2025. Added goal editing functionality:
  - Created EditGoalModal component for comprehensive goal editing
  - Added ability to edit goal title, description, target date, and status
  - Implemented manual progress percentage adjustment with slider control
  - Added edit button to each goal in the goal tracker
  - Full CRUD operations now available for goals (create, read, update, delete)
  - Progress slider provides precise control from 0% to 100%
- July 08, 2025. Implemented complete Financial Records Management system:
  - Full CRUD operations for financial records (income, expense, investment tracking)
  - Categorized transactions with predefined categories for each type
  - Financial summary dashboard showing total income, expenses, investments, and net cash flow
  - Advanced filtering and search capabilities by type, category, and description
  - Proper currency formatting and date handling with PostgreSQL backend
  - Fixed date validation issues and duplicate key warnings in category selection
  - Complete API integration with /api/financial-records endpoints
- July 08, 2025. Implemented AI-powered data correlation system:
  - AI Correlation Engine that analyzes relationships between financial records, goals, and tasks
  - Automatic data linking when financial records are added
  - Business Intelligence Dashboard with real-time AI insights
  - Smart recommendations based on financial patterns and goal alignment
  - Revenue-based goal progress calculation using actual financial data
  - Background processing for correlation analysis
  - API endpoints: /api/ai/business-insights and /api/ai/correlations
  - Fixed goal tracking to calculate accurate progress based on revenue targets
  - AI agent now properly updates goal progress using mathematical calculations
- July 08, 2025. Fixed custom category validation system:
  - Resolved form validation bug preventing custom category creation
  - Modified form schema to make category field optional for custom inputs
  - Enhanced error handling and real-time validation clearing
  - Applied fixes to both financial records and goals modals
  - Users can now successfully create custom categories like "R&D", "Consulting", etc.
  - Custom categories work seamlessly with AI correlation system
- July 08, 2025. Updated edit modals with new revenue/expense/other system:
  - Replaced "Total Income" with "Total Revenue" throughout application
  - Updated edit financial record modal to use revenue/expense/other instead of income/investment
  - Added custom category support to edit financial record modal
  - Enhanced edit goal modal with type and category fields matching financial records
  - Both edit modals now support custom categories with "Other" option
  - AI financial analysis system analyzes performance indicators and adjusts totals automatically
  - Added AI insights panel showing revenue growth, expense efficiency, and profit margins
- July 08, 2025. Fixed financial calculations and terminology:
  - Fixed date formatting error in edit financial record modal
  - Updated backend to properly handle date string conversion
  - Fixed database storage layer to process date objects correctly
  - Changed "Net Cash Flow" to "Net Profit" throughout application
  - Updated profit calculation: Net Profit = Revenue - Expenses (excludes investments/funding)
  - AI analysis now correctly excludes funding from profit calculations
  - Only true business revenue counts toward profit, not investment or funding
- July 08, 2025. Attempted intelligent context filtering implementation:
  - Created contextBuilder.ts service for relevance-based data filtering with topic extraction
  - Implementation had module import issues preventing AI responses from working
  - Reverted to original context building system to restore AI functionality
  - System now works with original bulk data loading approach
  - Future context filtering improvements need proper module structure
- July 08, 2025. Fixed AI financial data access and formatting:
  - Added financial records to AI context data in routes.ts
  - Enhanced AI system message with financial summary calculations
  - AI now has access to total revenue, expenses, net profit, and recent financial records
  - Financial data is automatically calculated and included in every AI response context
  - AI can now answer revenue growth questions using actual financial data
  - Fixed currency calculation bug (AI was showing $70,000 instead of $700)
  - Corrected database amounts conversion from cents to dollars (amount / 100)
  - Eliminated LaTeX formatting in AI responses for cleaner, readable math
  - AI now shows calculations like "Required Growth = $400,000 - $700 = $399,300" instead of complex LaTeX notation
- July 09, 2025. Migration from Replit Agent to standard Replit environment completed:
  - Migrated project successfully from Agent environment to standard Replit
  - Enhanced database schema with targetAmount field for goals (revenue/expense targets)
  - Implemented intelligent auto-correlation system that connects financial data to goals/tasks
  - Financial records now automatically trigger AI analysis and update related goal progress
  - Revenue-based goals calculate progress automatically: progress = (current_revenue / target_amount) * 100
  - Expense-based goals track budget adherence: progress = (target - actual) / target * 100
  - Real-time data synchronization across all tabs (financial, goals, tasks, calendar)
  - AI correlation engine analyzes relationships and updates progress immediately
  - System demonstrates 60% goal completion when $60k logged against $100k revenue target
- July 09, 2025. Business Context Management System Implementation:
  - Added comprehensive business context database schema with 8 sections (structure, goals, problems, risks, opportunities, strengths, weaknesses, other)
  - Built complete CRUD API endpoints (/api/business-context) with proper validation
  - Created intuitive frontend interface with context cards grouped by business sections
  - Enhanced AI assistant to include business context in all conversations and decision-making
  - AI now has long-term memory about business information that persists across conversations
  - Business context includes priority levels (high/medium/low) and active status tracking
  - Frontend shows stats dashboard with total contexts, high priority count, and section breakdown
  - Successfully tested with sample business context data demonstrating full functionality
- July 09, 2025. Standardized Navigation Layout and Added Customizable Tab Ordering:
  - Fixed layout inconsistency issues where different pages used different container structures
  - Standardized all pages to use "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" container styling
  - Changed "Dashboard" tab name to "Assistant" as requested
  - Implemented drag-and-drop tab reordering functionality with localStorage persistence
  - Added "Customize Tabs" mode with grip icons and visual feedback during drag operations
  - Users can now personalize their navigation tab order which persists across browser sessions
  - Added "Reset Order" option to restore default tab arrangement
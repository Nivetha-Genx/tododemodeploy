# PM-Todo Frontend

A production-grade multi-tenant, role-based productivity and delivery management platform (Jira Kanban-style + productivity governance).

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix + Tailwind)
- **Styling**: Tailwind CSS
- **State**: Zustand (UI only)
- **Drag & Drop**: @dnd-kit
- **Charts**: Recharts
- **Icons**: lucide-react

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Features

- **Role-based Access**: Admin, Team Lead, Staff roles with different permissions
- **Kanban Board**: Drag-and-drop task management with configurable columns
- **Productivity Tracking**: Daily hours logging, productivity metrics
- **Due Date Governance**: Request/approval workflow for deadline changes
- **Analytics**: Burndown charts, velocity tracking, utilization reports

## Project Structure

```
src/
├── components/
│   ├── ui/       # shadcn/ui components
│   └── layout/   # App shell (Sidebar, Header)
├── features/
│   ├── auth/     # Login
│   ├── dashboard/# Dashboard screens
│   ├── boards/   # Kanban board
│   ├── tasks/    # Task list & detail
│   ├── reports/  # Analytics charts
│   ├── team/     # Team management
│   └── settings/ # User settings
├── stores/       # Zustand stores
├── mock/         # Mock data (replace with API)
└── types/        # TypeScript types
```

## Demo Credentials

Login with any email/password and select a role:
- **Admin**: Full system access
- **Team Lead**: Team management + approvals
- **Staff**: Individual contributor

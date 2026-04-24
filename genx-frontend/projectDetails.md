# SPEC-1-Todoist-like Project Management App

## Background

The Genx platform is evolving from a Todoist-style task manager into a **governed productivity and delivery management system** for software organizations.

### Purpose of the System
The purpose of this system is to provide a **centralized, transparent, and auditable task management and productivity tracking platform** that:
- Replicates **Jira Kanban core workflows**
- Enforces **strict productivity governance**
- Tracks **daily work hours and utilization**
- Captures **reasons for delays and deadline changes**
- Provides **management-grade analytics and reporting**

The system is designed to ensure:
- **Daily 8-hour productivity accountability** (configurable)
- **Accurate deadline adherence**
- **Mandatory delay justification**
- **Clear visibility into individual, team, and organizational performance**

---

## Requirements

> Updated requirements based on productivity governance, Kanban workflows, and analytics.

### Must Have (MoSCoW: Must)
- Organization-based multi-tenant architecture
- Role-based access control with configurable roles
- Kanban boards with configurable columns
- Tasks and unlimited subtasks
- Hour estimation and immutable hour logging
- Daily productivity validation (expected vs actual hours)
- Approval-based due date change workflow
- Mandatory delay reason capture
- Immutable audit history
- Individual, team, and management dashboards
- Exportable reports (PDF, Excel, CSV)

### Should Have (MoSCoW: Should)
- Weekly and monthly productivity analytics
- Resource utilization metrics
- Performance scoring and rankings
- Attachment support in comments
- Mentions and notifications

### Could Have (MoSCoW: Could)
- Advanced trend analytics
- Predictive delay risk indicators
- SLA-based alerts

### Won’t Have (MoSCoW: Won’t – v1)
- Automated sprint planning
- AI-based task estimation
- Offline-first web support

---


> _MoSCoW prioritization for v1 frontend, based on confirmed multi-tenant backend._

### Must Have
- User authentication (login, register, refresh session)
- Multi-tenant support (user can belong to multiple tenants)
- Tenant selection and switching after login
- Tenant context derived from JWT claims
- Project CRUD within active tenant
- Task CRUD within projects
- Task completion, subtasks
- Task assignment to tenant members
- Comments on tasks
- Protected routes based on authentication

### Should Have
- Inbox (all assigned tasks across projects in tenant)
- Due dates and priority display
- Basic time tracking (start/stop)
- Member management (invite, list members)
- Responsive web UI (desktop + tablet)

### Could Have
- Calendar view
- Reminders UI
- Keyboard shortcuts
- Light/dark theme

### Won't Have (v1)
- Advanced admin analytics dashboards
- Mobile native apps
- Offline-first support

---


_## Method

### Roles & Permission Model (Updated)

Roles can be **created and managed by Super Admin and Admin**.

#### 1. Admin
**Capabilities**:
- Create and manage Kanban boards
- Invite and manage users
- Assign team members
- Change any task due date
- Approve / reject due date change requests
- Lock / unlock users
- Configure expected working hours (default: 8 hrs/day)
- View all dashboards and reports

#### 2. Team Lead
**Capabilities**:
- Create and assign tasks
- Approve due date change requests
- View team dashboards
- Review delay reasons
- View team productivity and utilization reports
- Comment on and update any team task

#### 3. Staff / Individual Contributor
**Capabilities**:
- Create tasks and subtasks
- Assign tasks to self or team members
- Log work hours daily
- Comment on tasks
- View personal dashboard
- Request due date changes with mandatory reason

**Restrictions**:
- Cannot close a main task unless all subtasks are completed
- Cannot change due dates directly

---

### Kanban Board Management

#### FR-1: Kanban Board Creation
- Admin can create multiple boards per organization
- Board columns configurable:
  - Backlog
  - To Do
  - In Progress
  - Review
  - Blocked
  - Done

#### FR-2: Board Invitations
- Admin can invite users to boards
- Users must accept invitation
- Board access can be revoked

---

### Task & Subtask Management

#### FR-3: Task Creation
Each task includes:
- System-generated Task ID (e.g., `GEN-0001, GEN-0002, GEN-0003`)
- Title (mandatory)
- Rich text description
- Start date (mandatory)
- Due date (mandatory)
- Estimated hours
- Assigned user(s)
- Priority (Low / Medium / High / Critical)
- Status (Kanban column)
- Created date & creator
- Daily logged hours

**Rule**: Once created, due date cannot be changed by Staff.

#### FR-4: Subtask Management
- Unlimited subtasks per task
- Same fields as task
- Auto-sum estimated hours to parent task
- Parent task cannot be closed unless all subtasks are `Done`

---

### Time Tracking & Productivity

#### FR-5: Hour Logging
- Staff logs hours daily per task/subtask
- Fields:
  - Date
  - Time spent (hh:mm)
  - Work description
- Logged hours are immutable after submission
- Only Admin can edit logged hours

#### FR-6: Productivity Validation
System calculates per user per day:
- Total logged hours
- Expected hours (default 8, configurable per user/org)
- Overtime (> expected)
- Underutilization (< expected)

Productivity status:
- Productive (≥ expected)
- Underutilized (< expected)
- Overutilized (> expected)

---

### Due Date Control & Delay Management

#### FR-7: Due Date Change Request
- Staff submits request with:
  - Reason for delay (mandatory)
  - Proposed new due date

#### FR-8: Approval Workflow
- Team Lead/Admin can approve, reject, or modify date
- All actions logged with approver, timestamp, remarks

#### FR-9: Delay Tracking
- Tasks overdue are auto-flagged
- Delay reason becomes mandatory
- Delay frequency tracked per user

---

### Comments, Attachments & Audit

#### FR-10: Comments
- Comments on tasks and subtasks
- Supports mentions and attachments
- Timestamped entries

#### FR-11: Audit History
- Immutable, read-only audit trail
- Tracks:
  - Status changes
  - Assignee changes
  - Due date changes
  - Hour logs
  - Comments
  - Approval actions

---

### Dashboards & Analytics

#### Individual Dashboard
- Daily task list
- Completion percentage
- Logged vs expected hours
- Overdue and carry-forward tasks
- Date selector for historical views
- Extra hours require admin approval to reflect in dashboard

#### Team Lead Dashboard
- Team task status
- Member-wise hours
- Pending approvals
- Delayed tasks

#### Management Dashboard
- Daily metrics (tasks, hours, productivity)
- Weekly & monthly analytics
- Resource utilization
- Delay frequency
- Top & under performers
- Productivity and deadline trends

---

### Advanced Reporting & Analytics (Extended)

Admins and Team Leads can access **advanced reporting modules** to support delivery forecasting and performance analysis.

Capabilities:
- **Burndown charts** (task count & hours)
- **Velocity tracking** per team and sprint
- **Sprint planning reports** (planned vs completed work)
- **Performance reports** filterable by:
  - Date range (day / week / month / custom)
  - Team
  - Individual user
- Exportable reports:
  - PDF
  - Excel
  - CSV

---

### Custom Status Workflows

- Admins can create, edit, delete, and reorder **custom status columns**
- Default workflow provided:
  - Backlog → To Do → In Progress → Review → Blocked → Done
- Custom workflows may include:
  - QA
  - UAT
  - Ready for Release

Rules:
- Status changes are fully audited
- Custom statuses apply per board

---


### Reporting

**Standard Reports**:
- Daily Productivity Report
- Weekly Utilization Report
- Task Completion Report
- Delay & Reason Analysis
- Resource Performance Scorecard

**Export Formats**:
- PDF
- Excel
- CSV

---

### Frontend Architecture (Authoritative)

This section defines the **frontend architecture** for the Genx Todo App, fully aligned with the backend documents (DB design, API spec, real-time model, and multi-tenant rules).

---

### 1. Application Type & Stack

- **Type**: Single Page Application (SPA)
- **Framework**: React + TypeScript
- **Build tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Server state**: TanStack React Query
- **Forms**: React Hook Form + Zod
- **API client**: OpenAPI-generated TypeScript client
- **Real-time**: Socket.IO client

---

### 2. Core Frontend Concepts

#### 2.1 Auth Context
Responsibilities:
- Store JWT access token (memory-first)
- Decode JWT claims (`user_id`, `organization_id`, `role`)
- Expose auth state (`authenticated | anonymous`)

```ts
AuthState = {
  userId: string
  organizationId: string
  role: 'super_admin' | 'admin' | 'member'
}
```

---

#### 2.2 Tenant Context (Multi-Tenant)

- **No manual tenant selection UI**
- Organization (tenant) is **fully derived from JWT login response**
- Login response includes `organization_id` and organization object

Rules:
- Super Admin → no tenant context until explicitly operating on an organization
- Admin/Member → exactly one active organization

Responsibilities:
- Read `organization_id` from `/auth/login` or `/auth/me`
- Block app access if `organization_id` is missing (except super_admin)

```ts
TenantContext = {
  organizationId: string | null
}
```

---


#### 2.3 API Client Layer

- Generated from `openapi.yaml`
- JWT attached via request interceptor
- Tenant resolved server-side

```ts
axios.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${token}`
  return config
})
```

---

### 3. State Management Strategy

| Concern | Solution |
|------|---------|
| Auth state | React Context |
| Tenant state | React Context |
| Server data | React Query |
| Real-time updates | WebSocket → cache update |
| UI state | Local component state |

**Rule:** All tenant-scoped queries must be invalidated on logout.

---

### 4. Routing & Guards

```text
/ login
/ register

/ app  (protected)
  ├── dashboard
  ├── inbox
  ├── today
  ├── upcoming
  ├── projects
  │     └── :projectId
  ├── calendar
  ├── completed
  ├── admin (role=admin)
  │     ├── dashboard
  │     ├── members
  │     └── reports
  └── settings
        ├── profile
        ├── organization
        └── integrations
```

Route guards:
- `AuthGuard` → requires JWT
- `RoleGuard` → admin-only pages

---

### 5. Feature-Based Folder Structure

```text
src/
 ├── app/
 │    ├── providers/
 │    │     ├── AuthProvider.tsx
 │    │     ├── TenantProvider.tsx
 │    │     ├── QueryProvider.tsx
 │    │     └── SocketProvider.tsx
 │    ├── routes/
 │    └── layout/

 ├── features/
 │    ├── auth/
 │    ├── projects/
 │    ├── tasks/
 │    │     ├── subtasks/
 │    │     ├── comments/
 │    │     ├── timelogs/
 │    │     └── reminders/
 │    ├── calendar/
 │    ├── admin/
 │    └── realtime/

 ├── api/
 │    └── generated/

 ├── shared/
 │    ├── components/
 │    ├── hooks/
 │    └── utils/

 └── main.tsx
```

---

### 6. Real-Time Integration Model

- Single Socket.IO connection per authenticated session
- Socket authenticated using JWT
- Server auto-scopes events by organization

Subscribed rooms:
- `user:{userId}`
- `organization:{organizationId}`
- `project:{projectId}` (on project view)

Event handling rules:
- Update zustand UI state for ephemeral changes
- Invalidate React Query caches for authoritative refresh

```ts
socket.on('task.updated', () => {
  queryClient.invalidateQueries({ queryKey: ['tasks'] })
})
```

---


### 7. UI Composition Model

- **Task List** → virtualized list
- **Task Editor** → side drawer modal
- **Comments** → timeline layout
- **Time Tracking** → inline start/stop controls

---

### 8. Non-Goals (Frontend v1)

- Offline-first sync
- Cross-organization switching UI
- White-label theming

---

## UI Flow & Screen Contracts (Authoritative)

This section defines **screen-level responsibilities**, navigation rules, and API contracts. It is derived directly from backend API, web app guide, and mobile app guide.

---

### 1. Authentication Flow

#### Login Screen (`/login`)

Responsibilities:
- Password login
- OTP login (invited users)

API:
- `POST /auth/login`

Redirect logic:
- `must_change_password = true` → `/change-password`
- `role = admin && org_setup_completed = false` → `/organization-setup`
- `role = super_admin` → `/super-admin`
- else → `/dashboard`

---

#### Change Password (`/change-password`)

API:
- `POST /auth/change-password`

Rules:
- Mandatory for OTP users
- Mandatory before organization setup

---

#### Organization Setup (Admin Only)

API:
- `GET /organization-setup/status`
- `PUT /organization-setup/info`
- `POST /organization-setup/complete`

---

### 2. Super Admin Portal

#### Super Admin Dashboard (`/super-admin`)

Responsibilities:
- System-wide metrics
- Recent organizations

API:
- `GET /super-admin/stats`

---

#### Organizations Management

Routes:
- `/super-admin/organizations`
- `/super-admin/organizations/:id`

Capabilities:
- Create organization
- Activate / deactivate organization
- Create admin users

API:
- `POST /super-admin/organizations`
- `POST /super-admin/organizations/{id}/admins`

---

### 3. Tenant User Portal

#### Dashboard (`/dashboard`)

Purpose:
- Personal productivity overview

Widgets:
- Today tasks
- Overdue tasks
- Upcoming (7 days)
- Active time log

API:
- `GET /tasks?date=today&assignee_id=me`
- `GET /tasks?date=overdue&assignee_id=me`
- `GET /tasks?date=upcoming&assignee_id=me`

---

#### Tasks (`/tasks`)

Views:
- List (default)
- Kanban (status-based)
- Calendar (optional)

Filters:
- Status, priority, assignee, project, date

API:
- `GET /tasks`

---

#### Task Detail (`/tasks/:id`)

Sections:
- Metadata (priority, status, assignee)
- Description
- Subtasks
- **Time tracking (manual entry only)**
- Comments
- Activity history

Time tracking:
- Manual entry: date + hours worked

API:
- `POST /tasks/{id}/time-logs`

---

#### Projects (`/projects`)

Responsibilities:
- List organization projects
- Create project

API:
- `GET /projects`
- `POST /projects`

---

#### Project Detail (`/projects/:id`)

Tabs:
- Overview
- Tasks
- Members (admin)
- History (admin)

API:
- `GET /projects/{id}`
- `GET /projects/{id}/members`

---

#### Team Management (Admin Only)

Route:
- `/team`

Capabilities:
- Invite members
- Remove members

API:
- `GET /organization/members`
- `POST /organization/invite`

---

### 4. State Management (Zustand)

Zustand stores:
- `authStore` → token, user, role, org
- `uiStore` → modals, drawers, filters
- `taskUIStore` → selected task, view mode

Server state:
- Always via React Query

---

### 5. Guard Rules Summary

| Condition | Action |
|--------|--------|
| No token | Redirect to login |
| must_change_password | Force password change |
| admin & setup incomplete | Force setup |
| role mismatch | Unauthorized page |

---

## API → Screen Mapping Checklist (Delivery-Ready)

This section is a **delivery checklist** mapping each frontend screen to:
- Required API calls
- Loading / empty / error states
- Real-time (WebSocket) impacts

It is intended to be used directly by frontend developers during implementation.

---

### 1. Login Screen (`/login`)

**APIs**:
- `POST /auth/login`

**States**:
- Loading: disable submit, show spinner
- Error: invalid credentials / expired OTP

**Post-login routing**:
- `must_change_password = true` → `/change-password`
- `role = admin && org_setup_completed = false` → `/organization-setup`
- `role = super_admin` → `/super-admin`
- else → `/dashboard`

---

### 2. Change Password (`/change-password`)

**APIs**:
- `POST /auth/change-password`

**States**:
- Validation error (password rules)
- Success → re-evaluate redirect rules

---

### 3. Organization Setup (Admin Only)

**APIs**:
- `GET /organization-setup/status`
- `PUT /organization-setup/info`
- `POST /organization-setup/complete`

**States**:
- Block all other routes until completed

---

### 4. Super Admin Dashboard (`/super-admin`)

**APIs**:
- `GET /super-admin/stats`

**States**:
- Loading skeleton cards
- Error → system banner

**Realtime**:
- Optional refresh on `organization.created`

---

### 5. Organizations List (`/super-admin/organizations`)

**APIs**:
- `GET /super-admin/organizations`
- `POST /super-admin/organizations`

**States**:
- Empty: "No organizations yet"

---

### 6. Organization Detail (`/super-admin/organizations/:id`)

**APIs**:
- `GET /super-admin/organizations/{id}`
- `POST /super-admin/organizations/{id}/admins`

---

### 7. Tenant Dashboard (`/dashboard`)

**APIs**:
- `GET /tasks?date=today&assignee_id=me`
- `GET /tasks?date=overdue&assignee_id=me`
- `GET /tasks?date=upcoming&assignee_id=me`

**States**:
- Empty widgets show onboarding hints

**Realtime**:
- Refresh widgets on `task.created`, `task.updated`, `task.assigned`

---

### 8. Tasks List (`/tasks`)

**APIs**:
- `GET /tasks` (filters, pagination)

**States**:
- Loading skeleton list
- Empty: "No tasks match filters"

**Realtime**:
- Invalidate list on `task.created`, `task.updated`, `task.deleted`

---

### 9. Task Detail (`/tasks/:id`)

**APIs**:
- `GET /tasks/{id}`
- `GET /tasks/{id}/comments`
- `GET /tasks/{id}/history`
- `POST /tasks/{id}/time-logs` (manual entry)
- `POST /tasks/{id}/comments`

**States**:
- Optimistic comment posting
- Inline error for time-log validation

**Realtime**:
- Append comments on `comment.created`
- Refresh task on `task.updated`

---

### 10. Projects List (`/projects`)

**APIs**:
- `GET /projects`
- `POST /projects`

**States**:
- Empty: "No projects yet"

---

### 11. Project Detail (`/projects/:id`)

**APIs**:
- `GET /projects/{id}`
- `GET /projects/{id}/members`
- `GET /tasks?project_id={id}`

**Realtime**:
- Refresh task list on `task.created`, `task.updated`

---

### 12. Team Management (`/team`, Admin Only)

**APIs**:
- `GET /organization/members`
- `POST /organization/invite`
- `DELETE /organization/members/{user_id}`

**States**:
- Prevent self-removal

---

### 13. Reports (`/reports`, Admin Only)

**APIs**:
- `GET /admin/reports`
- `GET /admin/users/progress`

---

### 14. Global Error & Session Handling

**Rules**:
- `401` → logout + redirect to `/login`
- `403` → unauthorized page
- Network error → retry banner

---

## Zustand Store Blueprints (Code-Ready)

This section defines **authoritative Zustand stores** used by the frontend. These stores manage **client-side state only** and intentionally avoid duplicating server state handled by React Query.

---

### 1. `authStore`

**Purpose**: Authentication, user identity, role & organization context.

**Responsibilities**:
- Store JWT token
- Store logged-in user profile
- Enforce role-based routing rules
- Reset all state on logout

```ts
import { create } from 'zustand'

export type UserRole = 'super_admin' | 'admin' | 'member'

interface AuthState {
  token: string | null
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    organization_id: string | null
    must_change_password: boolean
    org_setup_completed: boolean
  } | null

  login: (payload: { token: string; user: any }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  login: ({ token, user }) => {
    set({ token, user })
  },

  logout: () => {
    set({ token: null, user: null })
  },
}))
```

**Rules**:
- Token stored in memory (localStorage optional)
- Logout clears all Zustand stores + React Query cache

---

### 2. `uiStore`

**Purpose**: Global UI state (modals, drawers, filters).

```ts
interface UIState {
  activeModal: 'task' | 'project' | 'invite' | null
  sidebarCollapsed: boolean

  openModal: (modal: UIState['activeModal']) => void
  closeModal: () => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  sidebarCollapsed: false,

  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
```

---

### 3. `taskUIStore`

**Purpose**: Task-related UI state only (selection, view mode).

```ts
interface TaskUIState {
  selectedTaskId: string | null
  viewMode: 'list' | 'kanban' | 'calendar'

  selectTask: (id: string | null) => void
  setViewMode: (mode: TaskUIState['viewMode']) => void
}

export const useTaskUIStore = create<TaskUIState>((set) => ({
  selectedTaskId: null,
  viewMode: 'list',

  selectTask: (id) => set({ selectedTaskId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
}))
```

---

### 4. Store Interaction Rules

| Scenario | Action |
|-------|--------|
| Login success | `authStore.login()` |
| Logout / 401 | Clear all stores + query cache |
| Task click | `taskUIStore.selectTask(id)` |
| Route change | Clear task selection |

---

### 5. Anti-Patterns (Strictly Forbidden)

- ❌ Storing task lists in Zustand
- ❌ Duplicating API responses in stores
- ❌ Cross-tenant data persistence

---

### 6. Integration with React Query

```ts
queryClient.setDefaultOptions({
  queries: {
    retry: 1,
    refetchOnWindowFocus: false,
  },
})

// On logout
queryClient.clear()
```

---

## UI / UX Design Highlights

### Visual Design System

- **Color System**:
  - Status-based color progression
    - Blue → Yellow → Red → Green
  - Used consistently across boards, lists, charts, and dashboards

- **Material Depth**:
  - Glass morphism style
  - Subtle shadows and soft borders
  - Elevated cards for tasks and widgets

- **Typography**:
  - Font: **Inter**
  - Base font size: **16px**
  - Clear hierarchy for headings, metadata, and actions

---

### Layout & Interaction

- **Dual View Switcher**:
  - Kanban board view
  - Detailed list view

- **Interaction Patterns**:
  - Drag & drop task cards between columns
  - Inline editing for title, status, and priority
  - Quick actions (complete, comment, log hours)

- **Data Visualization**:
  - Progress bars for completion
  - Hour metrics (logged vs expected)
  - Performance charts for dashboards

---

### UX Principles

- Minimize clicks for daily actions
- Inline validation and feedback
- Visual emphasis on delays, blockers, and underutilization
- Consistent interaction patterns across web and mobile

---

## Implementation

1. Scaffold React + TypeScript app
2. Set up authentication flow
3. Implement tenant selection & context provider
4. Generate OpenAPI client and integrate React Query
5. Build core pages (Inbox, Projects, Tasks)
6. Add route guards (auth + tenant)
7. Implement task interactions (CRUD, comments, subtasks)

---

## Milestones

- M1: Auth + Tenant selection working
- M2: Projects & tasks functional
- M3: Collaboration features (assign, comment)
- M4: UI polish & responsiveness

---

## Gathering Results

- Validate tenant isolation
- Measure task CRUD latency
- User feedback on navigation and clarity
- Bug rate post-deployment

---
_


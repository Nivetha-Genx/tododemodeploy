// User and Authentication Types
// Use backend role names directly so UI matches API responses.
// We allow any string so custom organization roles (e.g. "Project Manager")
// can also be assigned to users.
export type UserRole = string

// Base access level type - these are the ENUM values from users.role column
export type AccessLevel = 'super_admin' | 'admin' | 'member' | 'team_lead' | 'staff' | 'user'

export interface User {
    id: string
    name: string
    email: string
    avatar?: string
    avatar_url?: string
    // Role name from Spatie (can be custom like "Project Manager")
    role: UserRole
    // Base access level for permission checks (from users.role ENUM)
    access_level?: AccessLevel
    organizationId: string
    organizationName?: string
    teamId?: string
    expectedHoursPerDay?: number
    createdAt: string
    permissions?: string[]
    mustChangePassword?: boolean
}

export interface ProjectMember {
    id: number
    projectId: string
    userId: string
    role: string
    acceptedAt?: string
    user?: User
}

export interface Organization {
    id: string
    name: string
    logo?: string
    expectedHoursPerDay: number
    createdAt: string
}

export interface Project {
    id: string
    name: string
    shortCode?: string
    description: string
    organizationId: string
    key: string
    leadId: string
    memberIds: string[]
    createdAt: string
    updatedAt: string
    status: 'active' | 'archived' | 'completed'
    icon?: string
    owner?: User
    projectMembers?: ProjectMember[]
    startDate?: string
    endDate?: string
}


// Board and Column Types
export type StatusType = 'new' | 'in_progress' | 'blocked' | 'completed' | 'archived' | string

export interface BoardColumn {
    id: string
    name: string
    status: StatusType
    order: number
    color: string
}

export interface Board {
    id: string
    name: string
    description?: string
    organizationId: string
    projectId?: string
    columns: BoardColumn[]
    createdAt: string
    createdBy: string
}

// Task Types
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface TimeLog {
    id: string
    taskId: string
    userId: string
    date: string
    hours: number
    description: string
    createdAt: string
}

export interface Comment {
    id: string
    taskId: string
    userId: string
    userName: string
    userAvatar?: string
    content: string
    createdAt: string
}

export interface Attachment {
    id: string
    taskId: string
    filename: string
    sizeBytes: number
    formattedSize: string
    downloadUrl: string
    uploadedBy?: User
    createdAt: string
}

export interface AuditEntry {
    id: string
    taskId: string
    userId: string
    userName: string
    action: string
    field?: string
    oldValue?: string
    newValue?: string
    createdAt: string
}

export interface Subtask {
    id: string
    parentTaskId: string
    taskId: string
    title: string
    status: StatusType
    assigneeId?: string
    assigneeName?: string
    estimatedHours: number
    loggedHours: number
    dueDate: string
    createdAt: string
}

export interface BreadcrumbItem {
    id: string;
    taskId: string;
    title: string;
}

export interface Sprint {
    id: string
    organization_id?: string
    name: string
    start_date: string
    end_date: string
    closed_at?: string | null
    status?: 'planned' | 'active' | 'closed' | 'open'
    unclosed_tasks_count?: number
    created_at?: string
    updated_at?: string
}

export interface Task {
    id: string
    taskId: string // e.g., GEN-0001
    boardId: string
    projectId?: string
    projectName?: string
    projectIcon?: string
    sprintId?: string
    storyPoints?: number
    sprint?: Sprint
    title: string
    description?: string
    status: StatusType
    priority: Priority
    assigneeId?: string
    assigneeName?: string
    assigneeAvatar?: string
    startDate: string
    dueDate: string
    estimatedHours: number
    loggedHours: number
    subtasks: Subtask[]
    timeLogs: TimeLog[]
    comments: Comment[]
    attachments?: Attachment[]
    auditHistory: AuditEntry[]
    breadcrumbs?: BreadcrumbItem[]
    parentId?: string
    parentTaskId?: string
    parent_task_id?: string
    createdAt: string
    createdBy: string
}

// Due Date Change Request Types
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface DueDateChangeRequest {
    id: string
    taskId: string
    taskTitle: string
    requesterId: string
    requesterName: string
    currentDueDate: string
    proposedDueDate: string
    reason: string
    status: RequestStatus
    reviewerId?: string
    reviewerName?: string
    reviewerComment?: string
    createdAt: string
    reviewedAt?: string
}

export interface ExtraHourApproval {
    id: string
    task_id: string
    user_id: string
    start_time: string
    end_time: string
    duration_seconds: number
    notes: string | null
    status: 'pending' | 'approved' | 'rejected'
    is_extra: number
    created_at: string
    user: {
        id: string
        name: string
        email: string
        avatar_url: string | null
    }
    task: {
        id: string
        title: string
    }
}


export interface TaskTemplate {
    id: string
    title: string
    description?: string | null
    priority?: 'low' | 'medium' | 'high' | 'critical' | null
    estimated_hours?: number | string | null
    project_id?: string | null
    project?: { id: string; title: string } | null
    created_at?: string
    updated_at?: string
}

// Dashboard Types
export interface ProductivityStats {
    date: string
    expectedHours: number
    loggedHours: number
    tasksCompleted: number
    tasksTotal: number
}

export interface TeamMemberStats {
    userId: string
    userName: string
    userAvatar?: string
    loggedHours: number
    expectedHours: number
    tasksCompleted: number
    tasksTotal: number
    productivityPercentage: number
}

// Report Types
export interface DailyProductivityData {
    date: string
    logged: number
    expected: number
}

export interface BurndownData {
    date: string
    remaining: number
    ideal: number
}

export interface VelocityData {
    sprint: string
    completed: number
    committed: number
}

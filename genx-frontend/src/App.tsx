import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppLayout } from '@/components/layout'
import { LoginPage, ForgotPasswordPage, OtpVerificationPage, ResetPasswordPage } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { CalendarPage } from '@/features/calendar'
import { TodayPage } from '@/features/today'
import { UpcomingPage } from '@/features/upcoming'
import { CompletedPage } from '@/features/completed'
import { ProjectsListPage, ProjectDetailPage } from '@/features/projects'
import { TeamBoardPage } from '@/features/team-board'
import { BacklogPage } from '@/features/backlog/BacklogPage'
import { SprintBoardPage } from '@/features/sprint-board/SprintBoardPage'
import { TaskDetailDrawer, ArchivedTasksPage, TasksPage } from '@/features/tasks'
import { ApprovalQueuePage } from '@/features/approvals'
import { ReportsPage } from '@/features/reports'
import { TeamPage } from '@/features/team'
import { SettingsPage } from '@/features/settings'
import { OrganizationSettingsPage } from '@/features/organization'
import { OrganizationManagementPage, OrganizationDetailPage, UserManagementPage } from '@/features/super-admin'
import { RoleManagementPage } from '@/features/roles'
import { TaskTemplatesPage } from '@/features/task-templates'
import { LeaderboardPage } from '@/features/leaderboard'
import { NotificationPage } from '@/features/notifications'
import { useAuthStore, useStatusStore } from '@/stores'
import { useTimerStore } from '@/stores/timerStore'
import type { UserRole } from '@/types'

// Loading Spinner
function LoadingSpinner() {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
    )
}

// Guest Guard (redirects to dashboard if already logged in)
function GuestGuard() {
    const { isAuthenticated, _hasHydrated, mustChangePassword } = useAuthStore()

    if (!_hasHydrated) {
        return <LoadingSpinner />
    }

    if (isAuthenticated) {
        if (mustChangePassword) {
            return <Navigate to="/change-password" replace />
        }
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}

// Auth Guard Component
function AuthGuard() {
    const { isAuthenticated, _hasHydrated, mustChangePassword } = useAuthStore()
    const location = useLocation()

    if (!_hasHydrated) {
        return <LoadingSpinner />
    }

    if (!isAuthenticated) {
        const redirect = location.pathname + location.search
        const loginUrl = redirect && redirect !== '/'
            ? `/login?redirect=${encodeURIComponent(redirect)}`
            : '/login'
        return <Navigate to={loginUrl} replace />
    }

    if (mustChangePassword) {
        return <Navigate to="/change-password" replace />
    }

    return <Outlet />
}

// Forced Password Change Guard
function PasswordChangeGuard() {
    const { isAuthenticated, _hasHydrated, mustChangePassword } = useAuthStore()

    if (!_hasHydrated) {
        return <LoadingSpinner />
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (!mustChangePassword) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}

// Role Guard Component
function RoleGuard({ allowedRoles }: { allowedRoles: UserRole[] }) {
    const { user } = useAuthStore()

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}

import { GlobalToasts } from '@/components/GlobalToasts'
import { useWebSockets } from '@/hooks/useWebSockets'
import { useAuthRefresh } from '@/hooks/useAuthRefresh'
import { ChangePasswordPage } from '@/features/auth'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { FloatingTimer } from '@/components/ui/FloatingTimer'

function App() {
    const { fetchStatuses } = useStatusStore()
    const { isAuthenticated } = useAuthStore()

    // Initialize WebSockets for real-time updates
    useWebSockets()
    // Initialize Auth Refresh
    useAuthRefresh()

    // Fetch task statuses
    useEffect(() => {
        if (isAuthenticated) {
            fetchStatuses()
        }
    }, [isAuthenticated, fetchStatuses])

    // Resume timer if it was running before reload
    useEffect(() => {
        const timerStore = useTimerStore.getState()
        if (timerStore.isRunning) {
            timerStore.startTimer()
        }
    }, [])

    return (
        <TooltipProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route element={<GuestGuard />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/forgot-password/otp" element={<OtpVerificationPage />} />
                        <Route path="/forgot-password/reset" element={<ResetPasswordPage />} />
                    </Route>

                    {/* Forced Password Change */}
                    <Route element={<PasswordChangeGuard />}>
                        <Route path="/change-password" element={<ChangePasswordPage />} />
                    </Route>

                    {/* Protected Routes */}
                    <Route element={<AuthGuard />}>
                        <Route element={<AppLayout />}>
                            {/* Main Routes */}
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/today" element={<TodayPage />} />
                            <Route path="/upcoming" element={<UpcomingPage />} />
                            <Route path="/calendar" element={<CalendarPage />} />
                            <Route path="/completed" element={<CompletedPage />} />
                            <Route path="/tasks" element={<TasksPage />} />
                            <Route path="/archived" element={<ArchivedTasksPage />} />
                            <Route path="/notifications" element={<NotificationPage />} />

                            {/* Projects */}
                            <Route path="/projects" element={<ProjectsListPage />} />
                            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />

                            {/* Task Templates */}
                            <Route path="/task-templates" element={<TaskTemplatesPage />} />
                            <Route path="/leaderboard" element={<LeaderboardPage />} />

                            {/* Team Board */}
                            <Route path="/team-board" element={<TeamBoardPage />} />

                            {/* Backlog & Sprint Board */}
                            <Route path="/backlog" element={<BacklogPage />} />
                            <Route path="/sprint-board" element={<SprintBoardPage />} />
                            <Route path="/sprint-board/:sprintId" element={<SprintBoardPage />} />

                            {/* Settings */}
                            <Route path="/settings" element={<SettingsPage />} />

                            {/* Admin/Team Lead Routes */}
                            <Route element={<RoleGuard allowedRoles={['admin', 'team_lead', 'super_admin']} />}>
                                <Route path="/reports" element={<ReportsPage />} />
                                <Route path="/approvals" element={<ApprovalQueuePage />} />
                            </Route>

                            <Route element={<RoleGuard allowedRoles={['admin', 'super_admin']} />}>
                                <Route path="/team" element={<TeamPage />} />
                                <Route path="/roles" element={<RoleManagementPage />} />
                                <Route path="/organization/settings" element={<OrganizationSettingsPage />} />
                            </Route>

                            <Route element={<RoleGuard allowedRoles={['super_admin']} />}>
                                <Route path="/organizations" element={<OrganizationManagementPage />} />
                                <Route path="/organizations/:orgId" element={<OrganizationDetailPage />} />
                                <Route path="/users" element={<UserManagementPage />} />
                                {/* Super Admin can also access Org roles when switched */}
                                <Route path="/roles" element={<RoleManagementPage />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>

                {/* Global Drawers/Modals */}
                <TaskDetailDrawer />
            </BrowserRouter>

            {/* Global Features */}
            {isAuthenticated && <FloatingTimer />}

            {/* Feedback System */}
            <GlobalToasts />
            <div 
                onPointerDown={(e) => e.stopPropagation()} 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()}
            >
                <Toaster
                    position="top-right"
                    gutter={12}
                    toastOptions={{
                        duration: 5000,
                    }}
                />
            </div>
        </TooltipProvider>
    )
}

export default App

import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import { useUIStore } from '@/stores'
import { ScrollArea } from '@/components/ui'
import { organizationsApi } from '@/api/organizations'
import {
    LayoutDashboard,
    Kanban,
    BarChart3,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Sun,
    CalendarDays,
    Folder,
    Calendar,
    Building2,
    ShieldCheck,
    UserCog,
    Archive,
    ClipboardCheck,
    Cog,
    FileStack,
    Trophy,
    ListTodo,
    LayoutGrid,
} from 'lucide-react'

interface NavItem {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    roles?: ('super_admin' | 'admin' | 'team_lead' | 'member')[]
    scope?: 'global' | 'org' | 'both'
}

const navItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, scope: 'both' },
    { title: 'Today', href: '/today', icon: Sun, scope: 'org' },
    { title: 'Upcoming', href: '/upcoming', icon: CalendarDays, scope: 'org' },
    { title: 'Completed', href: '/completed', icon: CheckCircle2, scope: 'org' },
    { title: 'Archived', href: '/archived', icon: Archive, scope: 'org' },
    { title: 'Projects', href: '/projects', icon: Folder, scope: 'org' },
    { title: 'Task Templates', href: '/task-templates', icon: FileStack, scope: 'org' },
    { title: 'Leaderboard', href: '/leaderboard', icon: Trophy, scope: 'org' },
    { title: 'Team Board', href: '/team-board', icon: Kanban, scope: 'org' },
    { title: 'Calendar', href: '/calendar', icon: Calendar, scope: 'org' },
    { title: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'team_lead', 'super_admin'], scope: 'org' },
    { title: 'Approvals', href: '/approvals', icon: ClipboardCheck, roles: ['admin', 'team_lead', 'super_admin'], scope: 'org' },
    { title: 'Team', href: '/team', icon: Users, roles: ['admin', 'super_admin'], scope: 'org' },
    { title: 'Roles', href: '/roles', icon: ShieldCheck, roles: ['admin', 'super_admin'], scope: 'org' },
    { title: 'Organizations', href: '/organizations', icon: Building2, roles: ['super_admin'], scope: 'global' },
    { title: 'Org Settings', href: '/organization/settings', icon: Cog, roles: ['admin', 'super_admin'], scope: 'org' },
    { title: 'Users', href: '/users', icon: UserCog, roles: ['super_admin'], scope: 'global' },
    { title: 'Settings', href: '/settings', icon: Settings, scope: 'both' },
]

export function Sidebar() {
    const location = useLocation()
    const { user, activeOrganizationId, activeOrganizationName } = useAuthStore()
    const { sidebarCollapsed, toggleSidebar, sidebarCounts, fetchSidebarCounts } = useUIStore()
    const [sprintEnabled, setSprintEnabled] = useState(false)

    const hasOrgContext = Boolean(activeOrganizationId || user?.organizationId || (user as any)?.organization_id)

    const fetchSprintEnabled = useCallback(() => {
        if (!hasOrgContext) {
            setSprintEnabled(false)
            return
        }
        organizationsApi.getSettings()
            .then((res) => {
                const enabled = res?.success && res?.data && (res.data.sprint_enabled === true || res.data.sprint_enabled === 1)
                setSprintEnabled(!!enabled)
            })
            .catch(() => setSprintEnabled(false))
    }, [hasOrgContext])

    useEffect(() => {
        fetchSprintEnabled()
    }, [fetchSprintEnabled])

    useEffect(() => {
        if (hasOrgContext) {
            fetchSidebarCounts()
            const interval = setInterval(fetchSidebarCounts, 60000) // Refresh counts every minute
            return () => clearInterval(interval)
        }
    }, [hasOrgContext, fetchSidebarCounts])

    useEffect(() => {
        const onSettingsUpdated = (e: Event) => {
            const detail = (e as CustomEvent).detail as { settings?: { sprint_enabled?: boolean } }
            if (detail?.settings && typeof detail.settings.sprint_enabled === 'boolean') {
                setSprintEnabled(detail.settings.sprint_enabled)
            } else {
                fetchSprintEnabled()
            }
        }
        window.addEventListener('organization-settings-updated', onSettingsUpdated)
        return () => window.removeEventListener('organization-settings-updated', onSettingsUpdated)
    }, [fetchSprintEnabled])

    const isOrgContext = !!activeOrganizationId || !!user?.organizationId || !!(user as any)?.organization_id
    const accessLevel = user?.access_level || user?.role
    const isSuperAdmin = accessLevel === 'super_admin'

    const filteredNavItems = navItems.filter(item => {
        if (item.scope === 'global' && isOrgContext && isSuperAdmin) return false
        if (item.scope === 'org' && !isOrgContext && isSuperAdmin) return false
        if (!item.roles) return true
        return item.roles.includes(accessLevel as any || 'member')
    })

    const sprintNavItems: NavItem[] = sprintEnabled
        ? [
            { title: 'Backlog', href: '/backlog', icon: ListTodo, scope: 'org' },
            { title: 'Sprint Board', href: '/sprint-board', icon: LayoutGrid, scope: 'org' },
        ]
        : []

    const teamBoardIndex = filteredNavItems.findIndex(item => item.href === '/team-board')
    const itemsWithSprint =
        teamBoardIndex >= 0
            ? [
                ...filteredNavItems.slice(0, teamBoardIndex + 1),
                ...sprintNavItems,
                ...filteredNavItems.slice(teamBoardIndex + 1),
            ]
            : [...filteredNavItems, ...sprintNavItems]

    const mainNavItems = itemsWithSprint.filter((item) => item.href !== '/settings')

    const organizationName =
        activeOrganizationName ||
        user?.organizationName ||
        (user as any)?.organization?.name ||
        (user as any)?.organization_name ||
        'Project Management'

    return (
        <aside
            className={cn(
                'relative flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 hidden md:flex z-50',
                sidebarCollapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-gray-200">
                {!sidebarCollapsed && (
                    <Link to="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="font-semibold text-lg text-gray-900">{organizationName}</span>
                            <span className="text-xs text-gray-500">Project Management</span>
                        </div>
                    </Link>
                )}
                {sidebarCollapsed && (
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4">
                <nav className="px-2 space-y-1">
                    {(() => {
                        const regularItems = mainNavItems.filter(item =>
                            !['Reports', 'Approvals', 'Team', 'Roles', 'Org Settings'].includes(item.title)
                        )
                        const adminItems = mainNavItems.filter(item =>
                            ['Reports', 'Approvals', 'Team', 'Roles', 'Org Settings'].includes(item.title)
                        )

                        return (
                            <>
                                {/* Regular navigation items */}
                                {regularItems.map((item) => {
                                    const isActive = location.pathname === item.href ||
                                        location.pathname.startsWith(item.href + '/')
                                    const Icon = item.icon

                                    return (
                                        <Link
                                            key={item.href}
                                            to={item.href}
                                            className={cn(
                                                'sidebar-item',
                                                isActive && 'sidebar-item-active',
                                                sidebarCollapsed && 'justify-center px-2'
                                            )}
                                            title={sidebarCollapsed ? item.title : undefined}
                                        >
                                            <Icon className="w-5 h-5 shrink-0" />
                                            {!sidebarCollapsed && (
                                                <div className="flex-1 flex items-center justify-between">
                                                    <span>{item.title}</span>
                                                    {item.title === 'Today' && sidebarCounts.today_task_count > 0 && (
                                                        <span className="flex items-center justify-center bg-brand-100 text-brand-700 text-xs font-bold h-6 min-w-[1.5rem] px-1.5 rounded-full leading-none tabular-nums shrink-0">
                                                            {sidebarCounts.today_task_count}
                                                        </span>
                                                    )}
                                                    {item.title === 'Leaderboard' && sidebarCounts.leaderboard_rank !== null && (
                                                        <span className="flex items-center justify-center bg-amber-100 text-amber-700 text-xs font-bold h-6 min-w-[1.5rem] px-1.5 rounded-full leading-none tabular-nums shrink-0">
                                                            #{sidebarCounts.leaderboard_rank}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </Link>
                                    )
                                })}

                                {/* Admin section */}
                                {adminItems.length > 0 && !sidebarCollapsed && (
                                    <>
                                        <div className="px-3 py-2 mt-4 mb-1">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</span>
                                        </div>
                                        {adminItems.map((item) => {
                                            const isActive = location.pathname === item.href ||
                                                location.pathname.startsWith(item.href + '/')
                                            const Icon = item.icon

                                            return (
                                                <Link
                                                    key={item.href}
                                                    to={item.href}
                                                    className={cn(
                                                        'sidebar-item',
                                                        isActive && 'sidebar-item-active',
                                                        sidebarCollapsed && 'justify-center px-2'
                                                    )}
                                                    title={sidebarCollapsed ? item.title : undefined}
                                                >
                                                    <Icon className="w-5 h-5 shrink-0" />
                                                    {!sidebarCollapsed && (
                                                        <div className="flex-1 flex items-center justify-between">
                                                            <span>{item.title}</span>
                                                            {item.title === 'Approvals' && sidebarCounts.pending_approval_count > 0 && (
                                                                <span className="flex items-center justify-center bg-red-100 text-red-700 text-xs font-bold h-6 min-w-[1.5rem] px-1.5 rounded-full ml-2 leading-none tabular-nums shrink-0">
                                                                    {sidebarCounts.pending_approval_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </Link>
                                            )
                                        })}
                                    </>
                                )}

                                {/* Admin section for collapsed sidebar */}
                                {adminItems.length > 0 && sidebarCollapsed && (
                                    <>
                                        {adminItems.map((item) => {
                                            const isActive = location.pathname === item.href ||
                                                location.pathname.startsWith(item.href + '/')
                                            const Icon = item.icon

                                            return (
                                                <Link
                                                    key={item.href}
                                                    to={item.href}
                                                    className={cn(
                                                        'sidebar-item',
                                                        isActive && 'sidebar-item-active',
                                                        sidebarCollapsed && 'justify-center px-2'
                                                    )}
                                                    title={sidebarCollapsed ? item.title : undefined}
                                                >
                                                    <Icon className="w-5 h-5 shrink-0" />
                                                    {/* Badges shown in tooltip or potentially absolute position in collapsed state in future */}
                                                </Link>
                                            )
                                        })}
                                    </>
                                )}
                            </>
                        )
                    })()}
                </nav>
            </ScrollArea>

            {/* {settingsItem && (
                <div className={cn('px-2 py-2 border-t border-gray-100', sidebarCollapsed && 'px-2')}>
                    {(() => {
                        const isActive = location.pathname === settingsItem.href ||
                            location.pathname.startsWith(settingsItem.href + '/')
                        const Icon = settingsItem.icon

                        return (
                            <Link
                                to={settingsItem.href}
                                className={cn(
                                    'sidebar-item',
                                    isActive && 'sidebar-item-active',
                                    sidebarCollapsed && 'justify-center px-2'
                                )}
                                title={sidebarCollapsed ? settingsItem.title : undefined}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                {!sidebarCollapsed && <span>{settingsItem.title}</span>}
                            </Link>
                        )
                    })()}
                </div>
            )} */}

            {/* Collapse Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
            >
                {sidebarCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                ) : (
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                )}
            </button>

            {/* Day Display */}
            {/* <div className={cn(
                'px-4 py-3 border-t border-gray-100 mt-auto',
                sidebarCollapsed && 'px-2'
            )}>
                <div className={cn(
                    'flex items-center gap-2 text-sm text-gray-500',
                    sidebarCollapsed && 'justify-center'
                )}>
                    <Clock className="w-4 h-4" />
                    {!sidebarCollapsed && (
                        <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</span>
                    )}
                </div>
            </div> */}
        </aside>
    )
}

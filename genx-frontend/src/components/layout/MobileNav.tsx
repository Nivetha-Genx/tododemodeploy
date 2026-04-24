import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import { organizationsApi } from '@/api/organizations'
import {
    LayoutDashboard,
    Sun,
    CalendarDays,
    Folder,
    MoreHorizontal,
    Kanban,
    Archive,
    CheckCircle2,
    User,
    LogOut,
    FileStack,
    Trophy,
    ListTodo,
    LayoutGrid,
    Calendar,
    BarChart3,
    ClipboardCheck,
    Users,
    ShieldCheck,
    Cog
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

export function MobileNav() {
    const location = useLocation()
    const navigate = useNavigate()
    const { logout, user, activeOrganizationId } = useAuthStore()
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

    const accessLevel = user?.access_level || user?.role

    const navItems = [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Today', href: '/today', icon: Sun },
        { title: 'Upcoming', href: '/upcoming', icon: CalendarDays },
        { title: 'Projects', href: '/projects', icon: Folder },
    ]

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const isAdmin = ['admin', 'super_admin'].includes(accessLevel as any)
    const isLeadOrAdmin = ['admin', 'team_lead', 'super_admin'].includes(accessLevel as any)

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 flex items-center justify-around px-2 pb-safe shadow-lg">
            {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                            isActive
                                ? "text-brand-600"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Icon className={cn("w-5 h-5", isActive && "fill-current opacity-20")} />
                        <span className="text-[10px]">{item.title}</span>
                    </Link>
                )
            })}

            {/* 3-Dot Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium text-gray-500">
                        <MoreHorizontal className="w-5 h-5" />
                        <span className="text-[10px]">More</span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mb-2 max-h-[80vh] overflow-y-auto">
                    <DropdownMenuItem onClick={() => navigate('/archived')}>
                        <Archive className="w-4 h-4 mr-2" />
                        Archived
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/completed')}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Completed
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => navigate('/task-templates')}>
                        <FileStack className="w-4 h-4 mr-2" />
                        Task Templates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/leaderboard')}>
                        <Trophy className="w-4 h-4 mr-2" />
                        LeaderBoard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/team-board')}>
                        <Kanban className="w-4 h-4 mr-2" />
                        Team Board
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => navigate('/calendar')}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Calendar
                    </DropdownMenuItem>

                    {sprintEnabled && (
                        <>
                            <DropdownMenuItem onClick={() => navigate('/backlog')}>
                                <ListTodo className="w-4 h-4 mr-2" />
                                Backlog
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/sprint-board')}>
                                <LayoutGrid className="w-4 h-4 mr-2" />
                                Sprint Board
                            </DropdownMenuItem>
                        </>
                    )}

                    {isLeadOrAdmin && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/reports')}>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Reports
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/approvals')}>
                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                Approvals
                            </DropdownMenuItem>
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <DropdownMenuItem onClick={() => navigate('/team')}>
                                <Users className="w-4 h-4 mr-2" />
                                Team
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/roles')}>
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Roles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/organization/settings')}>
                                <Cog className="w-4 h-4 mr-2" />
                                Org Settings
                            </DropdownMenuItem>
                        </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <User className="w-4 h-4 mr-2" />
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </nav>
    )
}

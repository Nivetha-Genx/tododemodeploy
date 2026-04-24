import { useAuthStore, isAdmin, isTeamLead, useUIStore, useTaskUIStore, getAccessLevel, useStatusStore } from '@/stores'
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    Progress,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Button,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,

} from '@/components/ui'
import { CircularProgress } from '@/components/ui/circular-progress'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { cn, formatDate, formatHoursMinutes, getInitials, calculateProgress, isOverdue } from '@/lib/utils'
import { TaskTemplateRowCard } from '@/components/tasks/TaskTemplateRowCard'
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    Calendar,
    FileCheck,
    Trophy,
    LayoutDashboard,
    ArrowRight,
} from 'lucide-react'


import { dashboardApi } from '@/api/dashboard'
import { organizationsApi } from '@/api/organizations'
import { mapBackendTaskToFrontend } from '@/api/tasks'
import { Task, TaskTemplate, ExtraHourApproval } from '@/types'


import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileStack, Plus } from 'lucide-react'

function CompactTaskCard({ task, onClick, showDuePrefix, showTime }: { task: Task; onClick?: () => void; showDuePrefix?: boolean; showTime?: boolean }) {
    const { getStatusStyles } = useStatusStore()
    const status = getStatusStyles(task.status)
    const effectiveDueDate = task.dueDate || task.startDate

    // Determine if the date is today
    const today = new Date().toISOString().split('T')[0]
    const isToday = effectiveDueDate === today

    const isOverdueTask = isOverdue(effectiveDueDate) && task.status !== 'completed'

    // Calculate time stats
    const logged = task.timeLogs?.reduce((acc, log) => acc + log.hours, 0) || task.loggedHours || 0
    const estimated = task.estimatedHours || 0

    return (
        <div
            onClick={onClick}
            className="group block p-4 bg-white hover:bg-slate-50 border border-gray-200 rounded-2xl shadow-sm transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-1 leading-tight">
                            {task.title}
                        </h3>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium">
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                                isOverdueTask ? "text-red-600 bg-red-50 border-red-50" : "text-slate-500 bg-slate-50 border-slate-50"
                            )}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{showDuePrefix && isOverdueTask ? 'Due ' : ''}{isToday ? 'Today' : formatDate(effectiveDueDate)}</span>
                            </div>

                            <div
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                style={{ color: status.color, backgroundColor: status.bgColor, borderColor: `${status.color}10` }}
                            >
                                {status.label}
                            </div>
                        </div>

                        {showTime && (
                            <div className="text-[11px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 tracking-tight shrink-0">
                                {formatHoursMinutes(logged)} / {formatHoursMinutes(estimated)}
                            </div>
                        )}
                    </div>
                </div>

                {isOverdueTask && (
                    <div className="pt-1">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    </div>
                )}
            </div>
        </div>
    )
}

export function DashboardPage() {
    const { user } = useAuthStore()
    const { openTaskDrawer, openModal } = useUIStore()
    const { selectTask } = useTaskUIStore()
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
    const [activeTab, setActiveTab] = useState<'overview' | 'team-performance'>('overview')

    // Real state for dashboard
    const [personalStats, setPersonalStats] = useState<any>(null)
    const [, setOrgStats] = useState<any>(null)
    const [todaysTasks, setTodaysTasks] = useState<Task[]>([])
    const [overdueTasks, setOverdueTasks] = useState<Task[]>([])
    const [pendingRequests, setPendingRequests] = useState<any[]>([])
    const [pendingExtraHours, setPendingExtraHours] = useState<ExtraHourApproval[]>([])
    const [approvalTab, setApprovalTab] = useState<'due-dates' | 'extra-hours'>('due-dates')
    const setProductivityData = (_: any[]) => { }
    const [teamStats, setTeamStats] = useState<any[]>([])
    const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
    const [topLeaderboard, setTopLeaderboard] = useState<Array<{ rank: number; user_id: string; name: string; avatar_url?: string | null; points: number }>>([])
    const [isLoading, setIsLoading] = useState(true)
    const [expectedHoursPerDay, setExpectedHoursPerDay] = useState<number>(8)
    const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])

    const getExpectedHours = (p: 'day' | 'week' | 'month'): number => {
        const perDay = expectedHoursPerDay || 8
        if (p === 'day') return perDay

        const dayMap: Record<number, string> = {
            0: 'Sun',
            1: 'Mon',
            2: 'Tue',
            3: 'Wed',
            4: 'Thu',
            5: 'Fri',
            6: 'Sat',
        }

        const workingSet = new Set(workingDays && workingDays.length ? workingDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])

        if (p === 'week') {
            const daysPerWeek = Array.from({ length: 7 }).reduce((acc: number, _, idx) => {
                const name = dayMap[idx]
                return workingSet.has(name) ? acc + 1 : acc
            }, 0)
            return perDay * (daysPerWeek || 5)
        }

        // month
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        let workingDaysInMonth = 0
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d)
            const name = dayMap[date.getDay()]
            if (workingSet.has(name)) {
                workingDaysInMonth++
            }
        }
        if (workingDaysInMonth === 0) {
            // Fallback: ~22 working days
            workingDaysInMonth = 22
        }
        return perDay * workingDaysInMonth
    }


    const fetchDashboardData = async (isSilent = false) => {
        if (!user) return
        try {
            if (!isSilent) setIsLoading(true)

            const response = await dashboardApi.get(period)

            if (response.success) {
                const data = response.data

                // Set user tasks (available for all users)
                if (data.user_tasks) {
                    const todayTasks = Array.isArray(data.user_tasks.today)
                        ? data.user_tasks.today
                        : (data.user_tasks.today && typeof data.user_tasks.today === 'object' && 'data' in data.user_tasks.today ? (data.user_tasks.today as any).data : [])
                    const overdue = Array.isArray(data.user_tasks.overdue)
                        ? data.user_tasks.overdue
                        : (data.user_tasks.overdue && typeof data.user_tasks.overdue === 'object' && 'data' in data.user_tasks.overdue ? (data.user_tasks.overdue as any).data : [])

                    setTodaysTasks(todayTasks.map(mapBackendTaskToFrontend))
                    setOverdueTasks(overdue.map(mapBackendTaskToFrontend))
                }

                // Set personal stats (always available)
                if (data.personal_stats) {
                    setPersonalStats({
                        ...data.personal_stats,
                        total_time_logged_hours: typeof data.personal_stats.total_time_logged_hours === 'string'
                            ? parseFloat(data.personal_stats.total_time_logged_hours)
                            : (data.personal_stats.total_time_logged_hours || 0)
                    })
                }

                // Set org stats (available for admin/team lead)
                if (data.org_stats) {
                    const mappedOrgStats = {
                        ...data.org_stats,
                        total_time_logged_hours: typeof data.org_stats.total_time_logged_hours === 'string'
                            ? parseFloat(data.org_stats.total_time_logged_hours)
                            : (data.org_stats.total_time_logged_hours || 0)
                    }
                    setOrgStats(mappedOrgStats)

                    // Map task trend for chart
                    const trend = data.task_trend?.map((item: any) => ({
                        date: item.date,
                        logged: item.count,
                        expected: 8
                    })) || []
                    setProductivityData(trend)
                }

                // Set team performance data
                if (data.team_performance) {
                    const expectedHours = getExpectedHours(period)
                    const mappedTeamStats = data.team_performance.map((u: any) => ({
                        userId: u.id,
                        userName: u.name,
                        userAvatar: u.avatar_url || u.avatar,
                        productivityPercentage:
                            Math.min(Math.round((u.total_time_hours / expectedHours) * 100), 100) || 0,
                        loggedHours: u.total_time_hours || 0,
                        tasksCompleted: u.completed_tasks,
                        tasksTotal: u.total_tasks,
                        overdueTasks: u.overdue_tasks ?? 0,
                        expectedHours,
                    }))
                    setTeamStats(mappedTeamStats)
                }

                if (data.pending_requests) {
                    setPendingRequests(data.pending_requests)
                }

                if (data.pending_extra_hours) {
                    setPendingExtraHours(data.pending_extra_hours)
                }

                if (data.task_templates && Array.isArray(data.task_templates)) {
                    setTaskTemplates(data.task_templates)
                }

                if (data.top_leaderboard && Array.isArray(data.top_leaderboard)) {
                    setTopLeaderboard(data.top_leaderboard)
                } else {
                    setTopLeaderboard([])
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            if (!isSilent) setIsLoading(false)
        }
    }

    useEffect(() => {
        const loadOrgSettings = async () => {
            try {
                const res = await organizationsApi.getSettings()
                const payload = res?.data ?? res
                const settings = payload?.data ?? payload
                if (settings) {
                    const rawPerDay =
                        settings.expected_hours_per_day ?? settings.expectedHoursPerDay ?? settings.expectedHours ?? '8'
                    const perDay = typeof rawPerDay === 'number' ? rawPerDay : parseFloat(String(rawPerDay))
                    if (!Number.isNaN(perDay) && perDay > 0) {
                        setExpectedHoursPerDay(perDay)
                    }
                    if (Array.isArray(settings.working_days) && settings.working_days.length > 0) {
                        setWorkingDays(settings.working_days)
                    }
                }
            } catch (e) {
                // Fallback to defaults on error
                console.error('Failed to load organization settings for dashboard', e)
            }
        }
        loadOrgSettings()
    }, [user])

    useEffect(() => {
        fetchDashboardData()
    }, [user, period, expectedHoursPerDay, workingDays])

    useEffect(() => {
        const handleRefresh = () => fetchDashboardData(true)
        window.addEventListener('task-created', handleRefresh)
        window.addEventListener('task-updated', handleRefresh)
        window.addEventListener('task-template-created', handleRefresh)
        window.addEventListener('task-template-updated', handleRefresh)
        return () => {
            window.removeEventListener('task-created', handleRefresh)
            window.removeEventListener('task-updated', handleRefresh)
            window.removeEventListener('task-template-created', handleRefresh)
            window.removeEventListener('task-template-updated', handleRefresh)
        }
    }, [user, period])

    const isAdminOrTeamLead = isAdmin(getAccessLevel(user)) || isTeamLead(getAccessLevel(user))
    const expectedHours = getExpectedHours(period)
    const loggedHours = personalStats?.total_time_logged_hours || 0
    const productivityPercentage = Math.min(
        Math.round((loggedHours / expectedHours) * 100),
        100
    )

    if (isLoading) {
        return <PageSkeleton />
    }

    const topPerformersCard = (
        <Card className="border-gray-200 shadow-sm overflow-hidden bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-4">
                {/* <CardTitle className="text-lg font-bold flex items-center gap-2.5"> */}
                <CardTitle className="text-lg font-bold flex items-center gap-1 whitespace-nowrap shrink-0">
                    <div className="p-2 bg-amber-50 rounded-xl">
                        <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    Top Performers
                </CardTitle>
                <Link to="/leaderboard">
                    <Button variant="ghost" size="sm" className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-300">
                        Leaderboard
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="pb-8">
                {topLeaderboard.length > 0 ? (
                    <div className="flex items-end justify-center gap-2 sm:gap-4 px-2 pt-1">
                        {/* Podium order: 2nd (left), 1st (center), 3rd (right) */}
                        {([2, 1, 3] as const).map((rank) => {
                            const entry = topLeaderboard.find((e) => e.rank === rank)
                            if (!entry) return <div key={rank} className={cn("flex-1 max-w-[140px] min-w-[90px]", rank === 1 && 'order-2', rank === 2 && 'order-1', rank === 3 && 'order-3')} />

                            const styles = {
                                1: {
                                    card: 'bg-gradient-to-b from-amber-50 via-white to-amber-50/20 border-amber-300/50 shadow-xl shadow-amber-500/10 scale-105 z-20',
                                    badge: 'bg-gradient-to-r from-amber-400 to-amber-600 text-white',
                                    avatar: 'ring-4 ring-amber-100 border-2 border-white',
                                    medal: '🥇',
                                    height: 'h-48 sm:h-52 lg:h-60',
                                    pts: 'bg-amber-100/50 text-amber-700',
                                    rankBg: 'bg-amber-200/80 text-amber-900'
                                },
                                2: {
                                    card: 'bg-gradient-to-b from-slate-50 via-white to-slate-50/20 border-slate-200/60 shadow-lg shadow-slate-500/5',
                                    badge: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white',
                                    avatar: 'ring-4 ring-slate-100 border-2 border-white',
                                    medal: '🥈',
                                    height: 'h-40 sm:h-44 lg:h-52',
                                    pts: 'bg-slate-100/50 text-slate-700',
                                    rankBg: 'bg-slate-200/80 text-slate-800'
                                },
                                3: {
                                    card: 'bg-gradient-to-b from-orange-50 via-white to-orange-50/20 border-orange-200/60 shadow-lg shadow-orange-500/5',
                                    badge: 'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
                                    avatar: 'ring-4 ring-orange-100 border-2 border-white',
                                    medal: '🥉',
                                    height: 'h-36 sm:h-40 lg:h-48',
                                    pts: 'bg-orange-100/50 text-orange-700',
                                    rankBg: 'bg-orange-200/80 text-orange-900'
                                }
                            }[rank]

                            return (
                                <div
                                    key={entry.user_id}
                                    className={cn(
                                        'flex flex-col items-center flex-1 max-w-[150px] min-w-[90px] rounded-2xl border transition-all duration-500 hover:scale-[1.08] backdrop-blur-sm',
                                        styles.card,
                                        rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'
                                    )}
                                >
                                    <div className={cn('w-full flex flex-col items-center justify-end pt-1 pb-2 px-2', styles.height)}>
                                        <div className="relative mb-2">
                                            <span className="absolute -top-3 -right-3 text-2xl sm:text-3xl drop-shadow-md z-20" aria-hidden>
                                                {styles.medal}
                                            </span>
                                            <Avatar className={cn("w-12 h-12 sm:w-16 sm:h-16 shadow-xl transition-transform duration-300 group-hover:scale-110", styles.avatar)}>
                                                <AvatarImage src={entry.avatar_url ?? undefined} />
                                                <AvatarFallback className="text-base font-black bg-gray-50">{getInitials(entry.name)}</AvatarFallback>
                                            </Avatar>
                                        </div>

                                        <p className="text-[11px] sm:text-sm font-black text-gray-900 truncate w-full text-center px-1 tracking-tight" title={entry.name}>
                                            {entry.name}
                                        </p>

                                        <div className={cn("mt-1.5 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border", styles.pts)}>
                                            {entry.points} PTS
                                        </div>
                                    </div>
                                    <div className={cn('w-full rounded-b-2xl flex items-center justify-center py-2.5 font-black text-sm tracking-tighter', styles.rankBg)}>
                                        RANK #{rank}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">
                        <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No leaderboard data this month</p>
                        {/* <Link to="/leaderboard">
                            <Button variant="ghost" size="sm" className="mt-3 h-8 px-4 text-[11px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-200">View leaderboard</Button>
                        </Link> */}
                    </div>
                )}
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1">
                    {/* <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2"> */}
                    <h1 className="text-xl sm:text-2xl lg:text-2xl xl:text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 lg:w-7 lg:h-7 text-brand-600 shrink-0" />
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}!
                    </h1>
                    <p className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium">
                        Here's your productivity overview for {period === 'day' ? 'today' : period === 'week' ? 'this week' : 'this month'}
                    </p>
                </div>
                {isAdminOrTeamLead && (
                    <div className="flex items-center">
                        <div className="flex bg-white/50 backdrop-blur-sm rounded-full border border-gray-200/50 p-1 shadow-sm w-max">
                            {[
                                { value: 'day', label: 'Day', icon: Clock },
                                { value: 'week', label: 'Week', icon: Calendar },
                                { value: 'month', label: 'Month', icon: TrendingUp },
                            ].map((p) => (
                                <Button
                                    key={p.value}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPeriod(p.value as any)}
                                    className={cn(
                                        "h-8 px-4 rounded-full transition-all duration-300 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5",
                                        period === p.value
                                            ? "bg-brand-600 text-white shadow-md hover:bg-brand-700 hover:text-white"
                                            : "text-gray-500 hover:bg-brand-50 hover:text-brand-600"
                                    )}
                                >
                                    <p.icon className="w-3.5 h-3.5" />
                                    {p.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs for Admin/Team Lead */}
            {isAdminOrTeamLead ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'team-performance')} className="space-y-6">
                    <div className="flex items-center justify-start overflow-x-auto pb-1 -mx-2 px-2 no-scrollbar">
                        <TabsList className="bg-white/50 p-1 rounded-full border border-gray-200/50 flex h-auto gap-1 shadow-sm w-max">
                            <TabsTrigger
                                value="overview"
                                className="px-6 py-2 rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black flex items-center gap-2 whitespace-nowrap"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="team-performance"
                                className="px-6 py-2 rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black flex items-center gap-2 whitespace-nowrap"
                            >
                                Team Performance
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">

                        {/* Quick templates + Summary row */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Task templates (Quick templates) - first card */}
                            <Card>
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-y-3 pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2 font-bold">
                                        <FileStack className="w-5 h-5 text-brand-600" />
                                        Quick templates
                                    </CardTitle>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 sm:flex-none h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-200"
                                            onClick={() => openModal('createTaskTemplate')}
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                            <span className="inline xl:hidden">Add</span>
                                            <span className="hidden xl:inline">Add template</span>
                                        </Button>
                                        <Link to="/task-templates" className="flex-1 sm:flex-none">
                                            <Button variant="ghost" size="sm" className="w-full h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-200">
                                                <span className="inline xl:hidden">All</span>
                                                <span className="hidden xl:inline">View all</span>
                                            </Button>
                                        </Link>
                                        <Badge variant="outline" className="hidden 2xl:inline-flex">{taskTemplates.length}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-[250px] lg:max-h-[320px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 pb-2">
                                        {taskTemplates.map((tpl) => (
                                            <TaskTemplateRowCard
                                                key={tpl.id}
                                                template={tpl}
                                                onClick={() =>
                                                    openModal('createTask', {
                                                        template: {
                                                            title: tpl.title,
                                                            description: tpl.description ?? undefined,
                                                            priority: (tpl.priority as 'low' | 'medium' | 'high' | 'critical') ?? undefined,
                                                            estimated_hours: tpl.estimated_hours != null ? String(tpl.estimated_hours) : undefined,
                                                            project_id: tpl.project_id ?? undefined,
                                                        },
                                                        projectId: tpl.project_id ?? undefined,
                                                    })
                                                }
                                            />
                                        ))}
                                        {taskTemplates.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                <FileStack className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                <p className="text-sm">No templates yet</p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="mt-3 h-8 px-4 text-[11px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-200"
                                                    onClick={() => openModal('createTaskTemplate')}
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                                    Create template
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    {/* "View all" moved to header */}
                                </CardContent>
                            </Card>

                            {/* Personal Summary metrics (four individual cards) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                                {/* Hours Logged */}
                                <Card className="bg-white border-gray-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 group">
                                    <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 mb-4">Hours Logged</p>
                                    <div className="flex items-center gap-4">
                                        <CircularProgress
                                            value={productivityPercentage}
                                            size={80}
                                            strokeWidth={7}
                                            color="#069a69ff"
                                        >
                                            <span className="text-sm font-black text-slate-900">{productivityPercentage}%</span>
                                        </CircularProgress>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">
                                                {formatHoursMinutes(loggedHours)}
                                            </p>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">of {formatHoursMinutes(expectedHours)} expected</p>
                                            <p className="text-[10px] font-medium text-slate-400 mt-1">Logged this {period}</p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Tasks Completed */}
                                <Card className="bg-white border-gray-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 group">
                                    <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 mb-4">Tasks Completed</p>
                                    <div className="flex items-center gap-4">
                                        <CircularProgress
                                            value={personalStats?.task_stats ? calculateProgress(
                                                personalStats.task_stats.completed_in_period ?? 0,
                                                personalStats.task_stats.relevant_tasks_count ?? personalStats.task_stats.total ?? 1
                                            ) : 0}
                                            size={80}
                                            strokeWidth={7}
                                            color="#069a69ff"
                                        >
                                            <span className="text-sm font-black text-slate-900">
                                                {personalStats?.task_stats ? Math.round(calculateProgress(
                                                    personalStats.task_stats.completed_in_period ?? 0,
                                                    personalStats.task_stats.relevant_tasks_count ?? personalStats.task_stats.total ?? 1
                                                )) : 0}%
                                            </span>
                                        </CircularProgress>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">
                                                {personalStats?.task_stats ? (personalStats.task_stats.completed_in_period ?? 0) : 0}
                                                <span className="text-xs font-semibold text-slate-400 ml-1">/ {personalStats?.task_stats ? (personalStats.task_stats.relevant_tasks_count ?? personalStats.task_stats.total ?? 0) : 1}</span>
                                            </p>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">Completion rate</p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Active Tasks */}
                                <Card className="bg-white border-gray-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg hover:border-blue-100 transition-all duration-300 group">
                                    <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 mb-4">Active Tasks</p>
                                    <div className="flex items-center gap-4">
                                        <CircularProgress
                                            value={personalStats?.task_stats ? calculateProgress(
                                                (personalStats.task_stats.open ?? 0) + (personalStats.task_stats.in_progress ?? 0),
                                                personalStats.task_stats.total ?? 1
                                            ) : 0}
                                            size={80}
                                            strokeWidth={7}
                                            color="#3b82f6"
                                        >
                                            <span className="text-sm font-black text-slate-900">
                                                {personalStats?.task_stats ? Math.round(calculateProgress(
                                                    (personalStats.task_stats.open ?? 0) + (personalStats.task_stats.in_progress ?? 0),
                                                    personalStats.task_stats.total ?? 1
                                                )) : 0}%
                                            </span>
                                        </CircularProgress>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">
                                                {personalStats?.task_stats ? ((personalStats.task_stats.open ?? 0) + (personalStats.task_stats.in_progress ?? 0)) : 0}
                                            </p>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">
                                                of {personalStats?.task_stats ? (personalStats.task_stats.total ?? 0) : 0} total tasks
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Overdue Tasks */}
                                <Card className={cn(
                                    "bg-white border-gray-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 group",
                                    ((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "hover:border-red-100" : "hover:border-brand-100"
                                )}>
                                    <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 mb-4">Overdue Tasks</p>
                                    <div className="flex items-center gap-4">
                                        <CircularProgress
                                            value={((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0
                                                ? calculateProgress(
                                                    personalStats?.task_stats?.overdue ?? overdueTasks.length,
                                                    personalStats?.task_stats?.total ?? 1
                                                ) : 0}
                                            size={80}
                                            strokeWidth={7}
                                            color={((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "#de1313ff" : "#069a69ff"}
                                        >
                                            <span className={cn(
                                                "text-sm font-black",
                                                ((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "text-red-600" : "text-slate-900"
                                            )}>
                                                {((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0
                                                    ? Math.round(calculateProgress(
                                                        personalStats?.task_stats?.overdue ?? overdueTasks.length,
                                                        personalStats?.task_stats?.total ?? 1
                                                    )) : 0}%
                                            </span>
                                        </CircularProgress>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <p className={cn(
                                                "text-2xl font-black tracking-tight",
                                                ((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "text-red-600" : "text-slate-900"
                                            )}>
                                                {personalStats?.task_stats?.overdue ?? overdueTasks.length}
                                            </p>
                                            <p className={cn(
                                                "text-xs font-medium mt-0.5",
                                                ((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "text-red-500 font-bold" : "text-slate-400"
                                            )}>
                                                {((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "Needs attention" : "Everything on track"}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                        </div>

                        {/* Top 3 Leaderboard — Podium */}
                        {topPerformersCard}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Today's Tasks */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-brand-600" />
                                        Today's Tasks
                                    </CardTitle>
                                    <Badge variant="outline" className="bg-gray-50/50 whitespace-nowrap">{todaysTasks.length}</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-[350px] lg:max-h-[450px] overflow-y-auto pr-1 sm:pr-2 space-y-3 pb-2">
                                        {todaysTasks.map((task) => (
                                            <CompactTaskCard
                                                key={task.id}
                                                task={task}
                                                showTime={true}
                                                onClick={() => {
                                                    selectTask(task.id)
                                                    openTaskDrawer(task.id)
                                                }}
                                            />
                                        ))}
                                        {todaysTasks.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                <p className="text-sm font-medium">No tasks for today</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Overdue Tasks */}
                            <Card className={cn(overdueTasks.length > 0)}>
                                <CardHeader className="flex flex-row items-center justify-between pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-red-600" />
                                        Overdue Tasks
                                    </CardTitle>
                                    <Badge variant="outline" className={cn("whitespace-nowrap", overdueTasks.length > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50/50')}>
                                        {overdueTasks.length}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-[350px] lg:max-h-[450px] overflow-y-auto pr-1 sm:pr-2 space-y-3 pb-2">
                                        {overdueTasks.map((task) => (
                                            <CompactTaskCard
                                                key={task.id}
                                                task={task}
                                                showDuePrefix={true}
                                                onClick={() => {
                                                    selectTask(task.id)
                                                    openTaskDrawer(task.id)
                                                }}
                                            />
                                        ))}
                                        {overdueTasks.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-300" />
                                                <p className="text-sm font-medium">No overdue tasks</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="pb-4 pt-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <FileCheck className="w-5 h-5 text-amber-600" />
                                        <CardTitle className="text-xl font-black text-slate-900 tracking-tight">
                                            Approvals
                                        </CardTitle>
                                    </div>
                                    <Link to="/approvals" className="w-full sm:w-auto">
                                        <Button variant="ghost" size="sm" className="w-full sm:h-8 px-4 text-[10px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-300">
                                            Manage All
                                        </Button>
                                    </Link>
                                </div>
                                <div className="flex justify-start mb-2 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar ">
                                    <Tabs value={approvalTab} onValueChange={(v) => setApprovalTab(v as any)} className="w-full">
                                        <TabsList className="bg-slate-100/50 p-1 h-auto rounded-3xl  bg-brand-50 text-brand-600 border border-gray-200 flex w-full sm:w-max gap-1">
                                            <TabsTrigger
                                                value="due-dates"
                                                className="flex-1 sm:flex-none px-6 py-2 rounded-3xl data-[state=active]:bg-white data-[state=active]:text-brand-700 data-[state=active]:shadow-sm transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-slate-500"
                                            >
                                                Due Dates ({pendingRequests.length})
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="extra-hours"
                                                className="flex-1 sm:flex-none px-6 py-2 rounded-3xl data-[state=active]:bg-white data-[state=active]:text-brand-700 data-[state=active]:shadow-sm transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-slate-500"
                                            >
                                                Extra Hours ({pendingExtraHours.length})
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                    {approvalTab === 'due-dates' ? (
                                        <div className="space-y-3">
                                            {pendingRequests.map((request) => (
                                                <Link
                                                    key={request.id}
                                                    to="/approvals?tab=due-dates"
                                                    className="group block p-5 bg-white hover:bg-slate-50 border border-gray-200 rounded-3xl shadow-sm transition-all cursor-pointer"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                                                                <p className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                                                                    Due Date Change
                                                                </p>
                                                                <div className="hidden sm:block h-1 w-1 rounded-full bg-slate-300" />
                                                                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest truncate">
                                                                    {request.requester?.name}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs sm:text-sm text-slate-600 line-clamp-1 mb-3 font-medium">
                                                                {request.task?.title}
                                                            </p>
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                                                <span className="text-slate-400 font-medium tracking-tight whitespace-nowrap">Currently: {formatDate(request.current_due_date)}</span>
                                                                <ArrowRight className="hidden sm:block w-4 h-4 text-brand-400" />
                                                                <div className="sm:hidden w-full h-[1px] bg-slate-100" />
                                                                <span className="font-black text-brand-600 tracking-tight whitespace-nowrap">Proposed: {formatDate(request.proposed_due_date)}</span>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className='bg-amber-50/50 rounded-3xl text-amber-700 border-amber-200 text-[10px] shrink-0 font-black uppercase tracking-wider px-3 py-1'>
                                                            Pending
                                                        </Badge>
                                                    </div>
                                                </Link>
                                            ))}
                                            {pendingRequests.length === 0 && (
                                                <div className="text-center py-16 text-black">
                                                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                                                    <p className="text-base font-bold text-slate-600">No pending approvals</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {pendingExtraHours.map((request) => (
                                                <Link
                                                    key={request.id}
                                                    to="/approvals?tab=extra-hours"
                                                    className="group block p-5 bg-white hover:bg-slate-50 border border-gray-100 rounded-3xl shadow-sm transition-all cursor-pointer"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                                                                <p className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                                                                    Extra Log Hours
                                                                </p>
                                                                <div className="hidden sm:block h-1 w-1 rounded-full bg-slate-300" />
                                                                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest truncate">
                                                                    {request.user?.name}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs sm:text-sm text-slate-600 line-clamp-1 mb-3 font-medium">
                                                                {request.task?.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500">
                                                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50 text-brand-400" />
                                                                <span className="font-medium tracking-tight">Requested</span>
                                                                <span className="font-black text-brand-600 tracking-tight">+{formatHoursMinutes(request.duration_seconds / 3600)} hrs</span>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className='bg-amber-50/50 text-amber-700 rounded-full border-amber-200 text-[10px] shrink-0 font-black uppercase tracking-wider px-3 py-1'>
                                                            Pending
                                                        </Badge>
                                                    </div>
                                                </Link>
                                            ))}
                                            {pendingExtraHours.length === 0 && (
                                                <div className="text-center py-16 text-black">
                                                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                                                    <p className="text-base font-bold text-slate-600">No pending extra hours</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="team-performance" className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                        <Card className="border-gray-200 shadow-sm overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between pb-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-4 sm:p-6">
                                <div>
                                    <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-brand-600" />
                                        Team Productivity Overview
                                    </CardTitle>
                                    <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Track your team's logged hours and task completion rates.</p>
                                </div>
                                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] sm:text-xs uppercase tracking-widest font-bold bg-white text-brand-600 border border-gray-200 shadow-sm px-3 sm:px-4 py-1.5 rounded-full">
                                    {period === 'day' ? 'Today' : period === 'week' ? 'This week' : 'This month'}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 bg-gray-50/30">
                                {teamStats && teamStats.length > 0 ? (
                                    <div className="space-y-4 lg:space-y-5">
                                        {teamStats.map((member: any) => (
                                            <div
                                                key={member.userId}
                                                className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 lg:p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-brand-200 transition-all group"
                                            >
                                                <div className="flex-1 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6 min-w-0">
                                                    <div className="flex items-center gap-3 lg:gap-4 lg:w-44 xl:w-64 shrink-0 overflow-hidden">
                                                        <Avatar className="h-8 w-8 lg:h-12 lg:w-12 shrink-0 border-2 border-white ring-1 ring-gray-100 shadow-sm transition-transform group-hover:scale-105">
                                                            <AvatarImage src={member.userAvatar ?? undefined} />
                                                            <AvatarFallback className="text-xs lg:text-sm font-bold bg-brand-50 text-brand-700">
                                                                {getInitials(member.userName)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="text-sm lg:text-base font-bold text-gray-900 truncate leading-tight group-hover:text-brand-600 transition-colors">
                                                                {member.userName}
                                                            </p>
                                                            <p className="text-[10px] lg:text-xs font-medium text-gray-500 truncate mt-0.5 lg:mt-1">
                                                                <span className="font-semibold text-gray-700">{formatHoursMinutes(member.loggedHours)}</span> / {formatHoursMinutes(member.expectedHours)} logged
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1 lg:gap-1.5 flex-1 min-w-[120px] max-w-sm px-1 lg:px-0">
                                                        <div className="flex justify-between items-center text-[10px] lg:text-xs">
                                                            <span className="font-bold text-gray-500 uppercase tracking-wider">Productivity</span>
                                                            <span className="font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full text-[10px] lg:text-xs">{member.productivityPercentage}%</span>
                                                        </div>
                                                        <Progress
                                                            value={member.productivityPercentage}
                                                            className="h-1.5 lg:h-2 bg-gray-100"
                                                            indicatorClassName="bg-brand-500"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between lg:justify-end gap-4 lg:gap-6 shrink-0 lg:w-auto xl:w-56 bg-gray-50/80 lg:bg-transparent p-3 lg:p-0 rounded-xl w-full lg:min-w-max">
                                                        <div className="flex flex-col text-xs text-black min-w-[60px] lg:min-w-[75px]">
                                                            <span className="text-[9px] lg:text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 lg:mb-1 opacity-70">Tasks Done</span>
                                                            <span className="flex items-baseline gap-0.5 lg:gap-1">
                                                                <span className="font-black text-gray-900 text-sm lg:text-base">{member.tasksCompleted}</span>
                                                                <span className="text-xs lg:text-sm text-gray-400 font-medium">/</span>
                                                                <span className="font-semibold text-gray-500 text-xs lg:text-sm">{member.tasksTotal ?? 0}</span>
                                                            </span>
                                                        </div>

                                                        <div className="w-px h-7 lg:h-10 bg-gray-200 hidden lg:block mx-1"></div>

                                                        <div className="flex flex-col text-xs text-black min-w-[60px] lg:min-w-[75px] text-right lg:text-left">
                                                            <span className="text-[9px] lg:text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 lg:mb-1 opacity-70">Overdue</span>
                                                            <span
                                                                className={cn(
                                                                    'flex items-center justify-end lg:justify-start gap-1 font-black text-sm lg:text-base',
                                                                    member.overdueTasks > 0
                                                                        ? 'text-red-500'
                                                                        : 'text-green-500'
                                                                )}
                                                            >
                                                                {member.overdueTasks > 0 ? (
                                                                    <AlertCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                                                                ) : (
                                                                    <CheckCircle2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                                                                )}
                                                                {member.overdueTasks > 0 ? member.overdueTasks : 'None'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 sm:py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                                        <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                        <p className="text-base font-bold text-gray-600">No team performance data</p>
                                        <p className="text-sm font-medium text-gray-400 mt-1 max-w-sm mx-auto">
                                            Switch to a different date range or ensure your team has logged hours during this {period}.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            ) : (
                // Non-admin view (no tabs)
                <>
                    {/* Quick templates + Summary row (non-admin) */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Task templates (non-admin) - first card */}
                        <Card>
                            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-y-3 pb-4">
                                <CardTitle className="text-lg flex items-center gap-2 font-bold">
                                    <FileStack className="w-5 h-5 text-brand-600" />
                                    Quick templates
                                </CardTitle>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 sm:flex-none h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-200"
                                        onClick={() => openModal('createTaskTemplate')}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        <span className="inline xl:hidden">Add</span>
                                        <span className="hidden xl:inline">Add template</span>
                                    </Button>
                                    <Link to="/task-templates" className="flex-1 sm:flex-none">
                                        <Button variant="ghost" size="sm" className="w-full h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-200">
                                            <span className="inline xl:hidden">All</span>
                                            <span className="hidden xl:inline">View all</span>
                                        </Button>
                                    </Link>
                                    <Badge variant="outline" className="hidden 2xl:inline-flex">{taskTemplates.length}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[200px] overflow-y-auto pr-2 space-y-3 pb-2">
                                    {taskTemplates.map((tpl) => (
                                        <TaskTemplateRowCard
                                            key={tpl.id}
                                            template={tpl}
                                            onClick={() =>
                                                openModal('createTask', {
                                                    template: {
                                                        title: tpl.title,
                                                        description: tpl.description ?? undefined,
                                                        priority: (tpl.priority as 'low' | 'medium' | 'high' | 'critical') ?? undefined,
                                                        estimated_hours: tpl.estimated_hours != null ? String(tpl.estimated_hours) : undefined,
                                                        project_id: tpl.project_id ?? undefined,
                                                    },
                                                    projectId: tpl.project_id ?? undefined,
                                                })
                                            }
                                        />
                                    ))}
                                    {taskTemplates.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <FileStack className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                            <p className="text-sm">No templates yet</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-3 h-8 px-4 text-[11px] font-bold uppercase tracking-widest bg-white hover:bg-brand-50 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-full shadow-sm transition-all duration-200"
                                                onClick={() => openModal('createTaskTemplate')}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                                Create template
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {/* "View all" moved to header */}
                            </CardContent>
                        </Card>

                        {/* Personal Summary metrics (four individual cards) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                            {/* Hours Logged */}
                            <Card className="bg-white border-gray-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 group">
                                <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 mb-4">Hours Logged</p>
                                <div className="flex items-center gap-4">
                                    <CircularProgress
                                        value={productivityPercentage}
                                        size={80}
                                        strokeWidth={7}
                                        color="#069a69ff"
                                    >
                                        <span className="text-sm font-black text-slate-900">{productivityPercentage}%</span>
                                    </CircularProgress>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                                            {formatHoursMinutes(loggedHours)}
                                        </p>
                                        <p className="text-xs font-semibold text-slate-400 mt-0.5">of {formatHoursMinutes(expectedHours)} expected</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1">Logged this {period}</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Tasks Completed */}
                            <Card className="bg-white border-gray-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg hover:border-emerald-100 transition-all duration-300 group">
                                <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 mb-4">Tasks Completed</p>
                                <div className="flex items-center gap-4">
                                    <CircularProgress
                                        value={personalStats?.task_stats ? calculateProgress(
                                            personalStats.task_stats.completed_in_period ?? 0,
                                            personalStats.task_stats.relevant_tasks_count ?? personalStats.task_stats.total ?? 1
                                        ) : 0}
                                        size={80}
                                        strokeWidth={7}
                                        color="#069a69ff"
                                    >
                                        <span className="text-sm font-black text-slate-900">
                                            {personalStats?.task_stats ? Math.round(calculateProgress(
                                                personalStats.task_stats.completed_in_period ?? 0,
                                                personalStats.task_stats.relevant_tasks_count ?? personalStats.task_stats.total ?? 1
                                            )) : 0}%
                                        </span>
                                    </CircularProgress>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                                            {personalStats?.task_stats ? (personalStats.task_stats.completed_in_period ?? 0) : 0}
                                            <span className="text-xs font-semibold text-slate-400 ml-1">/ {personalStats?.task_stats ? (personalStats.task_stats.relevant_tasks_count ?? personalStats.task_stats.total ?? 0) : 1}</span>
                                        </p>
                                        <p className="text-xs font-medium text-slate-400 mt-0.5">Completion rate</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Active Tasks */}
                            <Card className="bg-white border-gray-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg hover:border-blue-100 transition-all duration-300 group">
                                <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 mb-4">Active Tasks</p>
                                <div className="flex items-center gap-4">
                                    <CircularProgress
                                        value={personalStats?.task_stats ? calculateProgress(
                                            (personalStats.task_stats.open ?? 0) + (personalStats.task_stats.in_progress ?? 0),
                                            personalStats.task_stats.total ?? 1
                                        ) : 0}
                                        size={80}
                                        strokeWidth={7}
                                        color="#3b82f6"
                                    >
                                        <span className="text-sm font-black text-slate-900">
                                            {personalStats?.task_stats ? Math.round(calculateProgress(
                                                (personalStats.task_stats.open ?? 0) + (personalStats.task_stats.in_progress ?? 0),
                                                personalStats.task_stats.total ?? 1
                                            )) : 0}%
                                        </span>
                                    </CircularProgress>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                                            {personalStats?.task_stats ? ((personalStats.task_stats.open ?? 0) + (personalStats.task_stats.in_progress ?? 0)) : 0}
                                        </p>
                                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                                            of {personalStats?.task_stats ? (personalStats.task_stats.total ?? 0) : 0} total tasks
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Overdue Tasks */}
                            <Card className={cn(
                                "bg-white border-gray-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 group",
                                ((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "hover:border-red-100" : "hover:border-brand-100"
                            )}>
                                <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400 mb-4">Overdue Tasks</p>
                                <div className="flex items-center gap-4">
                                    <CircularProgress
                                        value={((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0
                                            ? calculateProgress(
                                                personalStats?.task_stats?.overdue ?? overdueTasks.length,
                                                personalStats?.task_stats?.total ?? 1
                                            ) : 0}
                                        size={80}
                                        strokeWidth={7}
                                        color={((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "#de1313ff" : "#069a69ff"}
                                    >
                                        <span className={cn(
                                            "text-sm font-black",
                                            ((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "text-red-600" : "text-slate-900"
                                        )}>
                                            {((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0
                                                ? Math.round(calculateProgress(
                                                    personalStats?.task_stats?.overdue ?? overdueTasks.length,
                                                    personalStats?.task_stats?.total ?? 1
                                                )) : 0}%
                                        </span>
                                    </CircularProgress>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <p className={cn(
                                            "text-2xl font-black tracking-tight",
                                            ((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "text-red-600" : "text-slate-900"
                                        )}>
                                            {personalStats?.task_stats?.overdue ?? overdueTasks.length}
                                        </p>
                                        <p className={cn(
                                            "text-xs font-medium mt-0.5",
                                            ((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "text-red-500 font-bold" : "text-slate-400"
                                        )}>
                                            {((personalStats?.task_stats?.overdue ?? 0) || overdueTasks.length) > 0 ? "Needs attention" : "Everything on track"}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Top 3 Leaderboard — Podium */}
                    {topPerformersCard}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Today's Tasks */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-brand-600" />
                                    Today's Tasks
                                </CardTitle>
                                <Badge variant="outline" className="bg-gray-50/50 whitespace-nowrap">{todaysTasks.length}</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[350px] lg:max-h-[450px] overflow-y-auto pr-1 sm:pr-2 space-y-3 pb-2">
                                    {todaysTasks.map((task) => (
                                        <CompactTaskCard
                                            key={task.id}
                                            task={task}
                                            showTime={true}
                                            onClick={() => {
                                                selectTask(task.id)
                                                openTaskDrawer(task.id)
                                            }}
                                        />
                                    ))}
                                    {todaysTasks.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300 shadow-sm rounded-lg p-1.5" />
                                            <p className="text-sm font-medium">No tasks for today</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Overdue Tasks */}
                        <Card className={cn(overdueTasks.length > 0 && 'shadow-sm')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-red-600" />
                                    Overdue Tasks
                                </CardTitle>
                                <Badge variant="outline" className={cn("whitespace-nowrap", overdueTasks.length > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50/50')}>
                                    {overdueTasks.length}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[350px] lg:max-h-[450px] overflow-y-auto pr-1 sm:pr-2 space-y-3 pb-2">
                                    {overdueTasks.map((task) => (
                                        <CompactTaskCard
                                            key={task.id}
                                            task={task}
                                            showDuePrefix={true}
                                            onClick={() => {
                                                selectTask(task.id)
                                                openTaskDrawer(task.id)
                                            }}
                                        />
                                    ))}
                                    {overdueTasks.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-300" />
                                            <p className="text-sm font-medium">No overdue tasks</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}

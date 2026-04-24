import { useState, useEffect, useCallback } from 'react'
import { useUIStore, useTaskUIStore, useAuthStore } from '@/stores'
import { useWebSockets } from '@/hooks/useWebSockets'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { organizationsApi } from '@/api/organizations'
import { projectsApi, mapBackendProjectToFrontend } from '@/api/projects'
import { priorityConfig } from '@/mock'
import { Task, User, Project } from '@/types'
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    Button,
    DatePicker,
    Card,
    CardContent,
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui'
import { UserAvatar } from '@/components/UserAvatar'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { TaskRowCard } from '@/components/tasks/TaskRowCard'
import { Kanban, List, Search, ChevronLeft, ChevronRight, ClipboardList, CheckCircle2, AlertCircle, Clock, ChevronDown, Calendar, History, CalendarCheck, CalendarPlus, CalendarDays, CalendarRange, Flag, Users, LayoutGrid } from 'lucide-react'
import { BoardView } from '@/features/projects/components/BoardView'
import { cn, formatDateToLocalString, getRandomColor, getRandomIcon, formatHoursMinutes } from '@/lib/utils'

export function TeamBoardPage() {
    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer } = useUIStore()
    const { user } = useAuthStore()


    // Initialize WebSockets
    useWebSockets()

    const [tasks, setTasks] = useState<Task[]>([])
    const [members, setMembers] = useState<User[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
    const [view, setView] = useState<'list' | 'board'>('list')
    const [searchQuery, setSearchQuery] = useState('')
    const [assigneeFilter, setAssigneeFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [projectFilter, setProjectFilter] = useState('all')
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const [projectSearchQuery, setProjectSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<'all' | 'yesterday' | 'today' | 'tomorrow' | 'pick_date' | 'custom'>('all')
    const [customFromDate, setCustomFromDate] = useState<Date | undefined>(undefined)
    const [customToDate, setCustomToDate] = useState<Date | undefined>(undefined)
    const [stats, setStats] = useState({ total_tasks: 0, completed_tasks: 0, overdue_tasks: 0, total_time_logged_hours: 0 })

    // Popover open states
    const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
    const [projectPopoverOpen, setProjectPopoverOpen] = useState(false)

    const fetchTeamData = useCallback(async (page = 1, isSilent = false) => {
        if (!user) return

        try {
            if (!isSilent) setIsLoading(true)

            const params: any = {}
            if (view === 'list') {
                params.page = page
                params.per_page = 10
            }
            if (searchQuery) params.search = searchQuery
            if (assigneeFilter !== 'all') params.assignee_id = assigneeFilter
            if (priorityFilter !== 'all') params.priority = priorityFilter
            if (projectFilter !== 'all') params.project_id = projectFilter

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            // Date filter logic (omitted for brevity in replace, but keeping it in the actual file)
            if (dateFilter === 'yesterday') {
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                const d = formatDateToLocalString(yesterday)
                // params.date = 'yesterday'
                params.from_date = d
                params.to_date = d
            }
            if (dateFilter === 'today') {
                const d = formatDateToLocalString(today)
                params.date = 'today'
                params.from_date = d
                params.to_date = d
            }
            if (dateFilter === 'tomorrow') {
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                const d = formatDateToLocalString(tomorrow)
                params.date = 'tomorrow'
                params.from_date = d
                params.to_date = d
            }
            if (dateFilter === 'pick_date' && customFromDate) {
                const d = formatDateToLocalString(customFromDate)
                params.from_date = d
                params.to_date = d
            }
            if (dateFilter === 'custom') {
                let from = customFromDate
                let to = customToDate
                if (from && !to) {
                    params.from_date = formatDateToLocalString(new Date(from))
                } else if (to && !from) {
                    params.to_date = formatDateToLocalString(new Date(to))
                } else if (from && to) {
                    const fromD = new Date(from); fromD.setHours(0, 0, 0, 0);
                    const toD = new Date(to); toD.setHours(0, 0, 0, 0);
                    const start = fromD <= toD ? fromD : toD
                    const end = fromD <= toD ? toD : fromD
                    params.from_date = formatDateToLocalString(start)
                    params.to_date = formatDateToLocalString(end)
                }
            }

            // 1. Fetch Tasks
            try {
                const tasksRes = await (view === 'board' ? tasksApi.getAllListAll(params) : tasksApi.getAll(params));

                if (tasksRes) {
                    const responseData = tasksRes.data;
                    const isDataArray = Array.isArray(responseData);
                    const payload = (responseData && !isDataArray) ? responseData : tasksRes;
                    const taskData = Array.isArray(payload.data)
                        ? payload.data
                        : (Array.isArray(payload) ? payload : (isDataArray ? responseData : []));

                    setTasks(taskData.map(mapBackendTaskToFrontend));

                    if (payload.statistics) {
                        setStats({
                            ...payload.statistics,
                            total_time_logged_hours: typeof payload.statistics.total_time_logged_hours === 'string'
                                ? parseFloat(payload.statistics.total_time_logged_hours)
                                : (payload.statistics.total_time_logged_hours || payload.statistics.total_log_hours || 0)
                        });
                    } else if (tasksRes.statistics) {
                        setStats({
                            ...tasksRes.statistics,
                            total_time_logged_hours: typeof tasksRes.statistics.total_time_logged_hours === 'string'
                                ? parseFloat(tasksRes.statistics.total_time_logged_hours)
                                : (tasksRes.statistics.total_time_logged_hours || tasksRes.statistics.total_log_hours || 0)
                        });
                    }

                    if (view === 'list') {
                        const meta = payload.meta || tasksRes.meta;
                        setPagination({
                            current_page: meta?.current_page || 1,
                            last_page: meta?.last_page || 1,
                            total: meta?.total || taskData.length
                        });
                    } else {
                        setPagination({ current_page: 1, last_page: 1, total: taskData.length });
                    }
                }
            } catch (e) {
                // Silently handle task fetch error
            }

            // 2. Fetch Members
            try {
                const membersRes = await organizationsApi.getMembers();
                if (membersRes) {
                    const membersData = membersRes.data || (Array.isArray(membersRes) ? membersRes : []);
                    setMembers(Array.isArray(membersData) ? membersData : []);
                    setMembers(Array.isArray(membersData) ? membersData : []);
                }
            } catch (e) {
                // Silently handle member fetch error
            }

            // 3. Fetch Projects
            try {
                const projectsRes = await projectsApi.getAll();
                if (projectsRes) {
                    const projectsPayload = projectsRes.data || projectsRes;
                    const projectsData = Array.isArray(projectsPayload.data)
                        ? projectsPayload.data
                        : (Array.isArray(projectsPayload) ? projectsPayload : []);
                    setProjects(projectsData.map(mapBackendProjectToFrontend));
                }
            } catch (e) {
                // Silently handle project fetch error
            }

        } catch (error) {
            // Global fetch error handle
        } finally {
            if (!isSilent) setIsLoading(false)
        }
    }, [user, view, searchQuery, assigneeFilter, priorityFilter, projectFilter, dateFilter, customFromDate, customToDate])

    useEffect(() => {
        fetchTeamData(1)
    }, [fetchTeamData])

    useEffect(() => {
        const handleRefresh = () => fetchTeamData(view === 'list' ? pagination.current_page : 1, true)
        window.addEventListener('task-updated', handleRefresh)
        window.addEventListener('task-created', handleRefresh)
        return () => {
            window.removeEventListener('task-updated', handleRefresh)
            window.removeEventListener('task-created', handleRefresh)
        }
    }, [fetchTeamData, pagination.current_page, view])

    const handlePageChange = (newPage: number) => {
        fetchTeamData(newPage)
    }

    return (
        <div className="space-y-6 h-full flex flex-col min-h-0">
            <div className="flex flex-col gap-4 shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Kanban className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600 shrink-0" />
                            <span className="truncate">Team Board</span>
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm sm:text-base hidden sm:block">
                            Overview of all tasks across the team
                        </p>
                    </div>
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg shadow-inner shrink-0">
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "p-2 rounded-md transition-all duration-300",
                                view === 'list'
                                    ? "bg-brand-600 text-white shadow-md scale-105"
                                    : "text-gray-500 hover:text-gray-900"
                            )}
                            title="List View"
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setView('board')}
                            className={cn(
                                "p-2 rounded-md transition-all duration-300",
                                view === 'board'
                                    ? "bg-brand-600 text-white shadow-md scale-105"
                                    : "text-gray-500 hover:text-gray-900"
                            )}
                            title="Board View"
                        >
                            <Kanban className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                    <div className="relative lg:col-span-4 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white w-full"
                        />
                    </div>
                    <div className="lg:col-span-8 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full">
                        <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto sm:min-w-[150px] bg-white h-9 text-sm justify-between font-normal px-2">
                                    <div className="flex items-center gap-2 truncate">
                                        {assigneeFilter !== 'all' ? (
                                            <>
                                                <UserAvatar
                                                    user={members.find(m => String(m.id) === assigneeFilter)}
                                                    className="h-5 w-5 shrink-0"
                                                    fallbackClassName="text-[8px]"
                                                />
                                                <span className="truncate">{members.find(m => String(m.id) === assigneeFilter)?.name || 'Assignee'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span className="truncate">All Members</span>
                                            </>
                                        )}
                                    </div>
                                    <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", assigneePopoverOpen && "rotate-180")} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-1 rounded-2xl border-gray-200 shadow-2xl shadow-brand-100/20 bg-white ring-1 ring-black/5" align="start">
                                <div className="p-2 border-b border-gray-100 mb-1">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <Input
                                            placeholder="Search members..."
                                            value={memberSearchQuery}
                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                            className="pl-8 h-8 text-[13px] bg-gray-50/50 border-gray-100 focus-visible:ring-brand-500/20 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto px-1 pb-1">
                                    <button
                                        onClick={() => {
                                            setAssigneeFilter('all')
                                            setAssigneePopoverOpen(false)
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5",
                                            assigneeFilter === 'all' ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-gray-50/80"
                                        )}
                                    >
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span>All Members</span>
                                    </button>
                                    {members
                                        .filter(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase().trim()))
                                        .map((u) => (
                                            <button
                                                key={u.id}
                                                onClick={() => {
                                                    setAssigneeFilter(String(u.id))
                                                    setAssigneePopoverOpen(false)
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5",
                                                    assigneeFilter === String(u.id) ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-gray-50/80"
                                                )}
                                            >
                                                <UserAvatar user={u} className="h-5 w-5" />
                                                <span className="truncate">{u.name}</span>
                                            </button>
                                        ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px] bg-white h-9 text-sm">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-gray-200 shadow-2xl shadow-brand-100/20 p-1 bg-white ring-1 ring-black/5">
                                <SelectItem value="all" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors border-b border-gray-100 mb-0.5">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <Flag className="w-4 h-4 text-gray-400" />
                                        <span>All Priorities</span>
                                    </div>
                                </SelectItem>
                                {Object.entries(priorityConfig).map(([key, config], index, array) => (
                                    <SelectItem key={key} value={key} className={cn(
                                        "cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors",
                                        index !== array.length - 1 && "border-b border-gray-100 mb-0.5"
                                    )}>
                                        <div className="flex items-center gap-2 font-medium text-gray-900">
                                            <div
                                                className="w-3 h-3 rounded-full shadow-sm border-2 border-white shrink-0"
                                                style={{ backgroundColor: config.color }}
                                            />
                                            {config.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto sm:min-w-[150px] bg-white h-9 text-sm justify-between font-normal px-2">
                                    <div className="flex items-center gap-2 truncate">
                                        {projectFilter !== 'all' ? (
                                            (() => {
                                                const project = projects.find(p => p.id === projectFilter);
                                                if (!project) return <span className="truncate">Project</span>;
                                                const ProjectIcon = getRandomIcon(project.id);
                                                return (
                                                    <>
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-md flex items-center justify-center overflow-hidden shrink-0",
                                                            project.icon ? 'bg-gray-100' : getRandomColor(project.id)
                                                        )}>
                                                            {project.icon ? (
                                                                <img src={project.icon} alt={project.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ProjectIcon className="w-3.5 h-3.5" />
                                                            )}
                                                        </div>
                                                        <span className="truncate">{project.name}</span>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            <>
                                                <LayoutGrid className="w-4 h-4 text-gray-400" />
                                                <span className="truncate">All Projects</span>
                                            </>
                                        )}
                                    </div>
                                    <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", projectPopoverOpen && "rotate-180")} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-1 rounded-2xl border-gray-200 shadow-2xl shadow-brand-100/20 bg-white ring-1 ring-black/5" align="start">
                                <div className="p-2 border-b border-gray-100 mb-1">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <Input
                                            placeholder="Search projects..."
                                            value={projectSearchQuery}
                                            onChange={(e) => setProjectSearchQuery(e.target.value)}
                                            className="pl-8 h-8 text-[13px] bg-gray-50/50 border-gray-100 focus-visible:ring-brand-500/20 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto px-1 pb-1">
                                    <button
                                        onClick={() => {
                                            setProjectFilter('all')
                                            setProjectPopoverOpen(false)
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5",
                                            projectFilter === 'all' ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-gray-50/80"
                                        )}
                                    >
                                        <LayoutGrid className="w-4 h-4 text-gray-400" />
                                        <span>All Projects</span>
                                    </button>
                                    {projects
                                        .filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase().trim()))
                                        .map((p) => {
                                            const colorClass = getRandomColor(p.id)
                                            const ProjectIcon = getRandomIcon(p.id)
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setProjectFilter(p.id)
                                                        setProjectPopoverOpen(false)
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5",
                                                        projectFilter === p.id ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-gray-50/80"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded flex items-center justify-center overflow-hidden shrink-0",
                                                        p.icon ? "bg-gray-100" : colorClass
                                                    )}>
                                                        {p.icon ? (
                                                            <img src={p.icon} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ProjectIcon className="w-3 h-3" />
                                                        )}
                                                    </div>
                                                    <span className="truncate">{p.name}</span>
                                                </button>
                                            )
                                        })}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                            <SelectTrigger className="w-full sm:w-auto sm:min-w-[160px] bg-white h-9 text-sm">
                                <SelectValue placeholder="Date" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-gray-200 shadow-2xl shadow-brand-100/20 p-1 bg-white ring-1 ring-black/5">
                                <SelectItem value="all" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors border-b border-gray-100 mb-0.5">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>All Dates</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="yesterday" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors border-b border-gray-100 mb-0.5">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <History className="w-4 h-4 text-orange-500" />
                                        <span>Yesterday</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="today" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors border-b border-gray-100 mb-0.5">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <CalendarCheck className="w-4 h-4 text-green-500" />
                                        <span>Today</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="tomorrow" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors border-b border-gray-100 mb-0.5">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <CalendarPlus className="w-4 h-4 text-blue-500" />
                                        <span>Tomorrow</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="pick_date" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors border-b border-gray-100 mb-0.5">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <CalendarDays className="w-4 h-4 text-purple-500" />
                                        <span>Pick Date</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="custom" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <CalendarRange className="w-4 h-4 text-indigo-500" />
                                        <span>Custom Range</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {dateFilter === 'pick_date' && (
                            <div className="col-span-2 sm:col-span-1 w-full sm:w-[170px]">
                                <DatePicker
                                    date={customFromDate}
                                    setDate={setCustomFromDate}
                                    placeholder="Select Date"
                                    className="w-full bg-white h-9 text-sm"
                                />
                            </div>
                        )}

                        {dateFilter === 'custom' && (
                            <div className="flex gap-2 col-span-2 sm:col-span-auto w-full sm:w-auto">
                                <div className="w-full sm:w-[150px]">
                                    <DatePicker
                                        date={customFromDate}
                                        setDate={setCustomFromDate}
                                        placeholder="From"
                                        className="w-full bg-white h-9 text-sm"
                                    />
                                </div>
                                <div className="w-full sm:w-[150px]">
                                    <DatePicker
                                        date={customToDate}
                                        setDate={setCustomToDate}
                                        placeholder="To"
                                        className="w-full bg-white h-9 text-sm"
                                        minDate={customFromDate}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200">
                        <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 text-center sm:text-left">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <ClipboardList className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm font-medium text-gray-500 truncate">Total Tasks</p>
                                <h3 className="text-sm sm:text-2xl font-bold text-gray-900">{stats.total_tasks}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200">
                        <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 text-center sm:text-left">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm font-medium text-gray-500 truncate">Completed Tasks</p>
                                <h3 className="text-sm sm:text-2xl font-bold text-gray-900">{stats.completed_tasks}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200">
                        <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 text-center sm:text-left">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm font-medium text-gray-500 truncate">Overdue Tasks</p>
                                <h3 className="text-sm sm:text-2xl font-bold text-gray-900">{stats.overdue_tasks}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200">
                        <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 text-center sm:text-left">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-sm font-medium text-gray-500 truncate">Total logged hours</p>
                                <h3 className="text-sm sm:text-2xl font-bold text-gray-900">{formatHoursMinutes(stats.total_time_logged_hours)}</h3>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {isLoading ? (
                <PageSkeleton />
            ) : (
                <div className="flex-1 flex flex-col min-h-0 px-1">
                    {view === 'board' ? (
                        <div className="flex-1 h-full min-h-0">
                            <BoardView tasks={tasks} projectId="" />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto min-h-0 pb-10">
                            {tasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Search className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
                                    <p className="text-gray-500 mt-2 max-w-sm">
                                        Try adjusting your filters or search query.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 w-full pb-4">
                                    {tasks.map((task) => (
                                        <TaskRowCard
                                            key={task.id}
                                            task={task}
                                            onClick={() => {
                                                selectTask(task.id)
                                                openTaskDrawer(task.id)
                                            }}
                                        />
                                    ))}

                                    {/* Unified Scrolling Pagination */}
                                    {pagination.last_page > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 mt-6 border-t border-gray-100">
                                            <p className="text-sm text-gray-500 order-3 sm:order-1 text-center sm:text-left">
                                                Showing page <span className="font-medium text-gray-900">{pagination.current_page}</span> of <span className="font-medium text-gray-900">{pagination.last_page}</span> ({pagination.total} total)
                                            </p>
                                            <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                                                <div className="flex items-center justify-center gap-1 flex-wrap w-full sm:w-auto">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={pagination.current_page === 1 || isLoading}
                                                        onClick={() => handlePageChange(pagination.current_page - 1)}
                                                        className="h-9 px-3"
                                                    >
                                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                                        <span className="hidden xs:inline">Previous</span>
                                                    </Button>

                                                    <div className="flex items-center gap-1 mx-1">
                                                        {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                                                            let pageNum: number
                                                            if (pagination.last_page <= 5) {
                                                                pageNum = i + 1
                                                            } else if (pagination.current_page <= 3) {
                                                                pageNum = i + 1
                                                            } else if (pagination.current_page >= pagination.last_page - 2) {
                                                                pageNum = pagination.last_page - 4 + i
                                                            } else {
                                                                pageNum = pagination.current_page - 2 + i
                                                            }

                                                            return (
                                                                <Button
                                                                    key={pageNum}
                                                                    variant={pagination.current_page === pageNum ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    onClick={() => handlePageChange(pageNum)}
                                                                    className="w-8 h-8 p-0 shrink-0"
                                                                >
                                                                    {pageNum}
                                                                </Button>
                                                            )
                                                        })}
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={pagination.current_page === pagination.last_page || isLoading}
                                                        onClick={() => handlePageChange(pagination.current_page + 1)}
                                                        className="h-9 px-3"
                                                    >
                                                        <span className="hidden xs:inline">Next</span>
                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

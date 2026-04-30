import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore, useUIStore, useTaskUIStore, useStatusStore } from '@/stores'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { organizationsApi } from '@/api/organizations'
import { projectsApi, mapBackendProjectToFrontend } from '@/api/projects'
import { priorityConfig } from '@/mock'
import { Task, User, Project } from '@/types'
import {
    ScrollArea,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    Button,
    DatePicker,
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui'
import { UserAvatar } from '@/components/UserAvatar'
import { PageSkeleton, TaskCardSkeleton } from '@/components/ui/modal-skeleton'
import { TaskRowCard } from '@/components/tasks/TaskRowCard'
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    ChevronDown,
    Calendar,
    History,
    CalendarCheck,
    CalendarPlus,
    CalendarDays,
    CalendarRange,
    Flag,
    Users,
    LayoutGrid,
    X
} from 'lucide-react'
import { cn, formatDateToLocalString, getRandomColor, getRandomIcon } from '@/lib/utils'

export function TasksPage() {
    const [searchParams] = useSearchParams()
    const { user } = useAuthStore()
    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer } = useUIStore()
    const { fetchStatuses } = useStatusStore()

    const [tasks, setTasks] = useState<Task[]>([])
    const [members, setMembers] = useState<User[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isFetching, setIsFetching] = useState(false)
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })

    // Filters
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
    const [assigneeFilter, setAssigneeFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [projectFilter, setProjectFilter] = useState('all')
    const [dateFilter, setDateFilter] = useState<'all' | 'yesterday' | 'today' | 'tomorrow' | 'pick_date' | 'custom'>('all')
    const [customFromDate, setCustomFromDate] = useState<Date | undefined>(undefined)
    const [customToDate, setCustomToDate] = useState<Date | undefined>(undefined)

    // UI state for filters
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const [projectSearchQuery, setProjectSearchQuery] = useState('')
    const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
    const [projectPopoverOpen, setProjectPopoverOpen] = useState(false)

    const fetchTasks = useCallback(async (page = 1, isSilent = false) => {
        if (!user) return

        try {
            if (!isSilent) setIsFetching(true)

            const params: any = {
                page,
                per_page: 10
            }
            if (searchQuery) params.search = searchQuery.trim()
            if (assigneeFilter !== 'all') params.assignee_id = assigneeFilter
            if (priorityFilter !== 'all') params.priority = priorityFilter
            if (projectFilter !== 'all') params.project_id = projectFilter

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            if (dateFilter === 'yesterday') {
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                const d = formatDateToLocalString(yesterday)
                params.from_date = d
                params.to_date = d
            } else if (dateFilter === 'today') {
                const d = formatDateToLocalString(today)
                params.from_date = d
                params.to_date = d
            } else if (dateFilter === 'tomorrow') {
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                const d = formatDateToLocalString(tomorrow)
                params.from_date = d
                params.to_date = d
            } else if (dateFilter === 'pick_date' && customFromDate) {
                const d = formatDateToLocalString(customFromDate)
                params.from_date = d
                params.to_date = d
            } else if (dateFilter === 'custom') {
                if (customFromDate) params.from_date = formatDateToLocalString(customFromDate)
                if (customToDate) params.to_date = formatDateToLocalString(customToDate)
            }

            const response = await tasksApi.getAll(params)
            if (response.data) {
                const payload = response.data
                const taskData = Array.isArray(payload) ? payload : (payload.data || [])
                setTasks(taskData.map(mapBackendTaskToFrontend))

                const meta = payload.meta || response.meta
                setPagination({
                    current_page: meta?.current_page || page,
                    last_page: meta?.last_page || 1,
                    total: meta?.total || taskData.length
                })
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error)
        } finally {
            if (!isSilent) setIsFetching(false)
            setIsLoading(false)
        }
    }, [user, searchQuery, assigneeFilter, priorityFilter, projectFilter, dateFilter, customFromDate, customToDate])

    const fetchInitialData = useCallback(async () => {
        try {
            const [membersRes, projectsRes] = await Promise.all([
                organizationsApi.getMembers(),
                projectsApi.getAll()
            ])

            if (membersRes?.data) setMembers(membersRes.data)
            else if (Array.isArray(membersRes)) setMembers(membersRes)

            if (projectsRes?.data) {
                const pList = projectsRes.data.data || projectsRes.data
                setProjects(pList.map(mapBackendProjectToFrontend))
            }
            else if (Array.isArray(projectsRes)) setProjects(projectsRes.map(mapBackendProjectToFrontend))

            fetchStatuses()
        } catch (error) {
            console.error('Failed to fetch initial data:', error)
        }
    }, [fetchStatuses])

    useEffect(() => {
        fetchInitialData()
    }, [fetchInitialData])

    useEffect(() => {
        const timer = setTimeout(() => fetchTasks(1), 300)
        return () => clearTimeout(timer)
    }, [fetchTasks])

    useEffect(() => {
        const handleRefresh = () => fetchTasks(pagination.current_page, true)
        window.addEventListener('task-updated', handleRefresh)
        window.addEventListener('task-created', handleRefresh)
        return () => {
            window.removeEventListener('task-updated', handleRefresh)
            window.removeEventListener('task-created', handleRefresh)
        }
    }, [fetchTasks, pagination.current_page])

    const handlePageChange = (newPage: number) => {
        fetchTasks(newPage)
    }

    if (isLoading) {
        return <PageSkeleton />
    }

    return (
        <div className="space-y-6 h-full flex flex-col min-h-0">
            {/* Header section */}
            <div className="flex items-center justify-between shrink-0 px-1">
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2">
                        <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600 shrink-0" />
                        <span className="truncate">Tasks</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                        Browse and filter all tasks in your organization
                    </p>
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-50/50 min-h-0">
                {/* Filters Bar */}
                <div className="px-1 mt-4 mb-4 shrink-0">
                    <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center">
                        <div className="relative w-full xl:w-[300px] shrink-0">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 rounded-xl bg-white border-gray-200 shadow-sm w-full"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full">
                            {/* Assignee Filter */}
                            <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="shrink-0 w-auto min-w-[150px] bg-white h-9 text-sm justify-between font-normal px-2 border-gray-200">
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
                                                    <Users className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <span className="truncate text-gray-600">All Members</span>
                                                </>
                                            )}
                                        </div>
                                        <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", assigneePopoverOpen && "rotate-180")} />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0" align="start">
                                    <div className="p-2 border-b">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                            <Input
                                                placeholder="Search members..."
                                                value={memberSearchQuery}
                                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                className="pl-8 h-8 text-xs bg-transparent border-gray-100"
                                            />
                                            {memberSearchQuery && (
                                                <button onClick={() => setMemberSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <ScrollArea className="h-[200px]">
                                        <div className="p-1">
                                            <button
                                                onClick={() => { setAssigneeFilter('all'); setMemberSearchQuery(''); setAssigneePopoverOpen(false) }}
                                                className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors", assigneeFilter === 'all' ? "bg-accent text-accent-foreground" : "hover:bg-gray-100")}
                                            >
                                                <Users className="w-4 h-4 text-gray-400 shrink-0" />
                                                <span>All Members</span>
                                            </button>
                                            {members.filter(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase().trim())).map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => { setAssigneeFilter(String(m.id)); setMemberSearchQuery(''); setAssigneePopoverOpen(false) }}
                                                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors", assigneeFilter === String(m.id) ? "bg-accent text-accent-foreground" : "hover:bg-gray-100 text-left")}
                                                >
                                                    <UserAvatar user={m} className="h-5 w-5" fallbackClassName="text-[8px]" />
                                                    <span className="truncate">{m.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>

                            {/* Priority Filter */}
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="shrink-0 w-auto min-w-[150px] bg-white h-9 text-sm border-gray-200">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2">
                                            <Flag className="w-4 h-4 text-gray-400" />
                                            <span>All Priorities</span>
                                        </div>
                                    </SelectItem>
                                    {Object.entries(priorityConfig).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className="flex items-center gap-2">
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

                            {/* Project Filter */}
                            <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="shrink-0 w-auto min-w-[150px] bg-white h-9 text-sm justify-between font-normal px-2 border-gray-200">
                                        <div className="flex items-center gap-2 truncate">
                                            {projectFilter !== 'all' ? (
                                                (() => {
                                                    const p = projects.find(proj => proj.id === projectFilter);
                                                    if (!p) return <span>Project</span>;
                                                    const Icon = getRandomIcon(p.id);
                                                    return (
                                                        <>
                                                            <div className={cn("w-5 h-5 rounded-md flex items-center justify-center overflow-hidden shrink-0", p?.icon ? 'bg-gray-100' : getRandomColor(projectFilter))}>
                                                                {p?.icon ? <img src={p.icon} className="w-full h-full object-cover" /> : <Icon className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <span className="truncate">{p?.name || 'Project'}</span>
                                                        </>
                                                    )
                                                })()
                                            ) : (
                                                <>
                                                    <LayoutGrid className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <span className="truncate text-gray-600">All Projects</span>
                                                </>
                                            )}
                                        </div>
                                        <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", projectPopoverOpen && "rotate-180")} />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0" align="start">
                                    <div className="p-2 border-b">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                            <Input
                                                placeholder="Search projects..."
                                                value={projectSearchQuery}
                                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                className="pl-8 h-8 text-xs bg-transparent border-gray-100"
                                            />
                                            {projectSearchQuery && (
                                                <button onClick={() => setProjectSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <ScrollArea className="h-[200px]">
                                        <div className="p-1">
                                            <button
                                                onClick={() => { setProjectFilter('all'); setProjectSearchQuery(''); setProjectPopoverOpen(false) }}
                                                className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors", projectFilter === 'all' ? "bg-accent text-accent-foreground" : "hover:bg-gray-100")}
                                            >
                                                <LayoutGrid className="w-4 h-4 text-gray-400 shrink-0" />
                                                <span>All Projects</span>
                                            </button>
                                            {projects.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase().trim())).map(p => {
                                                const Icon = getRandomIcon(p.id);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => { setProjectFilter(p.id); setProjectSearchQuery(''); setProjectPopoverOpen(false) }}
                                                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors", projectFilter === p.id ? "bg-accent text-accent-foreground" : "hover:bg-gray-100 text-left")}
                                                    >
                                                        <div className={cn("w-5 h-5 rounded-md flex items-center justify-center overflow-hidden shrink-0", p.icon ? 'bg-gray-100' : getRandomColor(p.id))}>
                                                            {p.icon ? <img src={p.icon} className="w-full h-full object-cover" /> : <Icon className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <span className="truncate">{p.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>

                            {/* Date Filter */}
                            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                                <SelectTrigger className="shrink-0 w-auto min-w-[160px] bg-white h-9 text-sm border-gray-200">
                                    <SelectValue placeholder="Date" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <span>All Dates</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="yesterday">
                                        <div className="flex items-center gap-2">
                                            <History className="w-4 h-4 text-orange-500" />
                                            <span>Yesterday</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="today">
                                        <div className="flex items-center gap-2">
                                            <CalendarCheck className="w-4 h-4 text-green-500" />
                                            <span>Today</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="tomorrow">
                                        <div className="flex items-center gap-2">
                                            <CalendarPlus className="w-4 h-4 text-blue-500" />
                                            <span>Tomorrow</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="pick_date">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-purple-500" />
                                            <span>Pick Date</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="custom">
                                        <div className="flex items-center gap-2">
                                            <CalendarRange className="w-4 h-4 text-indigo-500" />
                                            <span>Custom Range</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {(dateFilter === 'pick_date') && (
                                <div className="shrink-0 w-auto min-w-[170px]">
                                    <DatePicker date={customFromDate} setDate={setCustomFromDate} placeholder="Select Date" className="w-full bg-white h-9 text-sm" />
                                </div>
                            )}
                            {(dateFilter === 'custom') && (
                                <div className="flex items-center gap-2 shrink-0 w-auto">
                                    <DatePicker date={customFromDate} setDate={setCustomFromDate} placeholder="From" className="h-9 text-sm w-[130px] shrink-0 bg-white" />
                                    <DatePicker date={customToDate} setDate={setCustomToDate} placeholder="To" className="h-9 text-sm w-[130px] shrink-0 bg-white" minDate={customFromDate} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-4">
                    {isFetching && !tasks.length ? (
                        <div className="flex flex-col gap-4 w-full pb-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TaskCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
                            <p className="text-gray-500 mt-2 max-w-sm">
                                Try adjusting your filters or search query to find what you're looking for.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 w-full pb-4">
                            {tasks.map(task => (
                                <TaskRowCard
                                    key={task.id}
                                    task={task}
                                    onClick={() => {
                                        selectTask(task.id)
                                        openTaskDrawer(task.id)
                                    }}
                                />
                            ))}

                            {/* Pagination */}
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
                                                onClick={() => handlePageChange(Math.max(1, pagination.current_page - 1))}
                                                disabled={pagination.current_page === 1 || isFetching}
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
                                                onClick={() => handlePageChange(Math.min(pagination.last_page, pagination.current_page + 1))}
                                                disabled={pagination.current_page === pagination.last_page || isFetching}
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
            </div>
        </div>
    )
}

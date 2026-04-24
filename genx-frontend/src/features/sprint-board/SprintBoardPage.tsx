import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUIStore, useTaskUIStore, useAuthStore, useNotificationStore, isAdmin, getAccessLevel } from '@/stores'
import { useWebSockets } from '@/hooks/useWebSockets'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { organizationsApi } from '@/api/organizations'
import { projectsApi, mapBackendProjectToFrontend } from '@/api/projects'
import { sprintsApi } from '@/api/sprints'
import { priorityConfig } from '@/mock'
import type { Task, Sprint, User, Project } from '@/types'
import {
    ScrollArea,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Badge,
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui'
import { UserAvatar } from '@/components/UserAvatar'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { TaskRowCard } from '@/components/tasks/TaskRowCard'
import { BoardView } from '@/features/projects/components/BoardView'
import { Kanban, List, Search, LayoutGrid, Plus, Lock, Play, RotateCcw, Timer, Flag, Calendar, Users, ChevronDown } from 'lucide-react'
import { CreateSprintModal } from '@/components/modals/CreateSprintModal'
import { cn, getRandomColor, getRandomIcon, formatDate } from '@/lib/utils'
import { StandupView } from './components/StandupView'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'

export function SprintBoardPage() {
    const { sprintId: urlSprintId } = useParams()
    const navigate = useNavigate()
    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer } = useUIStore()
    const { user } = useAuthStore()
    const { show: showNotification } = useNotificationStore()

    useWebSockets()

    const [sprints, setSprints] = useState<Sprint[]>([])
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [members, setMembers] = useState<User[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [burndownData, setBurndownData] = useState<{ date: string; remaining: number; ideal: number }[]>([])
    const [orgSettings, setOrgSettings] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSprintsLoading, setIsSprintsLoading] = useState(true)
    const [tab, setTab] = useState<'board' | 'burndown'>('board')
    const [view, setView] = useState<'list' | 'board'>('list')
    const [searchQuery, setSearchQuery] = useState('')
    const [assigneeFilter, setAssigneeFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [projectFilter, setProjectFilter] = useState('all')
    const [projectSearchQuery, setProjectSearchQuery] = useState('')
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
    const [createSprintOpen, setCreateSprintOpen] = useState(false)
    const [closeModalOpen, setCloseModalOpen] = useState(false)
    const [closeModalData, setCloseModalData] = useState<{
        sprint: Sprint & { unclosed_tasks_count?: number }
        nextUpcoming: Sprint | null
    } | null>(null)
    const [closeInProgress, setCloseInProgress] = useState(false)
    const [errorModalOpen, setErrorModalOpen] = useState(false)
    const [errorModalContent, setErrorModalContent] = useState({ title: '', message: '' })
    const [isStandupMode, setIsStandupMode] = useState(false)
    const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
    const [projectPopoverOpen, setProjectPopoverOpen] = useState(false)
    const { setSidebarCollapsed } = useUIStore()

    // Standup mode sidebar management
    useEffect(() => {
        if (isStandupMode) {
            setSidebarCollapsed(true)
        } else {
            setSidebarCollapsed(false)
        }
    }, [isStandupMode, setSidebarCollapsed])

    const isUserAdmin = isAdmin(getAccessLevel(user))

    const fetchSprints = useCallback(async (): Promise<Sprint[]> => {
        try {
            const res = await sprintsApi.getAll({ filter: 'all', per_page: 50 })
            const list = res?.data?.data ?? res?.data ?? []
            const arr = Array.isArray(list) ? list : []
            setSprints(arr)
            if (arr.length > 0) {
                setSelectedSprintId((prev) => {
                    if (urlSprintId && arr.some((s: Sprint) => s.id === urlSprintId)) return urlSprintId
                    if (prev && arr.some((s: Sprint) => s.id === prev)) return prev
                    const current = arr.find((s: Sprint) => {
                        const start = new Date(s.start_date)
                        const end = new Date(s.end_date)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        start.setHours(0, 0, 0, 0)
                        end.setHours(0, 0, 0, 0)
                        return today >= start && today <= end
                    })
                    return current?.id ?? arr[0]?.id ?? null
                })
            }
            return arr
        } catch (e) {
            console.error('Failed to fetch sprints:', e)
            return []
        } finally {
            setIsSprintsLoading(false)
        }
    }, [urlSprintId])

    const fetchBoardData = useCallback(async (page = 1, isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true)
            const params: Record<string, any> = { sprint_id: selectedSprintId, page, per_page: 20 }
            if (searchQuery) params.search = searchQuery
            if (assigneeFilter !== 'all') params.assignee_id = assigneeFilter
            if (priorityFilter !== 'all') params.priority = priorityFilter
            if (projectFilter !== 'all') params.project_id = projectFilter

            const [tasksRes, membersRes, projectsRes, burndownRes, settingsRes] = await Promise.all([
                selectedSprintId ? tasksApi.getAll(params) : Promise.resolve({ data: [] }),
                organizationsApi.getMembers(),
                projectsApi.getAll(),
                selectedSprintId ? sprintsApi.getBurndown(selectedSprintId) : Promise.resolve({ success: true, data: [] }),
                organizationsApi.getSettings().catch(() => ({ success: false, data: null })),
            ])

            const tasksPayload = tasksRes?.data
            if (tasksPayload) {
                const list = Array.isArray(tasksPayload) ? tasksPayload : (tasksPayload.data ?? [])
                setTasks((Array.isArray(list) ? list : []).map((t: any) => mapBackendTaskToFrontend(t)))
                const meta = tasksPayload.meta ?? tasksPayload
                if (meta && typeof meta === 'object') {
                    setPagination({
                        current_page: meta.current_page ?? 1,
                        last_page: meta.last_page ?? 1,
                        total: meta.total ?? 0,
                    })
                }
            } else {
                setTasks([])
            }

            if (membersRes?.data) setMembers(membersRes.data)
            if (projectsRes?.data) {
                const projectsData = projectsRes.data.data ?? projectsRes.data
                setProjects((Array.isArray(projectsData) ? projectsData : []).map((p: any) => mapBackendProjectToFrontend(p)))
            }
            if (burndownRes?.success && Array.isArray(burndownRes.data)) {
                setBurndownData(burndownRes.data)
            } else {
                setBurndownData([])
            }
            if (settingsRes?.success && settingsRes.data) {
                setOrgSettings(settingsRes.data)
            }
        } catch (error) {
            console.error('Failed to fetch sprint board:', error)
            setTasks([])
        } finally {
            if (!isSilent) setIsLoading(false)
        }
    }, [user, selectedSprintId, searchQuery, assigneeFilter, priorityFilter, projectFilter])

    useEffect(() => {
        fetchSprints()
    }, [fetchSprints])

    useEffect(() => {
        if (urlSprintId) setSelectedSprintId(urlSprintId)
    }, [urlSprintId])

    useEffect(() => {
        fetchBoardData(1)
    }, [fetchBoardData])

    useEffect(() => {
        const onUpdate = () => fetchBoardData(pagination.current_page, true)
        window.addEventListener('task-updated', onUpdate)
        window.addEventListener('task-created', onUpdate)
        return () => {
            window.removeEventListener('task-updated', onUpdate)
            window.removeEventListener('task-created', onUpdate)
        }
    }, [fetchBoardData, pagination.current_page])

    const handleSprintChange = (sprintId: string) => {
        setSelectedSprintId(sprintId)
        navigate(sprintId ? `/sprint-board/${sprintId}` : '/sprint-board', { replace: true })
    }

    const handleCloseSprintClick = async () => {
        if (!selectedSprintId) return
        try {
            const [sprintRes, upcomingRes] = await Promise.all([
                sprintsApi.getById(selectedSprintId),
                sprintsApi.getAll({ filter: 'upcoming', per_page: 1 }),
            ])
            const sprint = sprintRes?.data ?? sprintRes
            const upcomingList = upcomingRes?.data?.data ?? upcomingRes?.data ?? []
            const nextUpcoming = Array.isArray(upcomingList) && upcomingList.length > 0 ? upcomingList[0] : null
            setCloseModalData({ sprint, nextUpcoming })
            setCloseModalOpen(true)
        } catch (e) {
            console.error('Failed to load sprint close data:', e)
            showNotification({ type: 'error', title: 'Error', message: 'Could not load sprint details.' })
        }
    }

    const handleCloseSprintConfirm = async (unclosedAction: 'backlog' | 'rollover', targetSprintId?: string) => {
        if (!selectedSprintId) return
        setCloseInProgress(true)
        try {
            await sprintsApi.close(selectedSprintId, {
                unclosed_action: unclosedAction,
                ...(unclosedAction === 'rollover' && targetSprintId ? { target_sprint_id: targetSprintId } : {}),
            })
            showNotification({ type: 'success', title: 'Sprint closed', message: 'The sprint has been closed successfully.' })
            setCloseModalOpen(false)
            setCloseModalData(null)
            const arr = await fetchSprints()
            const closedId = selectedSprintId
            const openSprints = arr.filter((s: Sprint) => s.id !== closedId && !s.closed_at && s.status !== 'closed')
            if (openSprints.length > 0) {
                setSelectedSprintId(openSprints[0].id)
                navigate(`/sprint-board/${openSprints[0].id}`, { replace: true })
            } else {
                fetchBoardData(1)
            }
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to close sprint.'
            showNotification({ type: 'error', title: 'Error', message: msg })
        } finally {
            setCloseInProgress(false)
        }
    }

    const handleStartSprintClick = async () => {
        if (!selectedSprintId) return
        try {
            await sprintsApi.start(selectedSprintId)
            showNotification({ type: 'success', title: 'Sprint started', message: 'The sprint has been started successfully.' })
            fetchSprints()
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to start sprint.'
            setErrorModalContent({ title: 'Could not start sprint', message: msg })
            setErrorModalOpen(true)
        }
    }

    const handleReopenSprintClick = async () => {
        if (!selectedSprintId) return
        try {
            await sprintsApi.reopen(selectedSprintId)
            showNotification({ type: 'success', title: 'Sprint reopened', message: 'The sprint has been reopened successfully.' })
            fetchSprints()
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to reopen sprint.'
            showNotification({ type: 'error', title: 'Error', message: msg })
        }
    }

    const selectedSprint = sprints.find(s => s.id === selectedSprintId)
    const isSprintPlanned = selectedSprint?.status === 'planned'
    const isSprintActive = selectedSprint?.status === 'active'
    const isSprintClosed = selectedSprint?.status === 'closed' || !!selectedSprint?.closed_at

    if (isStandupMode) {
        return (
            <StandupView
                members={members}
                sprintId={selectedSprintId}
                standupTimeMinutes={orgSettings?.standup_time_minutes ?? 2}
                onExit={() => setIsStandupMode(false)}
            />
        )
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col gap-6 shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-6 h-6 text-brand-600" />
                                <span>Sprint Board</span>
                            </div>
                            {selectedSprint && (
                                <Badge variant="outline" className={cn(
                                    "capitalize px-3 py-1 text-sm font-semibold border rounded-full",
                                    isSprintActive && "bg-green-50 text-green-700 border-green-200",
                                    isSprintPlanned && "bg-blue-50 text-blue-700 border-blue-200",
                                    isSprintClosed && "bg-red-50 text-red-700 border-red-200"
                                )}>
                                    {selectedSprint.status}
                                </Badge>
                            )}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {selectedSprint
                                ? `${selectedSprint.name} (${formatDate(selectedSprint.start_date)} – ${formatDate(selectedSprint.end_date)})`
                                : 'Select a sprint'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
                        <Button
                            variant="default"
                            onClick={() => setIsStandupMode(true)}
                            className="gap-1.5 shrink-0 bg-brand-600 hover:bg-brand-700 text-white shadow-sm h-10 sm:h-9 px-4 w-full sm:w-auto"
                        >
                            <Timer className="w-4 h-4" />
                            <span>Standup</span>
                        </Button>
                        <Select
                            value={selectedSprintId ?? ''}
                            onValueChange={(v) => handleSprintChange(v || '')}
                        >
                            <SelectTrigger className="w-full sm:w-[240px] bg-white h-10 sm:h-9 border-gray-200 hover:border-brand-300 transition-colors shadow-sm focus:ring-brand-500/20">
                                <div className="flex items-center gap-2 truncate">
                                    {selectedSprint ? (
                                        <div className="flex items-center gap-10 truncate">
                                            <span className="font-semibold text-sm text-gray-900 truncate">{selectedSprint.name}</span>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[9px] uppercase tracking-tighter px-1 h-3.5 border-none font-bold shrink-0",
                                                    selectedSprint.status === 'active' && "bg-green-100/80 text-green-700",
                                                    selectedSprint.status === 'planned' && "bg-blue-100/80 text-blue-700",
                                                    (selectedSprint.status === 'closed' || selectedSprint.closed_at) && "bg-gray-100/80 text-gray-600"
                                                )}
                                            >
                                                {selectedSprint.status}
                                            </Badge>
                                        </div>
                                    ) : (
                                        <SelectValue placeholder="Select sprint" />
                                    )}
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-gray-200 shadow-2xl shadow-brand-100/20 p-1 bg-white ring-1 ring-black/5">
                                {sprints.map((s, index) => (
                                    <SelectItem key={s.id} value={s.id} className={cn(
                                        "cursor-pointer rounded-xl py-2.5 px-3 focus:bg-brand-50/80 transition-colors",
                                        index !== sprints.length - 1 && "border-b border-gray-100 mb-0.5"
                                    )}>
                                        <div className="flex flex-col gap-1 w-full pr-2">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="font-semibold text-sm text-gray-900 truncate">
                                                    {s.name}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[9px] uppercase tracking-wider px-1.5 h-4 border-none font-bold shrink-0",
                                                        s.status === 'active' && "bg-green-100/80 text-green-700",
                                                        s.status === 'planned' && "bg-blue-100/80 text-blue-700",
                                                        (s.status === 'closed' || s.closed_at) && "bg-gray-100/80 text-gray-600"
                                                    )}
                                                >
                                                    {s.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                                                <Calendar className="w-3 h-3 opacity-60 shrink-0" />
                                                <span>{formatDate(s.start_date)}</span>
                                                <span className="opacity-30"> — </span>
                                                <span>{formatDate(s.end_date)}</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isUserAdmin && (
                            <Button variant="outline" onClick={() => setCreateSprintOpen(true)} className="gap-1.5 shrink-0 h-10 sm:h-9 border-brand-200 hover:border-brand-300 hover:bg-brand-50/50 shadow-sm w-full sm:w-auto">
                                <Plus className="w-4 h-4" />
                                <span>Create sprint</span>
                            </Button>
                        )}

                        {selectedSprintId && isUserAdmin && (
                            <>
                                {isSprintPlanned && (
                                    <Button variant="default" onClick={handleStartSprintClick} className="gap-1.5 shrink-0 bg-brand-600 hover:bg-brand-700 text-white shadow-sm h-10 sm:h-9 px-4 transition-all w-full sm:w-auto">
                                        <Play className="w-4 h-4 fill-current" />
                                        <span>Start sprint</span>
                                    </Button>
                                )}
                                {isSprintActive && (
                                    <Button variant="default" onClick={handleCloseSprintClick} className="gap-1.5 shrink-0 bg-brand-600 hover:bg-brand-700 text-white shadow-sm h-10 sm:h-9 px-4 transition-all w-full sm:w-auto">
                                        <Lock className="w-4 h-4" />
                                        <span>Close sprint</span>
                                    </Button>
                                )}
                                {isSprintClosed && (
                                    <Button variant="outline" onClick={handleReopenSprintClick} className="gap-1.5 shrink-0 h-10 sm:h-9 px-4 border-brand-200 hover:border-brand-300 hover:bg-brand-50/50 shadow-sm transition-all w-full sm:w-auto">
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Reopen sprint</span>
                                    </Button>
                                )}
                            </>
                        )}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                            <div className="flex bg-gray-100 p-1 rounded-lg shadow-inner shrink-0 flex-1 sm:flex-none">
                                <button
                                    onClick={() => setTab('board')}
                                    className={cn(
                                        'px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 flex-1 sm:flex-none text-center',
                                        tab === 'board'
                                            ? 'bg-brand-600 text-white shadow-md scale-105'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    )}
                                >
                                    Board
                                </button>
                                <button
                                    onClick={() => setTab('burndown')}
                                    className={cn(
                                        'px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 flex-1 sm:flex-none text-center',
                                        tab === 'burndown'
                                            ? 'bg-brand-600 text-white shadow-md scale-105'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    )}
                                >
                                    Burndown
                                </button>
                            </div>
                            {tab === 'board' && (
                                <div className="flex bg-gray-100 p-1 rounded-lg shadow-inner shrink-0">
                                    <button
                                        onClick={() => setView('list')}
                                        className={cn(
                                            'p-1.5 rounded-md transition-all duration-300',
                                            view === 'list'
                                                ? 'bg-brand-600 text-white shadow-md scale-105'
                                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                        )}
                                        title="List View"
                                    >
                                        <List className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                    <button
                                        onClick={() => setView('board')}
                                        className={cn(
                                            'p-1.5 rounded-md transition-all duration-300',
                                            view === 'board'
                                                ? 'bg-brand-600 text-white shadow-md scale-105'
                                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                        )}
                                        title="Board View"
                                    >
                                        <Kanban className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white w-full h-10 sm:h-9"
                        />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
                        <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full bg-white h-10 sm:h-9 text-sm justify-between font-normal px-2 lg:min-w-[140px]">
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
                                                <span className="truncate">All Assignees</span>
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
                                        <span>All Assignees</span>
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
                            <SelectTrigger className="w-full bg-white h-10 sm:h-9 lg:min-w-[140px]">
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
                            <Button variant="outline" className="w-full bg-white h-10 sm:h-9 text-sm justify-between font-normal px-2 col-span-2 sm:col-span-1 lg:min-w-[140px]">
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
                                                        project.icon ? "bg-gray-100" : getRandomColor(project.id)
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
                    </div>
                </div>
            </div>

            {isLoading || isSprintsLoading ? (
                <PageSkeleton />
            ) : tab === 'burndown' ? (
                !selectedSprintId ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select a sprint to view the burndown chart.
                    </div>
                ) : burndownData.length > 0 ? (
                    <Card className="flex-1">
                        <CardHeader className="py-3">
                            <CardTitle className="text-base">Burndown</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={burndownData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(v) =>
                                                new Date(v).toLocaleDateString('en', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })
                                            }
                                            stroke="#9CA3AF"
                                        />
                                        <YAxis stroke="#9CA3AF" />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="remaining"
                                            stroke="#6366F1"
                                            strokeWidth={2}
                                            dot={{ fill: '#6366F1' }}
                                            name="Remaining"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="ideal"
                                            stroke="#9CA3AF"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            name="Ideal"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        No burndown data available for this sprint yet.
                    </div>
                )
            ) : (
                !selectedSprintId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30 rounded-2xl border border-dashed border-gray-200 m-4">
                        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                            <LayoutGrid className="w-8 h-8 text-brand-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sprints Found</h3>
                        <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
                            {isUserAdmin
                                ? "Get started by creating your first sprint to organize your tasks, set timelines, and track your team's progress effectively."
                                : "There are currently no sprints scheduled. Please contact your administrator or project lead to plan a new sprint."}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        {view === 'board' ? (
                            <BoardView tasks={tasks} projectId="" />
                        ) : (
                            <ScrollArea className="flex-1 bg-gray-50/50 rounded-xl border border-gray-100">
                                <div className="space-y-3">
                                    {tasks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                                                <List className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <h4 className="text-base font-medium text-gray-900 mb-1">Sprint is Empty</h4>
                                            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                                                {isUserAdmin
                                                    ? "There are currently no tasks assigned to this sprint. Add tasks or move them from the backlog to begin your progress."
                                                    : "There are currently no tasks in this sprint. Please contact your administrator or project lead to assign tasks."}
                                            </p>
                                        </div>
                                    ) : (
                                        tasks.map((task) => (
                                            <TaskRowCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => {
                                                    selectTask(task.id)
                                                    openTaskDrawer(task.id)
                                                }}
                                            />
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                        {pagination.last_page > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-4">
                                <p className="text-sm text-gray-500 hidden sm:block">
                                    Showing page {pagination.current_page} of {pagination.last_page} ({pagination.total} total)
                                </p>
                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchBoardData(pagination.current_page - 1)}
                                        disabled={pagination.current_page === 1}
                                        className="h-8"
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(4, pagination.last_page) }, (_, i) => {
                                            let pageNum: number
                                            if (pagination.last_page <= 4) {
                                                pageNum = i + 1
                                            } else if (pagination.current_page <= 2) {
                                                pageNum = i + 1
                                            } else if (pagination.current_page >= pagination.last_page - 1) {
                                                pageNum = pagination.last_page - 3 + i
                                            } else {
                                                pageNum = pagination.current_page - 1 + i
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={pagination.current_page === pageNum ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => fetchBoardData(pageNum)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    {pageNum}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchBoardData(pagination.current_page + 1)}
                                        disabled={pagination.current_page === pagination.last_page}
                                        className="h-8"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            )}

            <CreateSprintModal
                open={createSprintOpen}
                onOpenChange={setCreateSprintOpen}
                onSuccess={async (sprintId) => {
                    await fetchSprints()
                    setSelectedSprintId(sprintId)
                    navigate(`/sprint-board/${sprintId}`, { replace: true })
                    fetchBoardData(1)
                }}
            />

            <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Close sprint</DialogTitle>
                    </DialogHeader>
                    {closeModalData && (
                        <>
                            {closeModalData.sprint.unclosed_tasks_count === 0 ? (
                                <p className="text-sm text-gray-600">
                                    Close &quot;{closeModalData.sprint.name}&quot;? All tasks in this sprint are completed.
                                </p>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    {closeModalData.sprint.unclosed_tasks_count} unclosed task(s) in this sprint. How do you want to handle them?
                                </p>
                            )}
                            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                {closeModalData.sprint.unclosed_tasks_count === 0 ? (
                                    <>
                                        <Button variant="outline" onClick={() => setCloseModalOpen(false)} disabled={closeInProgress}>
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => handleCloseSprintConfirm('backlog')}
                                            disabled={closeInProgress}
                                        >
                                            {closeInProgress ? 'Closing…' : 'Close sprint'}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="outline" onClick={() => setCloseModalOpen(false)} disabled={closeInProgress}>
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleCloseSprintConfirm('backlog')}
                                            disabled={closeInProgress}
                                        >
                                            {closeInProgress ? 'Closing…' : 'Move to backlog'}
                                        </Button>
                                        {closeModalData.nextUpcoming && (
                                            <Button
                                                onClick={() =>
                                                    handleCloseSprintConfirm('rollover', closeModalData.nextUpcoming!.id)
                                                }
                                                disabled={closeInProgress}
                                            >
                                                {closeInProgress ? 'Closing…' : `Rollover to next sprint (${closeModalData.nextUpcoming.name})`}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{errorModalContent.title}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <p className="text-sm text-gray-600">{errorModalContent.message}</p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setErrorModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

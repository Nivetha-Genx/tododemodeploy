import { useState, useEffect, useCallback } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    type DragEndEvent,
    type DragStartEvent,
    defaultDropAnimationSideEffects,
    type DropAnimation,
} from '@dnd-kit/core'
import { useUIStore, useTaskUIStore, useAuthStore, isAdmin, getAccessLevel } from '@/stores'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { sprintsApi } from '@/api/sprints'
import { useNotificationStore } from '@/stores/notificationStore'
import type { Task, Sprint } from '@/types'
import { BacklogRow, BacklogRowPreview } from '@/components/tasks/BacklogRow'
import {
    ScrollArea,
    Input,
    Button,
    Badge,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    ScrollBar,
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import {
    ListTodo,
    Search,
    Plus,
    ChevronDown,
    ChevronRight,
    LayoutList,
    LayoutGrid,
    Rows3,
    Play,
    Lock,
    RotateCcw,
} from 'lucide-react'
import { CreateSprintModal } from '@/components/modals/CreateSprintModal'
import { cn, getRandomColor, getRandomIcon } from '@/lib/utils'
import { projectsApi, mapBackendProjectToFrontend } from '@/api/projects'
import type { Project } from '@/types'

const BACKLOG_DROPPABLE_ID = 'backlog'

function DroppableSection({
    id,
    title,
    count,
    tasks,
    onTaskClick,
    isExpanded,
    onToggle,
    compact,
    status,
    isUserAdmin,
    onStartSprint,
    onCloseSprint,
    onReopenSprint,
}: {
    id: string
    title: string
    count: number
    tasks: Task[]
    onTaskClick: (taskId: string) => void
    isExpanded: boolean
    onToggle: () => void
    compact: boolean
    status?: string
    isUserAdmin?: boolean
    onStartSprint?: (id: string) => void
    onCloseSprint?: (id: string) => void
    onReopenSprint?: (id: string) => void
}) {
    const { setNodeRef, isOver } = useDroppable({ id })

    const isSprintPlanned = status === 'planned'
    const isSprintActive = status === 'active'
    const isSprintClosed = status === 'closed'

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'rounded border border-[#DFE1E6] bg-white overflow-hidden transition-colors',
                isOver && 'ring-2 ring-[#0052CC] ring-offset-2'
            )}
        >
            {/* Section header - Jira style */}
            <div
                className={cn(
                    'w-full flex items-center justify-between px-4 py-3',
                    'bg-[#F4F5F7] border-b border-[#DFE1E6]'
                )}
            >
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex items-center gap-2 text-left font-semibold text-[14px] text-[#172B4D]"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#6B778C] flex-shrink-0" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-[#6B778C] flex-shrink-0" />
                    )}
                    <span>{title}</span>
                    {status && (
                        <Badge variant="outline" className={cn(
                            "capitalize px-2 py-0.5 text-xs font-semibold border rounded-full",
                            status === 'active' && "bg-green-50 text-green-700 border-green-200",
                            status === 'planned' && "bg-blue-50 text-blue-700 border-blue-200",
                            (status === 'closed') && "bg-red-50 text-red-700 border-red-200"
                        )}>
                            {status}
                        </Badge>
                    )}
                    <span className="text-[13px] font-normal text-[#6B778C]">({count})</span>
                </button>

                {isUserAdmin && status && (
                    <div className="flex items-center gap-1">
                        {isSprintPlanned && (
                            <Button
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onStartSprint?.(id)
                                }}
                                className="h-7 px-3  text-white gap-1.5 border-none shadow-sm font-medium"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span className="text-xs hidden sm:inline">Start sprint</span>
                            </Button>
                        )}
                        {isSprintActive && (
                            <Button
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCloseSprint?.(id)
                                }}
                                className="h-7 px-3 bg-[#EBECF0] hover:bg-[#DFE1E6] text-[#172B4D] gap-1.5 border-none shadow-sm font-medium"
                            >
                                <Lock className="w-3.5 h-3.5" />
                                <span className="text-xs hidden sm:inline">Close sprint</span>
                            </Button>
                        )}
                        {isSprintClosed && (
                            <Button
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onReopenSprint?.(id)
                                }}
                                className="h-7 px-3 bg-[#EBECF0] hover:bg-[#DFE1E6] text-[#172B4D] gap-1.5 border-none shadow-sm font-medium"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="text-xs hidden sm:inline">Reopen sprint</span>
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Task list */}
            {isExpanded && (
                <div className="min-h-[80px]">
                    {tasks.length === 0 ? (
                        <div className="py-8 px-4 text-center text-[13px] text-[#6B778C]">
                            No Tasks — Drag items here or Create new ones
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <BacklogRow
                                key={task.id}
                                task={task}
                                onClick={() => onTaskClick(task.id)}
                                compact={compact}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export function BacklogPage() {
    const { openTaskDrawer } = useUIStore()
    const { selectTask } = useTaskUIStore()
    const { user } = useAuthStore()
    const { show } = useNotificationStore()

    const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
    const [sprints, setSprints] = useState<Sprint[]>([])
    const [sprintTasks, setSprintTasks] = useState<Record<string, Task[]>>({})
    const [projects, setProjects] = useState<Project[]>([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [isFetching, setIsFetching] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [projectFilter, setProjectFilter] = useState('all')
    const [projectSearchQuery, setProjectSearchQuery] = useState('')
    const [projectPopoverOpen, setProjectPopoverOpen] = useState(false)
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const [createSprintOpen, setCreateSprintOpen] = useState(false)
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ [BACKLOG_DROPPABLE_ID]: true })
    const [compact, setCompact] = useState(true)
    const [closeModalOpen, setCloseModalOpen] = useState(false)
    const [closeModalData, setCloseModalData] = useState<{
        sprint: Sprint & { unclosed_tasks_count?: number }
        nextUpcoming: Sprint | null
    } | null>(null)
    const [closeInProgress, setCloseInProgress] = useState(false)
    const isUserAdmin = isAdmin(getAccessLevel(user))

    const fetchData = useCallback(async (isSilent = false, isInitial = false) => {
        if (!user) return
        try {
            if (!isSilent) {
                if (isInitial) {
                    setInitialLoading(true)
                } else {
                    setIsFetching(true)
                }
            }

            const baseParams: any = { per_page: 100 }
            if (searchQuery.trim()) baseParams.search = searchQuery.trim()
            if (projectFilter !== 'all') baseParams.project_id = projectFilter

            const backlogParams = { ...baseParams, backlog: true }

            const [backlogRes, sprintsRes, projectsRes] = await Promise.all([
                tasksApi.getAll(backlogParams),
                sprintsApi.getAll({ filter: 'all', per_page: 20 }),
                projectsApi.getAll(),
            ])

            const backlogPayload = backlogRes?.data
            if (backlogPayload) {
                const list = Array.isArray(backlogPayload) ? backlogPayload : (backlogPayload.data ?? backlogPayload?.data ?? [])
                setBacklogTasks((Array.isArray(list) ? list : []).map((t: any) => mapBackendTaskToFrontend(t)))
            } else {
                setBacklogTasks([])
            }

            const sprintList: Sprint[] = sprintsRes?.data?.data ?? sprintsRes?.data ?? []
            setSprints(Array.isArray(sprintList) ? sprintList : [])

            const bySprint: Record<string, Task[]> = {}
            const sprintIds = Array.isArray(sprintList) ? sprintList.map((s: { id: string }) => s.id) : []
            await Promise.all(
                sprintIds.map(async (sprintId: string) => {
                    const sprintTaskParams = { ...baseParams, sprint_id: sprintId }
                    const res = await tasksApi.getAll(sprintTaskParams)
                    const payload = res?.data
                    const taskList = Array.isArray(payload) ? payload : (payload?.data ?? [])
                    bySprint[sprintId] = (Array.isArray(taskList) ? taskList : []).map((t: any) => mapBackendTaskToFrontend(t))
                })
            )
            setSprintTasks(bySprint)

            if (projectsRes?.data) {
                const projectsData = projectsRes.data.data || (Array.isArray(projectsRes.data) ? projectsRes.data : [])
                setProjects(projectsData.map(mapBackendProjectToFrontend))
            }
        } catch (error) {
            console.error('Failed to fetch backlog:', error)
            show({ type: 'error', title: 'Error', message: 'Could not load backlog.' })
        } finally {
            if (!isSilent) {
                setInitialLoading(false)
                setIsFetching(false)
            }
        }
    }, [user, show, searchQuery, projectFilter])

    const isInitialMount = useState(() => ({ current: true }))[0]

    useEffect(() => {
        const isInit = isInitialMount.current
        if (isInit) isInitialMount.current = false

        const timer = setTimeout(() => {
            fetchData(false, isInit)
        }, 300)
        return () => clearTimeout(timer)
    }, [fetchData])

    useEffect(() => {
        const onUpdate = () => fetchData(true)
        window.addEventListener('task-updated', onUpdate)
        window.addEventListener('task-created', onUpdate)
        return () => {
            window.removeEventListener('task-updated', onUpdate)
            window.removeEventListener('task-created', onUpdate)
        }
    }, [fetchData])

    const toggleSection = (id: string) => {
        setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    useEffect(() => {
        setExpandedSections((prev) => {
            let changed = false
            const next = { ...prev }
            sprints.forEach((s) => {
                if (next[s.id] === undefined) {
                    next[s.id] = true
                    changed = true
                }
            })
            return changed ? next : prev
        })
    }, [sprints])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    const handleDragStart = (event: DragStartEvent) => {
        const task = backlogTasks.find(t => t.id === event.active.id)
            ?? Object.values(sprintTasks).flat().find(t => t.id === event.active.id)
        if (task) setActiveTask(task)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)
        if (!over || active.id === over.id) return

        const taskId = String(active.id)
        const targetId = String(over.id)
        const newSprintId = targetId === BACKLOG_DROPPABLE_ID ? null : targetId

        const currentTask =
            backlogTasks.find(t => t.id === taskId) ??
            Object.values(sprintTasks).flat().find(t => t.id === taskId)
        if (!currentTask) return

        const prevSprintId = currentTask.sprintId ?? null
        if (newSprintId === prevSprintId) return

        // Snapshot previous state so we can revert if API fails
        const prevBacklogTasks = backlogTasks
        const prevSprintTasks = sprintTasks

        // Create shallow copies for optimistic update
        const nextBacklogTasks = [...backlogTasks]
        const nextSprintTasks: Record<string, Task[]> = {}
        Object.entries(sprintTasks).forEach(([id, tasks]) => {
            nextSprintTasks[id] = [...tasks]
        })

        // Remove task from previous location
        if (prevSprintId === null) {
            const idx = nextBacklogTasks.findIndex(t => t.id === taskId)
            if (idx !== -1) nextBacklogTasks.splice(idx, 1)
        } else {
            const currentList = nextSprintTasks[prevSprintId] ?? []
            nextSprintTasks[prevSprintId] = currentList.filter(t => t.id !== taskId)
        }

        // Add task to new location with updated sprintId
        const movedTask: Task = { ...currentTask, sprintId: newSprintId ?? undefined }

        if (newSprintId === null) {
            nextBacklogTasks.push(movedTask)
        } else {
            const targetList = nextSprintTasks[newSprintId] ?? []
            nextSprintTasks[newSprintId] = [...targetList, movedTask]
        }

        // Optimistic UI update
        setBacklogTasks(nextBacklogTasks)
        setSprintTasks(nextSprintTasks)

        try {
            const res = await tasksApi.update(taskId, { sprint_id: newSprintId })
            show({ type: 'success', title: 'Moved', message: res.message || 'Task moved successfully.' })
            // Optional silent refresh to sync with server
            fetchData(true)
        } catch (err: any) {
            console.error('Failed to move task:', err)
            // Revert optimistic move
            setBacklogTasks(prevBacklogTasks)
            setSprintTasks(prevSprintTasks)

            // Extract detailed error message
            let msg = 'Could not move task.'
            if (err?.response?.data) {
                const data = err.response.data
                if (data.errors) {
                    msg = Object.values(data.errors).flat().join(' ')
                } else if (data.message) {
                    msg = data.message
                }
            } else if (err?.message) {
                msg = err.message
            }

            show({ type: 'error', title: 'Task move failed', message: msg })
        }
    }

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
    }

    const filteredBacklog = backlogTasks

    const getTasksForSprint = (sprintId: string) => {
        return sprintTasks[sprintId] ?? []
    }

    const openTask = (taskId: string) => {
        selectTask(taskId)
        openTaskDrawer(taskId)
    }

    const handleStartSprintClick = async (sprintId: string) => {
        try {
            const res = await sprintsApi.start(sprintId)
            show({ type: 'success', title: 'Sprint started', message: res.message || 'The sprint has been started successfully.' })
            fetchData(true)
        } catch (e: any) {
            let msg = 'Failed to start sprint.'
            if (e?.response?.data) {
                const data = e.response.data
                if (data.errors) {
                    msg = Object.values(data.errors).flat().join(' ')
                } else if (data.message) {
                    msg = data.message
                }
            } else if (e?.message) {
                msg = e.message
            }
            show({ type: 'error', title: 'Could not start sprint', message: msg })
        }
    }

    const handleCloseSprintClick = async (sprintId: string) => {
        try {
            const [sprintRes, upcomingRes] = await Promise.all([
                sprintsApi.getById(sprintId),
                sprintsApi.getAll({ filter: 'upcoming', per_page: 1 }),
            ])
            const sprint = sprintRes?.data ?? sprintRes
            const upcomingList = upcomingRes?.data?.data ?? upcomingRes?.data ?? []
            const nextUpcoming = Array.isArray(upcomingList) && upcomingList.length > 0 ? upcomingList[0] : null
            setCloseModalData({ sprint, nextUpcoming })
            setCloseModalOpen(true)
        } catch (e) {
            console.error('Failed to load sprint close data:', e)
            show({ type: 'error', title: 'Error', message: 'Could not load sprint details.' })
        }
    }

    const handleCloseSprintConfirm = async (unclosedAction: 'backlog' | 'rollover', targetSprintId?: string) => {
        if (!closeModalData) return
        setCloseInProgress(true)
        try {
            const res = await sprintsApi.close(closeModalData.sprint.id, {
                unclosed_action: unclosedAction,
                ...(unclosedAction === 'rollover' && targetSprintId ? { target_sprint_id: targetSprintId } : {}),
            })
            show({ type: 'success', title: 'Sprint closed', message: res.message || 'The sprint has been closed successfully.' })
            setCloseModalOpen(false)
            setCloseModalData(null)
            fetchData(true)
        } catch (e: any) {
            let msg = 'Failed to close sprint.'
            if (e?.response?.data) {
                const data = e.response.data
                if (data.errors) {
                    msg = Object.values(data.errors).flat().join(' ')
                } else if (data.message) {
                    msg = data.message
                }
            } else if (e?.message) {
                msg = e.message
            }
            show({ type: 'error', title: 'Error', message: msg })
        } finally {
            setCloseInProgress(false)
        }
    }

    const handleReopenSprintClick = async (sprintId: string) => {
        try {
            const res = await sprintsApi.reopen(sprintId)
            show({ type: 'success', title: 'Sprint reopened', message: res.message || 'The sprint has been reopened successfully.' })
            fetchData(true)
        } catch (e: any) {
            let msg = 'Failed to reopen sprint.'
            if (e?.response?.data) {
                const data = e.response.data
                if (data.errors) {
                    msg = Object.values(data.errors).flat().join(' ')
                } else if (data.message) {
                    msg = data.message
                }
            } else if (e?.message) {
                msg = e.message
            }
            show({ type: 'error', title: 'Error', message: msg })
        }
    }

    if (initialLoading) {
        return <PageSkeleton />
    }

    return (
        <div className="h-full flex flex-col bg-[#F4F5F7]">
            {/* Jira-style header */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 bg-white border-b border-[#DFE1E6]">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
                                <ListTodo className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600 shrink-0" />
                                <span className="truncate">Backlog</span>
                            </h1>
                            <p className="text-gray-500 mt-1 text-sm">
                                Plan tasks and manage sprints to organize your team's work
                            </p>
                        </div>
                        {isUserAdmin && (
                            <Button
                                onClick={() => setCreateSprintOpen(true)}
                                className="text-white gap-1.5 shrink-0 shadow-sm h-8 px-3 sm:h-9 sm:px-4 text-xs sm:text-sm"
                            >
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span className="sm:hidden">Sprint</span>
                                <span className="hidden sm:inline">Create Sprint</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="relative flex-1 w-full lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-white border-gray-200 rounded-xl text-sm sm:text-base shadow-sm"
                            />
                            {isFetching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full lg:w-auto">
                            <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="flex-1 lg:w-[200px] h-10 bg-white border-gray-200 rounded-xl text-sm justify-between font-normal px-3 shadow-sm">
                                        <div className="flex items-center gap-2 truncate">
                                            {projectFilter !== 'all' ? (
                                                (() => {
                                                    const project = projects.find(p => p.id === projectFilter);
                                                    if (!project) return <span className="truncate">Project</span>;
                                                    const ProjectIcon = getRandomIcon(project.id);
                                                    return (
                                                        <>
                                                            <div className={cn(
                                                                "w-5 h-5 rounded flex items-center justify-center overflow-hidden shrink-0",
                                                                project.icon ? 'bg-gray-100' : getRandomColor(project.id)
                                                            )}>
                                                                {project.icon ? (
                                                                    <img src={project.icon} alt={project.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <ProjectIcon className="w-3 h-3" />
                                                                )}
                                                            </div>
                                                            <span className="truncate">{project.name}</span>
                                                        </>
                                                    );
                                                })()
                                            ) : (
                                                <>
                                                    <LayoutGrid className="w-4 h-4 text-gray-400" />
                                                    <span className="truncate">All projects</span>
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
                                                "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-colors mb-0.5",
                                                projectFilter === 'all' ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-gray-50/80"
                                            )}
                                        >
                                            <LayoutGrid className="w-4 h-4 text-gray-400" />
                                            <span>All projects</span>
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
                                                            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-colors mb-0.5",
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
                            {/* Density toggle - Hidden on extra small mobile */}
                            <div className="flex items-center bg-gray-100 p-1 rounded-lg shadow-inner shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setCompact(true)}
                                    className={cn(
                                        'px-2.5 py-1.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] rounded-md transition-all duration-300',
                                        compact
                                            ? 'bg-brand-600 text-white shadow-md scale-105'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    )}
                                    title="Compact"
                                >
                                    <Rows3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCompact(false)}
                                    className={cn(
                                        'px-2.5 py-1.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] rounded-md transition-all duration-300',
                                        !compact
                                            ? 'bg-brand-600 text-white shadow-md scale-105'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    )}
                                    title="Default"
                                >
                                    <LayoutList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-h-0 bg-white">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto lg:snap-x no-scrollbar divide-y lg:divide-y-0 lg:divide-x divide-[#DFE1E6]">
                        {/* Backlog Column */}
                        <div className="flex-1 flex flex-col min-h-[60vh] lg:min-w-0 lg:min-h-0 lg:snap-start shrink-0">
                            <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#F4F5F7] border-b border-[#DFE1E6] flex items-center justify-between shrink-0">
                                <h2 className="text-[10px] sm:text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">Backlog</h2>
                                <span className="text-[10px] sm:text-[11px] font-medium text-[#6B778C]">{filteredBacklog.length} Tasks</span>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 sm:p-6">
                                    <DroppableSection
                                        id={BACKLOG_DROPPABLE_ID}
                                        title="Backlog"
                                        count={filteredBacklog.length}
                                        tasks={filteredBacklog}
                                        onTaskClick={openTask}
                                        isExpanded={expandedSections[BACKLOG_DROPPABLE_ID] ?? true}
                                        onToggle={() => toggleSection(BACKLOG_DROPPABLE_ID)}
                                        compact={compact}
                                    />
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>

                        {/* Sprints Column */}
                        <div className="flex-1 flex flex-col min-h-[60vh] lg:min-w-0 lg:min-h-0 lg:snap-end shrink-0">
                            <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#F4F5F7] border-b border-[#DFE1E6] flex items-center justify-between shrink-0">
                                <h2 className="text-[10px] sm:text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">Sprints</h2>
                                <span className="text-[10px] sm:text-[11px] font-medium text-[#6B778C]">{sprints.length} SPRINTS</span>
                            </div>
                            <ScrollArea className="flex-1 bg-gray-50/30">
                                <div className="p-4 sm:p-6 space-y-4">
                                    {sprints.length === 0 ? (
                                        <div className="text-center py-20 px-4 border-2 border-dashed border-[#DFE1E6] rounded-xl bg-white">
                                            <div className="w-12 h-12 bg-[#F4F5F7] rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Plus className="w-6 h-6 text-[#6B778C]" />
                                            </div>
                                            <h3 className="text-[14px] font-semibold text-[#172B4D]">No active sprints</h3>
                                            <p className="text-[#6B778C] text-[13px] mt-1 mb-4">Plan your work by creating a new sprint</p>
                                            {isUserAdmin && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-[#0052CC] text-[#0052CC] hover:bg-[#DEEBFF]"
                                                    onClick={() => setCreateSprintOpen(true)}
                                                >
                                                    Create sprint
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        sprints.map((sprint) => (
                                            <DroppableSection
                                                key={sprint.id}
                                                id={sprint.id}
                                                title={sprint.name}
                                                count={getTasksForSprint(sprint.id).length}
                                                tasks={getTasksForSprint(sprint.id)}
                                                onTaskClick={openTask}
                                                isExpanded={expandedSections[sprint.id] ?? true}
                                                onToggle={() => toggleSection(sprint.id)}
                                                compact={compact}
                                                status={sprint.status}
                                                isUserAdmin={isUserAdmin}
                                                onStartSprint={handleStartSprintClick}
                                                onCloseSprint={handleCloseSprintClick}
                                                onReopenSprint={handleReopenSprintClick}
                                            />
                                        ))
                                    )}
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeTask ? (
                            <div className="w-[400px] pointer-events-none">
                                <BacklogRowPreview task={activeTask} compact={compact} />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <CreateSprintModal
                open={createSprintOpen}
                onOpenChange={setCreateSprintOpen}
                onSuccess={() => fetchData(true)}
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

        </div>
    )
}

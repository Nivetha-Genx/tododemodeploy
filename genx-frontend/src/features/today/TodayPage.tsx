import { useState, useEffect } from 'react'
import { useAuthStore, useUIStore, useTaskUIStore, useStatusStore } from '@/stores'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { Task } from '@/types'
import {Progress,Input,Button} from '@/components/ui'
import { PageSkeleton, TaskCardSkeleton } from '@/components/ui/modal-skeleton'
import { TaskRowCard } from '@/components/tasks/TaskRowCard'
import { Sun, Target, List, Kanban, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { BoardView } from '@/features/projects/components/BoardView'
import { cn, formatDateToLocalString, isOverdue } from '@/lib/utils'
import { StatusType } from '@/types'

export function TodayPage() {
    const { user } = useAuthStore()
    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer } = useUIStore()
    const { statuses } = useStatusStore()

    const [tasks, setTasks] = useState<Task[]>([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [isFetching, setIsFetching] = useState(false)
    const [view, setView] = useState<'list' | 'board'>('list')
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusType | 'all'>('all')
    const [showOverdue, setShowOverdue] = useState(true)
    const [showOnTime, setShowOnTime] = useState(true)
    const [showCompleted, setShowCompleted] = useState(true)

    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState({ last_page: 1, total: 0 })
    const perPage = 10

    const fetchTodayTasks = async (page = 1, isInitial = false) => {
        if (!user) return
        try {
            if (isInitial) {
                setInitialLoading(true)
            } else {
                setIsFetching(true)
            }
            const now = formatDateToLocalString(new Date())
            const reqData: any = {
                assignee_id: user.id,
                task_date: now,
                page: page,
                per_page: perPage
            }
            if (searchTerm.trim()) {
                reqData.search = searchTerm.trim()
            }
            if (statusFilter !== 'all') {
                reqData.status = statusFilter
            }
            const response = await tasksApi.getAll(reqData)
            if (response.data) {
                const payload = response.data
                const data = Array.isArray(payload) ? payload : (payload.data || [])
                setTasks(data.map(mapBackendTaskToFrontend))

                const meta = payload.meta || response.meta
                if (meta) {
                    setPagination({
                        last_page: meta.last_page || 1,
                        total: meta.total || data.length
                    })
                }
            }
        } catch (error) {
            console.error('Failed to fetch today tasks:', error)
        } finally {
            setInitialLoading(false)
            setIsFetching(false)
        }
    }

    const isInitialMount = useState(() => ({ current: true }))[0]

    useEffect(() => {
        const isInit = isInitialMount.current
        if (isInit) isInitialMount.current = false

        const timer = setTimeout(() => {
            fetchTodayTasks(currentPage, isInit)
        }, 300)
        return () => clearTimeout(timer)
    }, [user, currentPage, searchTerm, statusFilter])

    useEffect(() => {
        const handleRefresh = () => {
            if (!user) return
            const now = formatDateToLocalString(new Date())
            const reqData: any = {
                assignee_id: user.id,
                task_date: now,
                page: currentPage,
                per_page: perPage
            }
            if (searchTerm.trim()) {
                reqData.search = searchTerm.trim()
            }
            if (statusFilter !== 'all') {
                reqData.status = statusFilter
            }
            tasksApi.getAll(reqData).then(response => {
                if (response.data) {
                    const payload = response.data
                    const data = Array.isArray(payload) ? payload : (payload.data || [])
                    setTasks(data.map(mapBackendTaskToFrontend))

                    const meta = payload.meta || response.meta
                    if (meta) {
                        setPagination({
                            last_page: meta.last_page || 1,
                            total: meta.total || data.length
                        })
                    }
                }
            }).catch(error => {
                console.error('Failed to refresh today tasks:', error)
            })
        }
        window.addEventListener('task-created', handleRefresh)
        window.addEventListener('task-updated', handleRefresh)
        return () => {
            window.removeEventListener('task-created', handleRefresh)
            window.removeEventListener('task-updated', handleRefresh)
        }
    }, [user, currentPage, searchTerm, statusFilter])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, statusFilter])

    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const completionPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const onTimeTasks = tasks.filter(t => {
        if (t.status === 'completed') return false
        if (!t.dueDate) return true
        return !isOverdue(t.dueDate)
    })

    const todayLabel = new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })

    const getProgressColor = (percent: number) => {
        if (percent <= 20) return 'bg-lime-300'
        if (percent <= 40) return 'bg-lime-400'
        if (percent <= 60) return 'bg-lime-500'
        if (percent <= 80) return 'bg-lime-600'
        return 'bg-lime-700'
    }

    if (initialLoading) {
        return <PageSkeleton showSummaryCard />
    }

    return (
        <div className="space-y-6 h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between shrink-0 px-1">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Target className="w-6 h-6 text-brand-600" />
                        Today
                        <span className="text-gray-400 font-normal text-lg ml-2">
                            {todayLabel}
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {onTimeTasks.length} tasks scheduled for today
                    </p>
                </div>
                <div className="flex items-center bg-gray-100 p-1 rounded-lg shadow-inner">
                    <button
                        onClick={() => setView('list')}
                        className={cn(
                            "p-2 rounded-md transition-all duration-300",
                            view === 'list' ? "bg-brand-600 shadow-md text-white scale-105" : "text-gray-500 hover:text-gray-900"
                        )}
                        title="List View"
                    >
                        <List className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setView('board')}
                        className={cn(
                            "p-2 rounded-md transition-all duration-300",
                            view === 'board' ? "bg-brand-600 shadow-md text-white scale-105" : "text-gray-500 hover:text-gray-900"
                        )}
                        title="Board View"
                    >
                        <Kanban className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {view === 'board' ? (
                <div className="flex-1 h-full min-h-0">
                    <BoardView tasks={tasks} projectId="" />
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-gray-50/50 min-h-0">
                    {(tasks.length > 0 || searchTerm || statusFilter !== 'all') && (
                        <>
                            {/* Tasks Completed summary */}
                            <div className="mx-1 mb-4 rounded-3xl bg-white shadow-sm border border-gray-100 px-4 py-4 flex flex-col gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center shadow-sm">
                                        <Sun className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div className="flex flex-col gap-3 w-full">
                                        <div className="flex items-center gap-5 w-full">
                                            <p className="text-sm font-semibold text-gray-900">Tasks Completed</p>
                                            <span className="text-xs text-gray-400">
                                                {completedTasks} / {totalTasks}
                                            </span>
                                        </div>
                                        <Progress
                                            value={completionPercent}
                                            className="h-2 rounded-full bg-gray-100"
                                            indicatorClassName={cn("transition-all duration-500", getProgressColor(completionPercent))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="px-1 mb-4 shrink-0">
                                <div className="relative">
                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search blueprints, tasks..."
                                        className="pl-9 h-10 rounded-xl bg-white border-gray-200 shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Status Filter Badges */}
                            <div className="px-1 mb-4 shrink-0 overflow-hidden">
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
                                    <button
                                        onClick={() => setStatusFilter('all')}
                                        className={cn(
                                            "px-5 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-300 border",
                                            statusFilter === 'all'
                                                ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-100"
                                                : "bg-white border-gray-100 text-gray-400 hover:border-brand-200 hover:text-brand-600 hover:bg-brand-50/50"
                                        )}
                                    >
                                        All Tasks
                                    </button>
                                    {statuses
                                        .filter((s) => s.slug !== 'archived')
                                        .map((status) => (
                                            <button
                                                key={status.slug}
                                                onClick={() => setStatusFilter(status.slug)}
                                                className={cn(
                                                    "px-5 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-300 border",
                                                    statusFilter === status.slug
                                                        ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-100"
                                                        : "bg-white border-gray-100 text-gray-400 hover:border-brand-200 hover:text-brand-600 hover:bg-brand-50/50"
                                                )}
                                            >
                                                {status.name}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-4">
                        {tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                                    <Sun className="w-8 h-8 text-amber-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No tasks due today</h3>
                                <p className="text-gray-500 mt-2 max-w-sm">
                                    Enjoy your day! Or check your upcoming tasks to get ahead.
                                </p>
                            </div>
                        ) : isFetching ? (
                            <div className="flex flex-col gap-4 w-full pb-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <TaskCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 w-full pb-4">
                                {(() => {
                                    const pageTasks = tasks

                                    const overdueTasks = pageTasks.filter(t => {
                                        if (!t.dueDate || t.status === 'completed') return false
                                        return isOverdue(t.dueDate)
                                    })
                                    const completedTasks = pageTasks.filter(t => t.status === 'completed')
                                    const pageOnTimeTasks = pageTasks.filter(t => {
                                        if (t.status === 'completed') return false // Completed tasks go to completed section
                                        if (!t.dueDate) return true // Tasks without due date go to on-time
                                        return !isOverdue(t.dueDate)
                                    })

                                    return (
                                        <>
                                            {/* Overdue Section */}
                                            {overdueTasks.length > 0 && (
                                                <div className="space-y-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowOverdue(prev => !prev)}
                                                        className="w-full flex items-center justify-between px-1 text-sm font-semibold text-red-600"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                                                            Overdue Tasks ({overdueTasks.length})
                                                        </span>
                                                        <span className="text-red-500">
                                                            {showOverdue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </span>
                                                    </button>
                                                    {showOverdue && (
                                                        <div className="space-y-3">
                                                            {overdueTasks.map((task) => (
                                                                <TaskRowCard
                                                                    key={task.id}
                                                                    task={task}
                                                                    onClick={() => {
                                                                        selectTask(task.id)
                                                                        openTaskDrawer(task.id)
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Today's Tasks Section */}
                                            <div className="space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOnTime(prev => !prev)}
                                                    className="w-full flex items-center justify-between px-1 text-sm font-semibold text-gray-900 mt-2 hover:bg-gray-50/50 rounded-lg py-1 transition-colors group"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                                                        Today's Tasks ({pageOnTimeTasks.length})
                                                    </span>
                                                    <span className="text-gray-400 group-hover:text-gray-600">
                                                        {showOnTime ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </span>
                                                </button>
                                                {showOnTime && pageOnTimeTasks.length > 0 && (
                                                    <div className="space-y-3">
                                                        {pageOnTimeTasks.map((task) => (
                                                            <TaskRowCard
                                                                key={task.id}
                                                                task={task}
                                                                onClick={() => {
                                                                    selectTask(task.id)
                                                                    openTaskDrawer(task.id)
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Completed Tasks Section */}
                                            {completedTasks.length > 0 && (
                                                <div className="space-y-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCompleted(prev => !prev)}
                                                        className="w-full flex items-center justify-between px-1 text-sm font-semibold text-green-600 mt-2"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-green-600"></span>
                                                            Completed ({completedTasks.length})
                                                        </span>
                                                        <span className="text-green-500">
                                                            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </span>
                                                    </button>
                                                    {showCompleted && (
                                                        <div className="space-y-3">
                                                            {completedTasks.map((task) => (
                                                                <TaskRowCard
                                                                    key={task.id}
                                                                    task={task}
                                                                    onClick={() => {
                                                                        selectTask(task.id)
                                                                        openTaskDrawer(task.id)
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Unified Scrolling Pagination */}
                                            {pagination.last_page > 1 && (
                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 mt-6 border-t border-gray-100">
                                                    <p className="text-sm text-gray-500 order-3 sm:order-1 text-center sm:text-left">
                                                        Showing page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{pagination.last_page}</span> ({pagination.total} total)
                                                    </p>
                                                    <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                                                        <div className="flex items-center justify-center gap-1 flex-wrap w-full sm:w-auto">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                                disabled={currentPage === 1}
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
                                                                    } else if (currentPage <= 3) {
                                                                        pageNum = i + 1
                                                                    } else if (currentPage >= pagination.last_page - 2) {
                                                                        pageNum = pagination.last_page - 4 + i
                                                                    } else {
                                                                        pageNum = currentPage - 2 + i
                                                                    }
                                                                    return (
                                                                        <Button
                                                                            key={pageNum}
                                                                            variant={currentPage === pageNum ? 'default' : 'outline'}
                                                                            size="sm"
                                                                            onClick={() => setCurrentPage(pageNum)}
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
                                                                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                                                                disabled={currentPage === pagination.last_page}
                                                                className="h-9 px-3"
                                                            >
                                                                <span className="hidden xs:inline">Next</span>
                                                                <ChevronRight className="w-4 h-4 ml-1" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

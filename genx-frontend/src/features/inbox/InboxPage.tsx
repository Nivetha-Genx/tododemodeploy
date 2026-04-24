import { useState, useEffect } from 'react'
import { useAuthStore, useUIStore, useTaskUIStore, useStatusStore } from '@/stores'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { Task, StatusType } from '@/types'
import {
    Progress,
    Input,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { TaskRowCard } from '@/components/tasks/TaskRowCard'
import { Inbox, CheckCircle2, List, Kanban, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { BoardView } from '@/features/projects/components/BoardView'
import { cn } from '@/lib/utils'

// Helper to get date-only comparison (ignoring time)
const getDateOnly = (date: Date): Date => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

const isOverdue = (dueDate: string): boolean => {
    const due = getDateOnly(new Date(dueDate))
    const today = getDateOnly(new Date())
    return due < today
}

export function InboxPage() {
    const { user } = useAuthStore()
    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer } = useUIStore()
    const { statuses } = useStatusStore()

    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [view, setView] = useState<'list' | 'board'>('list')
    const [showOverdue, setShowOverdue] = useState(true)
    const [showUpcoming, setShowUpcoming] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusType | 'all'>('all')

    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState({ last_page: 1, total: 0 })
    const perPage = 10

    const fetchInboxTasks = async (page = 1, isSilent = false) => {
        if (!user) return
        try {
            if (!isSilent) setIsLoading(true)
            const response = await tasksApi.getAll({
                assignee_id: user.id,
                page: page,
                per_page: perPage
            })
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
            console.error('Failed to fetch inbox tasks:', error)
        } finally {
            if (!isSilent) setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchInboxTasks(currentPage)
    }, [user, currentPage])

    useEffect(() => {
        const handleRefresh = () => fetchInboxTasks(currentPage, true)
        window.addEventListener('task-created', handleRefresh)
        window.addEventListener('task-updated', handleRefresh)
        return () => {
            window.removeEventListener('task-created', handleRefresh)
            window.removeEventListener('task-updated', handleRefresh)
        }
    }, [user, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, statusFilter])

    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const completionPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const todayLabel = new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })

    if (isLoading) {
        return <PageSkeleton showSummaryCard />
    }

    return (
        <div className="h-full flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0 px-1 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {todayLabel}
                    </h1>
                </div>
                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setView('list')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            view === 'list' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-900"
                        )}
                        title="List View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setView('board')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            view === 'board' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-900"
                        )}
                        title="Board View"
                    >
                        <Kanban className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {view === 'board' ? (
                <div className="flex-1 h-full min-h-0">
                    <BoardView tasks={tasks} projectId="" />
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-gray-50/50 min-h-0 overflow-hidden">
                    {totalTasks > 0 && (
                        <>
                            {/* Tasks Completed summary */}
                            <div className="mx-1 mt-0 mb-4 rounded-3xl bg-white shadow-sm border border-gray-100 px-4 py-4 flex flex-col gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center shadow-sm">
                                        <Inbox className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <div className="flex flex-col gap-3 w-full">
                                        <div className="flex items-center gap-5 w-full">
                                            <p className="text-sm font-semibold text-gray-900">Tasks Completed</p>
                                            <span className="text-xs text-gray-400">
                                                {completedTasks} / {totalTasks}
                                            </span>
                                        </div>
                                        <Progress value={completionPercent} className="h-2 rounded-full" />
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
                            <div className="px-1 mb-4 shrink-0">
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                    <button
                                        onClick={() => setStatusFilter('all')}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                                            statusFilter === 'all'
                                                ? "bg-brand-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        )}
                                    >
                                        All
                                    </button>
                                    {statuses.map((status) => (
                                        <button
                                            key={status.slug}
                                            onClick={() => setStatusFilter(status.slug)}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                                                statusFilter === status.slug
                                                    ? "bg-brand-600 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            )}
                                        >
                                            {status.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex-1 overflow-y-auto min-h-0 pb-4">
                        <div className="w-full px-1">
                            {tasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                                    <p className="text-gray-500 mt-2 max-w-sm">
                                        You have no pending tasks in your inbox.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 w-full">
                                    {(() => {
                                        const normalizedSearch = searchTerm.trim().toLowerCase()
                                        let baseTasks = normalizedSearch
                                            ? tasks.filter(t =>
                                                t.title.toLowerCase().includes(normalizedSearch) ||
                                                (t.taskId && t.taskId.toLowerCase().includes(normalizedSearch))
                                            )
                                            : tasks

                                        // Apply status filter
                                        if (statusFilter !== 'all') {
                                            baseTasks = baseTasks.filter(t => t.status === statusFilter)
                                        }

                                        const overdueTasks = baseTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed')
                                        const upcomingTasks = baseTasks.filter(t => !(isOverdue(t.dueDate) && t.status !== 'completed'))

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

                                                {/* Other Tasks Section */}
                                                {upcomingTasks.length > 0 && (
                                                    <div className="space-y-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowUpcoming(prev => !prev)}
                                                            className="w-full flex items-center justify-between px-1 text-sm font-semibold text-gray-600 mt-2"
                                                        >
                                                            <span>
                                                                {overdueTasks.length > 0 ? 'Today & Upcoming' : 'All Tasks'}
                                                            </span>
                                                            <span className="text-gray-500">
                                                                {showUpcoming ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </span>
                                                        </button>
                                                        {showUpcoming && (
                                                            <div className="space-y-3">
                                                                {upcomingTasks.map((task) => (
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
                                            </>
                                        )
                                    })()}
                                </div>
                            )}
                        </div>

                        {pagination.last_page > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 shrink-0 pb-4 px-2">
                                <p className="text-sm text-gray-500 hidden sm:block">
                                    Showing page {currentPage} of {pagination.last_page} ({pagination.total} total)
                                </p>
                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-3 rounded-md border border-gray-200 bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(4, pagination.last_page) }, (_, i) => {
                                            let pageNum: number
                                            if (pagination.last_page <= 4) {
                                                pageNum = i + 1
                                            } else if (currentPage <= 2) {
                                                pageNum = i + 1
                                            } else if (currentPage >= pagination.last_page - 1) {
                                                pageNum = pagination.last_page - 3 + i
                                            } else {
                                                pageNum = currentPage - 1 + i
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={cn(
                                                        "h-8 w-8 rounded-md border text-sm font-medium transition-colors",
                                                        currentPage === pageNum
                                                            ? "bg-brand-600 border-brand-600 text-white"
                                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {pageNum}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                                        disabled={currentPage === pagination.last_page}
                                        className="h-8 px-3 rounded-md border border-gray-200 bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

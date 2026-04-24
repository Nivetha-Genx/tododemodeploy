import { useState, useEffect } from 'react'
import { useAuthStore, useTaskUIStore, useUIStore } from '@/stores'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { Task } from '@/types'
import {
    ScrollArea,
    Input,
    Button,
} from '@/components/ui'
import { PageSkeleton, TaskCardSkeleton } from '@/components/ui/modal-skeleton'
import { Archive, Search, List, Kanban, ChevronLeft, ChevronRight } from 'lucide-react'
import { TaskRowCard } from '@/components/tasks/TaskRowCard'
import { BoardView } from '@/features/projects/components/BoardView'
import { cn } from '@/lib/utils'

export function ArchivedTasksPage() {
    const { user } = useAuthStore()
    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer } = useUIStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [tasks, setTasks] = useState<Task[]>([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [isFetching, setIsFetching] = useState(false)
    const [view, setView] = useState<'list' | 'board'>('list')

    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState({ last_page: 1, total: 0 })
    const perPage = 10

    const fetchArchivedTasks = async (page = 1, isSilent = false, isInitial = false) => {
        if (!user) return
        try {
            if (!isSilent) {
                if (isInitial) {
                    setInitialLoading(true)
                } else {
                    setIsFetching(true)
                }
            }
            const reqData: any = {
                status: 'archived',
                assignee_id: user.id,
                page: page,
                per_page: perPage
            }
            if (searchQuery.trim()) {
                reqData.search = searchQuery.trim()
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
            console.error('Failed to fetch archived tasks', error)
        } finally {
            if (!isSilent) {
                setInitialLoading(false)
                setIsFetching(false)
            }
        }
    }

    const isInitialMount = useState(() => ({ current: true }))[0]

    useEffect(() => {
        const isInit = isInitialMount.current
        if (isInit) isInitialMount.current = false

        const timer = setTimeout(() => {
            fetchArchivedTasks(currentPage, false, isInit)
        }, 300)
        return () => clearTimeout(timer)
    }, [user, currentPage, searchQuery])

    useEffect(() => {
        const handleRefresh = () => fetchArchivedTasks(currentPage, true)
        window.addEventListener('task-updated', handleRefresh)
        window.addEventListener('task-created', handleRefresh)
        return () => {
            window.removeEventListener('task-updated', handleRefresh)
            window.removeEventListener('task-created', handleRefresh)
        }
    }, [user, currentPage, searchQuery])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    if (initialLoading) {
        return <PageSkeleton />
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Archive className="w-6 h-6 text-gray-500" />
                        Archived Tasks
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Deleted tasks that were assigned to you
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

            <div className="relative w-full shrink-0 px-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Search archived tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-white border-gray-200 shadow-sm"
                />
            </div>

            {view === 'board' ? (
                <div className="flex-1 h-full min-h-0">
                    <BoardView tasks={tasks} projectId="" />
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    <ScrollArea className="flex-1">
                        {tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Archive className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No archived tasks found</h3>
                                <p className="text-gray-500 mt-2 max-w-sm">
                                    Empty archive! Tasks you delete will appear here if you were the assignee.
                                </p>
                            </div>
                        ) : isFetching ? (
                            <div className="flex flex-col gap-3 pb-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <TaskCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 pb-4">
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
                                            Showing page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{pagination.last_page}</span> ({pagination.total} total)
                                        </p>
                                        <div className="flex items-center justify-center gap-1 flex-wrap w-full sm:w-auto order-1 sm:order-2">
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
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>
    )
}

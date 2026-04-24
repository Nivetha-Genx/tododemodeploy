import { useState, useEffect } from 'react'
import { useAuthStore, useTaskUIStore, useUIStore } from '@/stores'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import type { Task } from '@/types'
import { priorityConfig } from '@/mock'
import {
    Card,
    CardContent,
    Button,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatDateToLocalString, parseISOToLocal } from '@/lib/utils'

export function CalendarPage() {
    const { user } = useAuthStore()
    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer } = useUIStore()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchCalendarTasks = async () => {
            if (!user) return
            try {
                setIsLoading(true)
                const response = await tasksApi.getAll({
                    assignee_id: user.id,
                    page: 1,
                    per_page: 10
                })
                if (response?.data) {
                    const data = Array.isArray(response.data) ? response.data : response.data.data || []
                    setTasks(data.map(mapBackendTaskToFrontend))
                } else {
                    setTasks([])
                }
            } catch (error) {
                console.error('Failed to fetch calendar tasks:', error)
                setTasks([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchCalendarTasks()
    }, [user])

    useEffect(() => {
        const handleRefresh = () => {
            if (!user) return
            tasksApi
                .getAll({
                    assignee_id: user.id,
                    page: 1,
                    per_page: 10
                })
                .then((response) => {
                    if (response?.data) {
                        const data = Array.isArray(response.data) ? response.data : response.data.data || []
                        setTasks(data.map(mapBackendTaskToFrontend))
                    }
                })
                .catch((error) => {
                    console.error('Failed to refresh calendar tasks:', error)
                })
        }

        window.addEventListener('task-created', handleRefresh)
        window.addEventListener('task-updated', handleRefresh)

        return () => {
            window.removeEventListener('task-created', handleRefresh)
            window.removeEventListener('task-updated', handleRefresh)
        }
    }, [user])

    // Filter tasks for the current month
    const monthTasks = tasks.filter((task) => {
        const taskDate = task.dueDate ? parseISOToLocal(task.dueDate) : null
        if (!taskDate) return false
        return (
            task.assigneeId === user?.id &&
            taskDate.getMonth() === currentDate.getMonth() &&
            taskDate.getFullYear() === currentDate.getFullYear()
        )
    })

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const todayStr = formatDateToLocalString(new Date())

    if (isLoading) {
        return <PageSkeleton />
    }

    return (
        <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                        Calendar
                    </h1>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-start bg-white rounded-lg border border-gray-200 p-1 w-full sm:w-auto">
                        <Button variant="ghost" size="sm" onClick={prevMonth}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="min-w-[120px] sm:min-w-[140px] text-center font-medium text-sm sm:text-base">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <Button variant="ghost" size="sm" onClick={nextMonth}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="p-0 flex-1 flex flex-col">
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 border-b border-gray-200">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-2 text-center text-[10px] sm:text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-100 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                        {paddingDays.map(day => (
                            <div key={`padding-${day}`} className="bg-gray-50/50 border-b border-r border-gray-100 p-1 sm:p-2" />
                        ))}

                        {days.map((day) => {
                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
                                2,
                                '0'
                            )}-${String(day).padStart(2, '0')}`
                            const dayTasks = monthTasks.filter((t) => {
                                if (!t.dueDate) return false
                                const due = new Date(t.dueDate)
                                return formatDateToLocalString(due) === dateStr
                            })

                            return (
                                <div key={day} className="border-b border-r border-gray-100 p-1 sm:p-2 min-h-[70px] sm:min-h-[100px] hover:bg-gray-50 transition-colors overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                                        <span className={cn(
                                            "text-[10px] sm:text-sm w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full",
                                            dateStr === todayStr
                                                ? "bg-brand-600 text-white font-bold"
                                                : "text-gray-700"
                                        )}>
                                            {day}
                                        </span>
                                        {dayTasks.length > 0 && (
                                            <span className="text-[8px] sm:text-xs text-gray-400 font-medium">
                                                {dayTasks.length} <span className="hidden sm:inline">tasks</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-0.5 sm:space-y-1">
                                        {dayTasks.map(task => {
                                            const priority = priorityConfig[task.priority]
                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => {
                                                        selectTask(task.id)
                                                        openTaskDrawer(task.id)
                                                    }}
                                                    className="p-0.5 sm:p-1 px-1 sm:px-2 rounded-[2px] sm:rounded text-[8px] sm:text-xs font-medium cursor-pointer truncate border hover:shadow-sm"
                                                    style={{
                                                        backgroundColor: priority.bgColor,
                                                        color: priority.color,
                                                        borderColor: `${priority.color}40`,
                                                    }}
                                                >
                                                    {task.title}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

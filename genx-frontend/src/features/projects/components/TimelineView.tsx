import { Card } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { Task } from '@/types'
import { ChevronRight } from 'lucide-react'

interface TimelineViewProps {
    projectId: string
    tasks: Task[]
}

export function TimelineView({ projectId, tasks }: TimelineViewProps) {
    void projectId
    // Sort tasks by start date
    const sortedTasks = [...tasks].sort((a, b) =>
        new Date(a.startDate || a.createdAt).getTime() - new Date(b.startDate || b.createdAt).getTime()
    )

    // Calculate timeline range
    const dates = sortedTasks.flatMap(t => [new Date(t.startDate || t.createdAt), new Date(t.dueDate)])
    const minDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date()
    const maxDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date()

    // Add buffer
    minDate.setDate(minDate.getDate() - 2)
    maxDate.setDate(maxDate.getDate() + 5)

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    const days = Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(minDate)
        d.setDate(d.getDate() + i)
        return d
    })

    const getPosition = (dateStr: string) => {
        const date = new Date(dateStr)
        const diff = Math.ceil((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
        return Math.max(0, diff)
    }

    const getDuration = (startStr: string, endStr: string) => {
        const start = new Date(startStr)
        const end = new Date(endStr)
        return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    }

    const getStatusColor = (status: string) => {
        const map: Record<string, string> = {
            todo: 'bg-gray-200 border-gray-300 text-gray-700',
            in_progress: 'bg-blue-100 border-blue-200 text-blue-700',
            review: 'bg-yellow-100 border-yellow-200 text-yellow-700',
            done: 'bg-green-100 border-green-200 text-green-700',
            blocked: 'bg-red-100 border-red-200 text-red-700'
        }
        return map[status] || map.todo
    }

    return (
        <Card className="overflow-hidden border-gray-200">
            <div className="overflow-x-auto">
                <div className="min-w-[800px] relative">
                    {/* Header: Months/Days */}
                    <div className="flex border-b border-gray-100 bg-gray-50/50">
                        <div className="w-64 flex-shrink-0 p-3 border-r border-gray-100 font-medium text-sm text-gray-600 bg-white sticky left-0 z-20">
                            Task
                        </div>
                        <div className="flex-1 flex text-xs">
                            {days.map((d, i) => (
                                <div
                                    key={i}
                                    className={`flex-shrink-0 w-10 text-center py-2 border-r border-gray-50 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50' : ''}`}
                                >
                                    <div className="font-semibold text-gray-500">{d.getDate()}</div>
                                    <div className="text-[10px] text-gray-400 uppercase">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-100">
                        {tasks.map(task => {
                            const start = task.startDate || task.createdAt
                            const left = getPosition(start) * 40 // 40px per day col width
                            const width = getDuration(start, task.dueDate) * 40

                            return (
                                <div key={task.id} className="flex hover:bg-gray-50 group">
                                    <div className="w-64 flex-shrink-0 p-3 border-r border-gray-100 bg-white sticky left-0 z-10 flex items-center justify-between group-hover:bg-gray-50">
                                        <div className="truncate pr-2">
                                            <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <span>{task.taskId}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100" />
                                    </div>
                                    <div className="flex-1 relative h-14 bg-white group-hover:bg-gray-50">
                                        {/* Grid lines background */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {days.map((d, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex-shrink-0 w-10 border-r border-dashed border-gray-100 h-full ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50/30' : ''}`}
                                                />
                                            ))}
                                        </div>

                                        {/* Task Bar */}
                                        <div
                                            className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-md border text-xs flex items-center px-3 truncate shadow-sm transition-all hover:brightness-95 cursor-pointer ${getStatusColor(task.status)}`}
                                            style={{
                                                left: `${left}px`,
                                                width: `${width}px`
                                            }}
                                            title={`${task.title} (${formatDate(start)} - ${formatDate(task.dueDate)})`}
                                        >
                                            <span className="truncate font-medium">{task.title}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Card>
    )
}

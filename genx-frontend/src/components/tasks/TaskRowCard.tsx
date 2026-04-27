import {
    Calendar,
    Briefcase,
    Tag,
} from 'lucide-react'

import { cn, formatDate, formatHoursMinutes, isOverdue } from '@/lib/utils'
import { Task } from '@/types'
import { priorityConfig } from '@/mock'
import { useStatusStore } from '@/stores'
import { UserAvatar } from '@/components/UserAvatar'

interface TaskRowCardProps {
    task: Task
    onClick?: () => void
    showDuePrefix?: boolean
}

export function TaskRowCard({ task, onClick, showDuePrefix }: TaskRowCardProps) {
    const { getStatusStyles } = useStatusStore()
    const priority = priorityConfig[task.priority]

    // Calculate progress
    const logged = task.timeLogs?.reduce((acc, log) => acc + log.hours, 0) || task.loggedHours || 0
    const estimated = task.estimatedHours || 1 // Avoid division by zero

    const effectiveDueDate = task.dueDate || task.startDate
    const isOverdueTask = isOverdue(effectiveDueDate) && task.status !== 'completed'

    const status = getStatusStyles(task.status)
    const progress = estimated > 0 ? (logged / estimated) * 100 : 0

    // Determine if the date is today
    const today = new Date().toISOString().split('T')[0]
    const isToday = effectiveDueDate === today

    return (
        <div
            onClick={onClick}
            className="group relative bg-white border border-gray-200 p-3 sm:px-4 sm:py-3 rounded-2xl shadow-sm mb-2.5 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-[0_8px_30px_rgba(99,102,241,0.12)]"
        >
            <div className="flex flex-col gap-2">
                {/* Header: Title and Priority */}
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-[15px] sm:text-base font-semibold text-slate-800 transition-colors line-clamp-1 leading-tight group-hover:text-brand-600">
                        {task.title}
                    </h3>
                    <div
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-black/5 shadow-sm shrink-0"
                        style={{ backgroundColor: priority.bgColor, color: priority.color }}
                    >
                        <Tag className="w-2.5 h-2.5" />
                        {priority.label}
                    </div>
                </div>

                {/* Meta Info: Date, Project, Assignee */}
                <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium min-w-0">
                        <div className={cn(
                            "flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shrink-0",
                            isOverdueTask ? "text-red-600 font-bold bg-red-50 border-red-50" : "text-slate-500"
                        )}>
                            <Calendar className="w-3 h-3" />
                            <span className="whitespace-nowrap">{showDuePrefix && isOverdueTask ? 'Due ' : ''}{isToday ? 'Today' : formatDate(effectiveDueDate)}</span>
                        </div>

                        {task.projectName && (
                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 min-w-0 flex-shrink">
                                <Briefcase className="w-3 h-3 text-brand-400 shrink-0" />
                                <span className="max-w-[100px] truncate">{task.projectName}</span>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 min-w-0 flex-shrink">
                            <UserAvatar
                                user={{
                                    id: task.assigneeId || '',
                                    name: task.assigneeName || 'Unassigned',
                                    avatar: task.assigneeAvatar
                                }}
                                className="h-4 w-4 shadow-sm shrink-0"
                                fallbackClassName="text-[8px]"
                            />
                            <span className="max-w-[80px] truncate text-slate-500">{task.assigneeName || 'Unassigned'}</span>
                        </div>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="mt-1">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out",
                                progress > 100 ? "bg-red-500" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>

                    {/* Footer Progress Text */}
                    <div className="flex justify-between items-center mt-2.5 text-[11px] font-semibold">
                        <div className="flex items-center gap-1.5">
                            <span className="text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full text-[10px]">{Math.round(progress)}%</span>
                            <span
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                                style={{ color: status.color, backgroundColor: status.bgColor }}
                            >
                                {status.label}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1 text-[11px]">
                                {formatHoursMinutes(logged)} / {formatHoursMinutes(task.estimatedHours || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


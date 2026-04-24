import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragStartEvent,
    type DragOverEvent,
    type DragEndEvent,
    type DropAnimation,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { priorityConfig } from '@/mock'
import { Calendar, Briefcase, Plus, Tag } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui'
import { UserAvatar } from '@/components/UserAvatar'
import type { Task, StatusType } from '@/types'
import { createPortal } from 'react-dom'
import { tasksApi } from '@/api/tasks'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatDate, formatHoursMinutes, isOverdue, getErrorMessage } from '@/lib/utils'

interface BoardViewProps {
    projectId: string
    tasks?: Task[]
    onTaskClick?: (taskId: string) => void
    onAddTaskClick?: (statusId: string) => void
}

import { useUIStore, useStatusStore } from '@/stores'

// Draggable Task Card Component
function TaskCard({ task, isOverlay = false, onTaskClick }: { task: Task; isOverlay?: boolean; onTaskClick?: (taskId: string) => void }) {
    const { openTaskDrawer } = useUIStore()
    const { getStatusStyles } = useStatusStore()
    const [isLongPressing, setIsLongPressing] = useState(false)
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
        disabled: isOverlay,
    })

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
            }
        }
    }, [])

    // Reset visual feedback when dragging ends
    useEffect(() => {
        if (!isDragging) {
            setIsLongPressing(false)
        }
    }, [isDragging])

    // Merged touch handlers for visual feedback + dnd-kit's listeners
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Call dnd-kit's touch handler first
        const dndkitHandler = listeners?.onTouchStart as ((e: React.TouchEvent) => void) | undefined
        dndkitHandler?.(e)

        const touch = e.touches[0]
        if (!touch) return

        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }

        // Start long press timer for visual feedback (slightly before dnd-kit activates)
        longPressTimerRef.current = setTimeout(() => {
            setIsLongPressing(true)
        }, 200)
    }, [listeners])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        // Call dnd-kit's touch handler
        const dndkitHandler = listeners?.onTouchMove as ((e: React.TouchEvent) => void) | undefined
        dndkitHandler?.(e)

        const touch = e.touches[0]
        if (!touch || !touchStartPosRef.current) return

        const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x)
        const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y)

        // If moved significantly before long press completes, cancel visual feedback
        if (deltaX > 10 || deltaY > 10) {
            setIsLongPressing(false)
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
            }
        }
    }, [listeners])

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        // Call dnd-kit's touch handler
        const dndkitHandler = listeners?.onTouchEnd as ((e: React.TouchEvent) => void) | undefined
        dndkitHandler?.(e)

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
        touchStartPosRef.current = null
        if (!isDragging) {
            setIsLongPressing(false)
        }
    }, [listeners, isDragging])

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const priority = priorityConfig[task.priority]
    const status = getStatusStyles(task.status)
    const logged = task.timeLogs?.reduce((acc, log) => acc + log.hours, 0) || task.loggedHours || 0
    const estimated = task.estimatedHours || 0
    const progress = estimated > 0 ? (logged / estimated) * 100 : 0

    const effectiveDueDate = task.dueDate || task.startDate
    const isOverdueTask = isOverdue(effectiveDueDate) && task.status !== 'completed'
    
    // Determine if the date is today
    const today = new Date().toISOString().split('T')[0]
    const isToday = effectiveDueDate === today

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onClick={() => {
                if (onTaskClick) {
                    onTaskClick(task.id)
                } else {
                    openTaskDrawer(task.id)
                }
            }}
            className={cn(
                "group bg-white hover:bg-slate-50 transition-all cursor-grab active:cursor-grabbing border border-gray-100 p-4 rounded-3xl shadow-sm relative mb-2",
                isDragging ? "opacity-30" : "opacity-100",
                isOverlay ? "cursor-grabbing ring-2 ring-primary rotate-2 shadow-xl z-50" : "",
                isLongPressing && !isDragging ? "ring-2 ring-blue-400 ring-opacity-50 scale-[1.02] z-10 shadow-lg" : ""
            )}
        >
            <div className="flex flex-col gap-2">
                {/* Header: Title and Priority */}
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-sm font-semibold text-slate-800 transition-colors line-clamp-2 leading-tight group-hover:text-primary">
                        {task.title}
                    </h3>
                    <div 
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap border border-black/5 shrink-0"
                        style={{ backgroundColor: priority.bgColor, color: priority.color }}
                    >
                        <Tag className="w-2.5 h-2.5" />
                        {priority.label}
                    </div>
                </div>

                {/* Meta Info: Date and Assignee */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400 text-[10px] font-medium">
                    <div className={cn(
                        "flex items-center gap-1",
                        isOverdueTask ? "text-red-500 font-bold" : "text-slate-400"
                    )}>
                        <Calendar className="w-3 h-3" />
                        <span>{isToday ? 'Today' : formatDate(effectiveDueDate)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {task.projectName && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 border border-slate-200 text-indigo-700 overflow-hidden shrink-0">
                                        {task.projectIcon ? (
                                            task.projectIcon.startsWith('http') || task.projectIcon.startsWith('/') ? (
                                                <img src={task.projectIcon} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[8px]">{task.projectIcon}</span>
                                            )
                                        ) : (
                                            <Briefcase className="w-3 h-3" />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{task.projectName}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="shrink-0">
                                    <UserAvatar
                                        user={{
                                            id: task.assigneeId || '',
                                            name: task.assigneeName || 'Unassigned',
                                            avatar: task.assigneeAvatar
                                        }}
                                        className="h-5 w-5 shadow-sm"
                                        fallbackClassName="text-[6px]"
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{task.assigneeName || 'Unassigned'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="mt-1">
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-gray-100/50">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out",
                                progress > 100 ? "bg-red-500" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 text-[10px] font-bold">
                        <div className="flex items-center gap-1.5">
                            <span className="text-brand-600 bg-brand-50 px-1 py-0.5 rounded-md">{Math.round(progress)}%</span>
                            <span 
                                className="px-1.5 py-0.5 rounded-md"
                                style={{ color: status.color, backgroundColor: `${status.color}15` }}
                            >
                                {status.label}
                            </span>
                        </div>
                        
                        <div className="text-slate-400 font-medium">
                            {formatHoursMinutes(logged)} / {formatHoursMinutes(estimated)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BoardColumn({ id, title, tasks, color, bgColor, onTaskClick, onAddTaskClick }: { id: string; title: string; tasks: Task[]; color: string; bgColor: string; onTaskClick?: (taskId: string) => void; onAddTaskClick?: (statusId: string) => void }) {
    const status = { label: title, color, bgColor }

    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: 'Column',
        },
        disabled: true // Columns themselves not sortable in this version
    })

    return (
        <div ref={setNodeRef} className="flex flex-col h-full rounded-xl border border-gray-100 min-w-[260px] max-w-[300px] w-full" style={{ backgroundColor: status.bgColor }}>
            {/* Column Header */}
            <div className="p-3 pb-2 flex items-center justify-between sticky top-0 backdrop-blur-sm z-10 rounded-t-xl" style={{ backgroundColor: status.bgColor }}>
                <div className="flex items-center gap-2">
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                    />
                    <h3 className="font-semibold text-sm text-gray-700">{status.label}</h3>
                    <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {tasks.length}
                    </span>
                </div>
            </div>

            {/* Droppable Area */}
            <div className="flex-1 p-2 overflow-y-auto flex flex-col">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 min-h-[100px]">
                        {tasks.map((task) => (
                            <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
                        ))}
                    </div>
                </SortableContext>

                {onAddTaskClick && (id === 'new' || id === 'in_progress') && (
                    <button
                        onClick={() => onAddTaskClick(id)}
                        className="mt-3 flex items-center justify-center w-full py-2.5 rounded-xl border border-dashed border-gray-300/60 bg-white/40 text-gray-400 hover:bg-white/80 hover:text-gray-600 hover:border-gray-400 hover:shadow-sm transition-all duration-200 group relative overflow-hidden backdrop-blur-[2px] cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent group-hover:from-white/60 group-hover:to-white/20 transition-colors" />
                        <div className="flex items-center gap-2 relative z-10">
                            <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-semibold tracking-wide">Create Task</span>
                        </div>
                    </button>
                )}
            </div>
        </div>
    )
}

export function BoardView({ projectId, tasks: initialTasks, onTaskClick, onAddTaskClick }: BoardViewProps) {
    // Suppress unused warning for demo
    void projectId
    const { toast } = useToast()
    const [tasks, setTasks] = useState<Task[]>(initialTasks || [])
    const { statuses } = useStatusStore()

    // Update internal tasks when initialTasks prop changes
    useEffect(() => {
        if (initialTasks) {
            setTasks(initialTasks)
        }
    }, [initialTasks])

    const [activeTask, setActiveTask] = useState<Task | null>(null)

    const columns = useMemo(() => {
        // Create columns from fetched statuses, sorted by order
        return statuses
            .sort((a, b) => a.order - b.order)
            .map(status => ({
                id: status.slug,
                title: status.name,
                color: status.color || '#6b7280',
                bgColor: status.color ? `${status.color}20` : '#f3f4f6',
                tasks: tasks.filter(t => t.status === status.slug)
            }))
    }, [tasks, statuses])

    // MouseSensor for desktop (click and drag immediately)
    // TouchSensor for mobile (long press 300ms before drag)
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5, // 5px movement to start drag on desktop
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 300, // 300ms long press required on mobile
                tolerance: 10, // Allow 10px movement during delay
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const task = tasks.find(t => t.id === active.id)
        if (task) {
            setActiveTask(task)
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const activeTask = tasks.find(t => t.id === activeId)
        if (!activeTask) return
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) {
            setActiveTask(null)
            return
        }

        const activeId = active.id
        const overId = over.id

        const activeTask = tasks.find(t => t.id === activeId)
        if (!activeTask) {
            setActiveTask(null)
            return
        }

        // Check if dropped on a column
        let newStatus: string | null = null
        const statusSlugs = statuses.map(s => s.slug)
        if (statusSlugs.includes(overId as string)) {
            newStatus = overId as string
        } else {
            // Check if dropped on another task
            const overTask = tasks.find(t => t.id === overId)
            if (overTask) {
                newStatus = overTask.status
            }
        }

        if (newStatus && newStatus !== activeTask.status) {
            const taskId = activeId as string
            const updatedStatus = newStatus as StatusType

            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.id === activeId ? { ...t, status: updatedStatus } : t
            ))

            // Persist to API
            tasksApi.updateStatus(taskId, updatedStatus)
                .then(() => {
                    window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId } }))
                    const isCompleted = updatedStatus === 'completed'


                    toast({
                        description: isCompleted
                            ? "Task marked as done"
                            : "Task status updated",
                        variant: isCompleted ? "success" : "info",
                    })
                })
                .catch((error) => {
                    console.error('Failed to update task status:', error)
                    // Revert on failure
                    setTasks(prev => prev.map(t =>
                        t.id === activeId ? { ...t, status: activeTask.status } : t
                    ))
                    toast({
                        description: getErrorMessage(error),
                        variant: "destructive",
                    })
                })
        }

        setActiveTask(null)
    }

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    }

    return (
        <div className="h-full overflow-x-auto pb-4">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full gap-4 min-w-max px-1">
                    {columns.map(col => (
                        <BoardColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            tasks={col.tasks}
                            color={col.color}
                            bgColor={col.bgColor}
                            onTaskClick={onTaskClick}
                            onAddTaskClick={onAddTaskClick}
                        />
                    ))}
                </div>

                {createPortal(
                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeTask ? (
                            <div className="w-[260px]">
                                <TaskCard task={activeTask} isOverlay />
                            </div>
                        ) : null}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </div>
    )
}

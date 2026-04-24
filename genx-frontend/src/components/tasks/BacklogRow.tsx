import { useDraggable } from '@dnd-kit/core'
import { GripVertical, ListTodo } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { priorityConfig } from '@/mock'
import { useStatusStore } from '@/stores'
import { cn, formatDate, isOverdue, stripHtml } from '@/lib/utils'
import type { Task } from '@/types'

/** Shared row content - pure presentational */
function RowContent({ task, compact, showDragHandle, dragHandle }: {
    task: Task
    compact: boolean
    showDragHandle: boolean
    dragHandle?: React.ReactNode
}) {
    const { getStatusStyles } = useStatusStore()
    const priority = priorityConfig[task.priority]
    const status = getStatusStyles(task.status)
    const hasSubtasks = task.subtasks && task.subtasks.length > 0
    const completedSubtasks = hasSubtasks ? task.subtasks.filter(st => st.status === 'completed').length : 0
    const isOverdueTask = isOverdue(task.dueDate) && task.status !== 'completed'

    // Removed manual 10-char truncation to rely on CSS truncate for better flexibility.
    const displayTitle = task.title

    return (
        <>
            {/* Left side: Key + Title */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {showDragHandle && (
                    <div className="w-5 flex-shrink-0 flex items-center justify-center">
                        {dragHandle}
                    </div>
                )}
                {!showDragHandle && <span className="w-5 flex-shrink-0" />}

                <span className="w-20 flex-shrink-0 text-[13px] font-medium text-[#0052CC] truncate">
                    {task.taskId}
                </span>

                <div className="w-5 flex-shrink-0 flex items-center text-[#6B778C]">
                    <ListTodo className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 md:max-w-[250px] lg:max-w-[400px]" title={task.title}>
                    <span className="text-[14px] text-[#172B4D] truncate block font-medium">
                        {displayTitle}
                    </span>
                    {!compact && task.description && (
                        <span className="text-[12px] text-[#6B778C] truncate block mt-0.5">{stripHtml(task.description)}</span>
                    )}
                </div>
            </div>

            {/* Right side: Metadata (Priority, Avatar, Points, Status, Date) */}
            <div className="flex items-center gap-2 shrink-0 px-2 ml-auto">
                {/* Subtasks */}
                {hasSubtasks && (
                    <div className="flex-shrink-0 w-10 flex items-center gap-1 text-[12px] text-[#6B778C]">
                        <ListTodo className="w-3.5 h-3.5" />
                        <span>{completedSubtasks}/{task.subtasks.length}</span>
                    </div>
                )}

                {/* Priority */}
                <div className="w-4 flex-shrink-0 flex items-center justify-center" title={priority?.label}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill={priority?.color ?? '#6B778C'}>
                        <circle cx="8" cy="8" r="5" />
                    </svg>
                </div>

                {/* Assignee */}
                <div className="flex-shrink-0 w-6 flex items-center">
                    <UserAvatar
                        user={{ id: task.assigneeId || '', name: task.assigneeName || 'Unassigned', avatar: task.assigneeAvatar }}
                        className="h-6 w-6"
                        fallbackClassName="text-[9px]"
                    />
                </div>

                {/* Story points column */}
                <div className="flex-shrink-0 w-7 text-center items-center justify-center">
                    {task.storyPoints != null && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-[10px] font-medium bg-[#F4F5F7] text-[#5E6C84]">
                            {task.storyPoints}
                        </span>
                    )}
                </div>

                {/* Status */}
                <div className="flex-shrink-0 w-16">
                    <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider truncate max-w-full text-center"
                        style={{ backgroundColor: status.bgColor, color: status.color }}
                    >
                        {status.label}
                    </span>
                </div>

                {/* Due date */}
                <div
                    className={cn(
                        'flex-shrink-0 w-20 text-[11px] text-right whitespace-nowrap',
                        isOverdueTask ? 'text-[#DE350B] font-medium' : 'text-[#6B778C]'
                    )}
                >
                    {task.dueDate ? formatDate(task.dueDate) : '-'}
                </div>
            </div>
        </>
    )
}

/** Jira-style compact backlog row - draggable */
export function BacklogRow({ task, onClick, compact = true }: { task: Task; onClick: () => void; compact?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } })
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
    const dragHandle = (
        <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 text-[#6B778C] hover:text-[#172B4D] transition-opacity"
            onClick={(e) => e.stopPropagation()}
        >
            <GripVertical className="w-4 h-4" />
        </div>
    )

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={cn(
                'group flex items-center gap-3 px-3 py-2 bg-white border-b border-[#DFE1E6] last:border-b-0',
                'hover:bg-[#F4F5F7] cursor-pointer transition-colors min-w-[500px] sm:min-w-[600px]',
                isDragging && 'opacity-60 shadow-lg bg-white z-50 rounded'
            )}
        >
            <RowContent task={task} compact={compact} showDragHandle={true} dragHandle={dragHandle} />
        </div>
    )
}

/** Static preview for DragOverlay - no useDraggable */
export function BacklogRowPreview({ task, compact = true }: { task: Task; compact?: boolean }) {
    return (
        <div
            className={cn(
                'flex items-center gap-3 px-3 py-2 bg-white rounded border border-[#DFE1E6]',
                'shadow-lg min-w-[500px] sm:min-w-[600px]'
            )}
        >
            <RowContent task={task} compact={compact} showDragHandle={false} />
        </div>
    )
}

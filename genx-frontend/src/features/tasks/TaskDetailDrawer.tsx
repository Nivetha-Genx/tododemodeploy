import React from 'react'
import { useUIStore, useAuthStore, canApproveRequests, getAccessLevel, isAdmin, isTeamLead } from '@/stores'
import { priorityConfig } from '@/mock'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { useStatusStore } from '@/stores/statusStore'
import { projectsApi, mapBackendProjectToFrontend } from '@/api/projects'
import { organizationsApi } from '@/api/organizations'
import { sprintsApi } from '@/api/sprints'
import { attachmentsApi } from '@/api/attachments'
import { RichTextEditor } from '@/components/ui'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Badge,
    Button,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Progress,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Textarea,
    Input,
    Label,
    DetailDrawerSkeleton,
} from '@/components/ui'

import {
    BottomSheet,
    BottomSheetContent,
    BottomSheetHeader,
    BottomSheetTitle,
} from '@/components/ui/bottom-sheet'
import { UserAvatar } from '@/components/UserAvatar'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatDate, formatDateTime, formatHours, formatHoursMinutes, formatRelativeTime, getInitials, isOverdue, parseISOToLocal, getRandomColor, getRandomIcon, getErrorMessage, stripHtml } from '@/lib/utils'
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    Plus,
    Send,
    UserRound,
    Flag,
    CalendarDays,
    Activity,
    FolderKanban,
    ChevronRight,
    Search,
    X,
    Paperclip,
    Download,
    Trash2,
    Edit2,
    LayoutGrid,
    Hash,
    ChevronDown,
    Eye,
    Loader2,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { StatusType, Priority, Task, Subtask, Attachment, Project } from '@/types'
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

import { z } from 'zod'

// Helper to format date as YYYY-MM-DD in local timezone (avoids UTC conversion issues)
const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Helper to get today's date at midnight
const getTodayDate = (): Date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

const isImageFile = (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    const extension = filename.split('.').pop()?.toLowerCase()
    return extension ? imageExtensions.includes(extension) : false
}



// Hook to detect mobile vs desktop
function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const media = window.matchMedia(query)
        if (media.matches !== matches) {
            setMatches(media.matches)
        }
        const listener = () => setMatches(media.matches)
        media.addEventListener('change', listener)
        return () => media.removeEventListener('change', listener)
    }, [matches, query])

    return matches
}

import { useWebSockets } from '@/hooks/useWebSockets'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
const updateTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
    description: z.string().optional(),
    status: z.string(),
    priority: z.string(),
    assignee_id: z.string().optional(),
    project_id: z.string().optional(),
    sprint_id: z.string().optional(),
    story_points: z.union([z.string(), z.number()]).optional(),
})

type UpdateTaskValues = z.infer<typeof updateTaskSchema>

interface FieldRowProps {
    icon: React.ReactNode
    label: string
    required?: boolean
    value?: string
    placeholder?: string
    onClick?: () => void
    error?: string
    rightContent?: React.ReactNode
}

function FieldRow({ icon, label, required, value, placeholder, onClick, error, rightContent }: FieldRowProps) {
    return (
        <div className="w-full">
            <button
                type="button"
                onClick={onClick}
                className="w-full flex items-center gap-3 py-3 px-0 text-left hover:bg-gray-50 transition-colors rounded-lg"
            >
                <div className="flex-shrink-0 text-gray-500">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-0.5">
                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </div>
                    <div className={`text-sm ${value ? "text-gray-900" : "text-gray-400"} truncate`}>
                        {value || placeholder}
                    </div>
                </div>
                {rightContent || <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />}
            </button>
            {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
        </div>
    )
}


export function TaskDetailDrawer() {
    const { taskDrawerOpen, taskDrawerId, closeTaskDrawer, openModal, openTaskDrawer, setIsOpeningTask } = useUIStore()

    const { toast } = useToast()
    const { user } = useAuthStore()
    const isUserAdmin = isAdmin(getAccessLevel(user))
    const isUserTeamLead = isTeamLead(getAccessLevel(user))
    const isDesktop = useMediaQuery('(min-width: 768px)')
    const [activeTab, setActiveTab] = useState('timelog')
    const [newComment, setNewComment] = useState('')
    const [logDate, setLogDate] = useState(() => {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    })
    const [logHours, setLogHours] = useState('')
    const [logMinutes, setLogMinutes] = useState('')
    const [logDescription, setLogDescription] = useState('')
    const [editingLogId, setEditingLogId] = useState<string | null>(null)
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
    const [isLogDialogOpen, setIsLogDialogOpen] = useState(false)
    const [isLogDeleteDialogOpen, setIsLogDeleteDialogOpen] = useState(false)
    const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
    const [isAttachmentDeleteDialogOpen, setIsAttachmentDeleteDialogOpen] = useState(false)
    const [isDeletingAttachment, setIsDeletingAttachment] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
    const [isLoggingHours, setIsLoggingHours] = useState(false)
    const [isSubmittingComment, setIsSubmittingComment] = useState(false)
    const [isUpdatingEstimation, setIsUpdatingEstimation] = useState(false)

    const [comments, setComments] = useState<any[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [timeLogs, setTimeLogs] = useState<any[]>([])
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
    const attachmentFileInputRef = useRef<HTMLInputElement>(null)
    const [projectMembers, setProjectMembers] = useState<any[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [, setHasChanges] = useState(false)
    const [pendingDueDateRequest, setPendingDueDateRequest] = useState<any>(null)

    // Bottom sheet states
    const [statusSheetOpen, setStatusSheetOpen] = useState(false)
    const [prioritySheetOpen, setPrioritySheetOpen] = useState(false)
    const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false)
    const [assigneeSearch, setAssigneeSearch] = useState('')
    const [projectSheetOpen, setProjectSheetOpen] = useState(false)
    const [projectSearch, setProjectSearch] = useState('')
    const [startDateSheetOpen, setStartDateSheetOpen] = useState(false)
    const [dueDateSheetOpen, setDueDateSheetOpen] = useState(false)
    const [hoursSheetOpen, setHoursSheetOpen] = useState(false)
    const [hoursInput, setHoursInput] = useState('')
    const [minutesInput, setMinutesInput] = useState('')
    const [estimationError, setEstimationError] = useState<string | null>(null)
    const [sprintEnabled, setSprintEnabled] = useState(false)
    const [sprints, setSprints] = useState<{ id: string; name: string; start_date: string; end_date: string }[]>([])
    const [isDescriptionEditorActive, setIsDescriptionEditorActive] = useState(false)
    const wasDescriptionEditedRef = useRef(false)

    const [task, setTask] = useState<Task | null>(null)
    const { statuses, getStatusStyles } = useStatusStore()
    const [rootTaskDates, setRootTaskDates] = useState<{ startDate: string; dueDate: string } | null>(null)

    const originalValuesRef = useRef<UpdateTaskValues | null>(null)
    const isClosingRef = useRef(false)
    const isSavingRef = useRef(false)
    const savePromiseRef = useRef<Promise<void> | null>(null)



    const {
        register,
        handleSubmit,
        control,
        reset,
        getValues,
        watch,
        setValue,
        formState: { errors },
    } = useForm<UpdateTaskValues>({
        resolver: zodResolver(updateTaskSchema),
    })


    // Dynamic rows for title textarea based on length
    const currentTitle = watch('title') || ''
    const titleRows = currentTitle.length > 45 ? 2 : 1

    useEffect(() => {
        // Tiptap handles focus automatically in its effect
    }, [isDescriptionEditorActive])

    useEffect(() => {
        if (taskDrawerId) {
            setTask(null)
            setComments([])
            setHistory([])
            setTimeLogs([])
            setAttachments([])
            setProjectMembers([])
            setPendingDueDateRequest(null)
            setStartDateSheetOpen(false)
            setDueDateSheetOpen(false)
            setStatusSheetOpen(false)
            setPrioritySheetOpen(false)
            setAssigneeSheetOpen(false)
            setProjectSheetOpen(false)
            setHoursSheetOpen(false)
            setIsLogDialogOpen(false)
            fetchTaskDetails()
        }
    }, [taskDrawerId])

    // Real-time updates via WebSockets
    useWebSockets(taskDrawerId)

    useEffect(() => {
        const handleRefresh = () => {
            if (taskDrawerId) fetchTaskDetails()
        }
        window.addEventListener('task-created', handleRefresh)
        window.addEventListener('task-updated', handleRefresh)
        window.addEventListener('comment-added', handleRefresh)
        return () => {
            window.removeEventListener('task-created', handleRefresh)
            window.removeEventListener('task-updated', handleRefresh)
            window.removeEventListener('comment-added', handleRefresh)
        }
    }, [taskDrawerId])

    const fetchTaskDetails = async () => {
        if (!taskDrawerId) return
        try {
            setIsOpeningTask(true)
            setIsLoadingData(true)
            const [fullTaskRes, projectsRes, settingsRes] = await Promise.all([
                tasksApi.getFull(taskDrawerId),
                projectsApi.getAll((isUserAdmin || isUserTeamLead) ? undefined : { assignee_id: getValues('assignee_id') }).catch(() => ({ data: [] })),
                organizationsApi.getSettings().catch(() => ({ success: false, data: null })),
            ])

            const fullTaskData = fullTaskRes?.data ?? {}

            const taskRes = { success: true, data: fullTaskData.task }
            const commentsRes = { success: true, data: fullTaskData.comments ?? [] }
            const historyRes = { success: true, data: fullTaskData.history ?? [] }
            const timeLogsRes = { success: true, data: fullTaskData.time_logs ?? [] }
            const pendingRequestsRes = { success: true, data: fullTaskData.pending_due_date_requests ?? [] }
            if (settingsRes?.success && settingsRes.data?.sprint_enabled) {
                setSprintEnabled(true)
                try {
                    const sprintsRes = await sprintsApi.getAll({ filter: 'all', per_page: 50 })
                    const list = sprintsRes?.data?.data ?? sprintsRes?.data ?? []
                    setSprints(Array.isArray(list) ? list : [])
                } catch {
                    setSprints([])
                }
            } else {
                setSprintEnabled(false)
                setSprints([])
            }

            if (taskRes.success && taskRes.data) {
                const frontendTask = mapBackendTaskToFrontend(taskRes.data);
                setTask(frontendTask)
                setAttachments(frontendTask.attachments || [])

                // If the task is itself a subtask, fetch the root task to get its date range
                // The root task is breadcrumbs[0], or the parentId if no breadcrumbs
                if (frontendTask.parentId) {
                    try {
                        const rootId = frontendTask.breadcrumbs && frontendTask.breadcrumbs.length > 0
                            ? frontendTask.breadcrumbs[0].id
                            : frontendTask.parentId
                        const rootTaskRes = await tasksApi.getById(rootId)
                        if (rootTaskRes.success && rootTaskRes.data) {
                            const rootTask = rootTaskRes.data
                            setRootTaskDates({
                                startDate: rootTask.task_date || '',
                                dueDate: rootTask.deadline || rootTask.task_date || ''
                            })
                        }
                    } catch {
                        setRootTaskDates(null)
                    }
                } else {
                    setRootTaskDates(null)
                }

                let members: any[] = []
                if (frontendTask.projectId) {
                    const projectRes = await projectsApi.getById(frontendTask.projectId)
                    if (projectRes.success) {
                        const projectData = projectRes.data
                        members = (projectData.project_members || projectData.members)?.map((pm: any) => pm.user || pm) || []
                    }
                }

                if (members.length === 0) {
                    const orgRes = await organizationsApi.getMembers()
                    if (orgRes.success) {
                        members = Array.isArray(orgRes.data) ? orgRes.data : (orgRes.data.data || [])
                    }
                }

                if (taskRes.data.assignee) {
                    const assignee = taskRes.data.assignee
                    const exists = members.some(m => String(m.id) === String(assignee.id))
                    if (!exists) {
                        members.push(assignee)
                    }
                }
                setProjectMembers(members)
            }
            if (projectsRes?.data) {
                const rawProjects = Array.isArray(projectsRes.data)
                    ? projectsRes.data
                    : (projectsRes.data.data || [])
                setProjects(rawProjects.map(mapBackendProjectToFrontend))
            }
            if (commentsRes.success) {
                const rawComments = Array.isArray(commentsRes.data) ? commentsRes.data : commentsRes.data.data || []
                setComments(rawComments.map((c: any) => ({
                    id: c.id,
                    content: c.content,
                    userName: c.user?.name || 'Unknown',
                    userAvatar: c.user?.avatar_url,
                    createdAt: c.created_at
                })))
            }
            if (historyRes.success) {
                const rawHistory = Array.isArray(historyRes.data) ? historyRes.data : historyRes.data.data || []
                setHistory(rawHistory.map((h: any) => {
                    const userName = h.user?.name || 'System'
                    const createdAt = h.created_at
                    const eventType = h.event_type
                    const payload = h.payload || {}

                    // Parse different event types
                    if (eventType === 'time_logged') {
                        const durationSeconds = payload.duration_seconds || 0
                        const hours = Math.floor(durationSeconds / 3600)
                        const minutes = Math.round((durationSeconds % 3600) / 60)
                        const durationText = minutes > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${hours}:00`
                        return {
                            id: h.id,
                            eventType: 'time_logged',
                            action: 'logged time',
                            field: null,
                            oldValue: null,
                            newValue: durationText,
                            userName,
                            createdAt,
                            changes: [{ field: 'Time Logged', oldValue: null, newValue: durationText }]
                        }
                    } else if (eventType === 'status_changed') {
                        const oldStatus = payload.old_status || 'unknown'
                        const newStatus = payload.new_status || 'unknown'
                        const oldStatusLabel = getStatusStyles(oldStatus).label
                        const newStatusLabel = getStatusStyles(newStatus).label
                        return {
                            id: h.id,
                            eventType: 'status_changed',
                            action: 'changed status',
                            field: 'status',
                            oldValue: oldStatusLabel,
                            newValue: newStatusLabel,
                            userName,
                            createdAt,
                            changes: [{ field: 'Status', oldValue: oldStatusLabel, newValue: newStatusLabel }]
                        }
                    } else if (eventType === 'updated') {
                        const oldData = payload.old || {}
                        const newData = payload.new || {}
                        const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

                        const fieldLabels: Record<string, string> = {
                            title: 'Title',
                            description: 'Description',
                            priority: 'Priority',
                            deadline: 'Due Date',
                            task_date: 'Start Date',
                            estimated_hours: 'Estimated Hours',
                            assignee_id: 'Assignee',
                            project_id: 'Project',
                            sprint_id: 'Sprint',
                            story_points: 'Story Points',
                            status_id: 'Status',
                            status: 'Status'
                        }

                        // Compare all keys in newData
                        Object.keys(newData).forEach(key => {
                            // Skip system fields
                            if (['updated_at', 'created_at', 'id', 'task_id', 'creator_id', 'organization_id', 'task_number', 'status_name'].includes(key)) return

                            const oldVal = oldData[key]
                            const newVal = newData[key]

                            // Only add if values are different
                            if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return

                            let fieldLabel = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                            let formattedOld = oldVal
                            let formattedNew = newVal

                            // Handle specific field formatting
                            if (key === 'deadline' || key === 'task_date') {
                                formattedOld = oldVal ? new Date(oldVal).toLocaleDateString() : 'Not set'
                                formattedNew = newVal ? new Date(newVal).toLocaleDateString() : 'Not set'
                            } else if (key === 'estimated_hours') {
                                const oldH = parseFloat(String(oldVal)) || 0
                                const newH = parseFloat(String(newVal)) || 0
                                formattedOld = oldH > 0 ? `${Math.floor(oldH)}h ${Math.round((oldH % 1) * 60)}m` : 'Not set'
                                formattedNew = newH > 0 ? `${Math.floor(newH)}h ${Math.round((newH % 1) * 60)}m` : 'Not set'
                            } else if (key === 'priority') {
                                formattedOld = priorityConfig[oldVal as Priority]?.label || oldVal || 'Not set'
                                formattedNew = priorityConfig[newVal as Priority]?.label || newVal || 'Not set'
                            } else if (key === 'status_id' || key === 'status') {
                                // Prefer status_name if available in payload
                                formattedOld = oldData.status_name || (oldVal ? (getStatusStyles(oldVal).label || oldVal) : 'Not set')
                                formattedNew = newData.status_name || (newVal ? (getStatusStyles(newVal).label || newVal) : 'Not set')
                                fieldLabel = 'Status'
                            } else if (key === 'description') {
                                formattedOld = stripHtml(oldVal || '') || 'Empty'
                                formattedNew = stripHtml(newVal || '') || 'Empty'
                                // Limit length for display
                                if (formattedOld.length > 50) formattedOld = formattedOld.substring(0, 50) + '...'
                                if (formattedNew.length > 50) formattedNew = formattedNew.substring(0, 50) + '...'
                            } else if (key.endsWith('_id')) {
                                // For other IDs, we don't have secondary data like status_name usually
                                formattedOld = oldVal ? 'Changed' : 'Not set'
                                formattedNew = newVal ? 'Changed' : 'Not set'
                            }

                            changes.push({
                                field: fieldLabel,
                                oldValue: formattedOld === null || formattedOld === undefined ? 'Not set' : String(formattedOld),
                                newValue: formattedNew === null || formattedNew === undefined ? 'Not set' : String(formattedNew)
                            })
                        })

                        let action = 'updated'
                        if (changes.length === 1) {
                            action = `updated ${changes[0].field.toLowerCase()}`
                        } else if (changes.length > 1) {
                            action = `updated ${changes.length} fields`
                        }

                        return {
                            id: h.id,
                            eventType: 'updated',
                            action,
                            field: changes.length === 1 ? changes[0].field : null,
                            oldValue: changes.length === 1 ? changes[0].oldValue : null,
                            newValue: changes.length === 1 ? changes[0].newValue : null,
                            userName,
                            createdAt,
                            changes
                        }
                    } else if (eventType === 'created') {
                        const taskData = payload.task || {}
                        return {
                            id: h.id,
                            eventType: 'created',
                            action: 'created task',
                            field: null,
                            oldValue: null,
                            newValue: taskData.title || 'Task',
                            userName,
                            createdAt,
                            changes: [{ field: 'Task Created', oldValue: null, newValue: taskData.title || 'Task' }]
                        }
                    }

                    // Fallback for unknown event types
                    return {
                        id: h.id,
                        eventType: eventType || 'unknown',
                        action: eventType || 'performed action',
                        field: null,
                        oldValue: null,
                        newValue: null,
                        userName,
                        createdAt,
                        changes: []
                    }
                }))
            }
            if (timeLogsRes.success) {
                const logs = Array.isArray(timeLogsRes.data) ? timeLogsRes.data : timeLogsRes.data.data || []
                setTimeLogs(logs.map((log: any) => ({
                    id: log.id,
                    hours: log.hours !== undefined ? Number(log.hours) : (log.duration_seconds ? Number(log.duration_seconds) / 3600 : 0),
                    date: log.start_time,
                    description: log.notes
                })))
            }

            // Check for pending due date request for this task
            if (pendingRequestsRes.success) {
                const requests = Array.isArray(pendingRequestsRes.data) ? pendingRequestsRes.data : pendingRequestsRes.data.data || []
                const taskRequest = requests.find((req: any) => (req.task_id === taskDrawerId || req.task?.id === taskDrawerId) && !req.is_sla_breached)
                setPendingDueDateRequest(taskRequest || null)
            }
        } catch (error) {
            console.error('Failed to fetch task details:', error)
        } finally {
            setIsLoadingData(false)
            setIsOpeningTask(false)
        }
    }


    useEffect(() => {
        if (task) {
            const initialValues = {
                title: task.title,
                description: task.description || '',
                status: task.status,
                priority: task.priority,
                assignee_id: task.assigneeId,
                project_id: task.projectId || '',
                sprint_id: task.sprintId || '',
                story_points: task.storyPoints != null ? task.storyPoints : undefined,
            }
            reset(initialValues)
            originalValuesRef.current = initialValues
            // Reset the description-edited flag whenever a new task loads
            wasDescriptionEditedRef.current = false
            setHoursInput(task.estimatedHours ? String(task.estimatedHours) : '')
        }
    }, [task, reset])

    const isTaskSwitchLoading = isLoadingData || !task

    const onUpdateSubmit = async (data: UpdateTaskValues) => {
        if (!taskDrawerId || !originalValuesRef.current) return

        // Compare current values with original values.
        // Description is only considered changed if the user actually activated the editor;
        // Tiptap normalizes HTML on mount which would otherwise cause a false positive.
        const hasChanges =
            data.title !== originalValuesRef.current.title ||
            (wasDescriptionEditedRef.current && (data.description || '') !== (originalValuesRef.current.description || '')) ||
            data.status !== originalValuesRef.current.status ||
            data.priority !== originalValuesRef.current.priority ||
            String(data.assignee_id || '') !== String(originalValuesRef.current.assignee_id || '') ||
            String(data.project_id || '') !== String(originalValuesRef.current.project_id || '') ||
            String(data.sprint_id || '') !== String((originalValuesRef.current as any).sprint_id || '') ||
            String(data.story_points ?? '') !== String((originalValuesRef.current as any).story_points ?? '')

        // Only make API call if there are actual changes
        if (!hasChanges) {
            return
        }

        if (isSavingRef.current) return
        isSavingRef.current = true

        const promise = (async () => {
            try {
                const payload: Record<string, unknown> = { ...data }
                if (payload.sprint_id === '') payload.sprint_id = null
                if (payload.story_points !== undefined && payload.story_points !== '') {
                    payload.story_points = typeof payload.story_points === 'string' ? parseInt(payload.story_points as string, 10) : payload.story_points
                }
                const res = await tasksApi.update(taskDrawerId, payload)
                if (res.data) {
                    const updatedTask = mapBackendTaskToFrontend(res.data)
                    setTask(updatedTask)
                    setHasChanges(false)
                    const isNowCompleted = updatedTask.status === 'completed'
                    const wasAlreadyCompleted = originalValuesRef.current?.status === 'completed'
                    const showCompletedToast = isNowCompleted && !wasAlreadyCompleted

                    // Update original values after successful update
                    originalValuesRef.current = data

                    toast({
                        title: showCompletedToast ? 'Task completed! 🎉' : 'Updated',
                        description: showCompletedToast
                            ? `Task marked as done`
                            : `Task updated successfully`,
                        variant: isNowCompleted ? 'success' : 'info',
                    })
                }
                window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
            } catch (error) {
                console.error('Failed to update task:', error)
                if (originalValuesRef.current) {
                    reset(originalValuesRef.current)
                }
                toast({
                    title: 'Update Failed',
                    description: getErrorMessage(error),
                    variant: 'destructive',
                })
            } finally {
                isSavingRef.current = false
                savePromiseRef.current = null
            }
        })()

        savePromiseRef.current = promise
        return promise
    }

    const handleAutoSave = handleSubmit(onUpdateSubmit)

    const handleFieldBlur = (fieldName: keyof UpdateTaskValues) => {
        const currentValue = watch(fieldName)
        const originalValue = originalValuesRef.current?.[fieldName]

        // Compare raw values directly to catch all changes
        if (currentValue !== originalValue) {
            handleAutoSave()
        }
    }

    const handleUpdateStartDate = async (date: Date | null) => {
        if (date && taskDrawerId) {
            const formattedDate = formatLocalDate(date)
            try {
                const res = await tasksApi.update(taskDrawerId, { task_date: formattedDate })
                if (res.data) {
                    setTask(mapBackendTaskToFrontend(res.data))
                    setHasChanges(true)
                }
                window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
                setStartDateSheetOpen(false)
            } catch (error) {
                console.error('Failed to update start date:', error)
                toast({
                    title: 'Update Failed',
                    description: getErrorMessage(error),
                    variant: 'destructive',
                })
            }
        }
    }

    const handleUpdateEstimatedHours = async () => {
        if (!taskDrawerId) return
        const hVal = parseFloat(hoursInput) || 0
        const mVal = parseFloat(minutesInput) || 0

        if (hVal < 0 || mVal < 0) {
            setEstimationError("Estimation hours cannot be negative")
            return
        }

        const totalDecimalHours = hVal + (mVal / 60)
        const estimatedHours = totalDecimalHours > 0 ? totalDecimalHours : undefined
        try {
            setIsUpdatingEstimation(true)
            const res = await tasksApi.update(taskDrawerId, { estimated_hours: estimatedHours })
            if (res.data) {
                setTask(mapBackendTaskToFrontend(res.data))
                setHasChanges(true)
            }
            window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
            setEstimationError(null)
            setHoursSheetOpen(false)
        } catch (error) {
            console.error('Failed to update estimated hours:', error)
            toast({
                title: 'Update Failed',
                description: getErrorMessage(error),
                variant: 'destructive',
            })
        } finally {
            setIsUpdatingEstimation(false)
        }
    }

    const overdue = task ? isOverdue(task.dueDate) && task.status !== 'completed' : false
    const progress = task && task.estimatedHours > 0 ? (task.loggedHours / task.estimatedHours) * 100 : 0
    const completedSubtasks = task ? task.subtasks.filter((s: Subtask) => s.status === 'completed').length : 0
    const canCloseTask = task ? (task.subtasks.length === 0 || completedSubtasks === task.subtasks.length) : true

    const handleSubmitComment = async () => {
        if (!newComment.trim() || !taskDrawerId) return
        try {
            setIsSubmittingComment(true)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Force visibility for fast connections
            await tasksApi.addComment(taskDrawerId, newComment)
            setNewComment('')
            const commentsRes = await tasksApi.getComments(taskDrawerId)
            if (commentsRes.success) {
                const rawComments = Array.isArray(commentsRes.data) ? commentsRes.data : commentsRes.data.data || []
                setComments(rawComments.map((c: any) => ({
                    id: c.id,
                    content: c.content,
                    userName: c.user?.name || 'Unknown',
                    userAvatar: c.user?.avatar_url,
                    createdAt: c.created_at
                })))
            }
        } catch (error) {
            console.error('Failed to submit comment:', error)
            toast({
                title: 'Comment Failed',
                description: getErrorMessage(error),
                variant: 'destructive',
            })
        } finally {
            setIsSubmittingComment(false)
        }
    }

    const handleUploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file || !taskDrawerId) return

        try {
            setIsUploadingAttachment(true)
            const newAttachment = await attachmentsApi.upload(taskDrawerId, file)
            setAttachments(prev => [newAttachment, ...prev])
            toast({
                title: "Success",
                description: "Attachment uploaded successfully",
                variant: "success",
            })
            // Refresh task to get updated attachments
            const taskRes = await tasksApi.getById(taskDrawerId)
            if (taskRes.success) {
                const frontendTask = mapBackendTaskToFrontend(taskRes.data)
                setTask(frontendTask)
            }
        } catch (error) {
            console.error('Failed to upload attachment:', error)
            toast({
                title: "Error",
                description: getErrorMessage(error),
                variant: "destructive"
            })
        } finally {
            setIsUploadingAttachment(false)
            // Reset file input
            if (attachmentFileInputRef.current) {
                attachmentFileInputRef.current.value = ''
            }
        }
    }

    const handlePreviewAttachment = (attachment: Attachment) => {
        setPreviewAttachment(attachment)
        setIsPreviewOpen(true)
    }

    const handleDeleteAttachment = (attachmentId: string) => {
        setDeletingAttachmentId(attachmentId)
        setIsAttachmentDeleteDialogOpen(true)
    }

    const confirmDeleteAttachment = async () => {
        if (!taskDrawerId || !deletingAttachmentId) return

        setIsDeletingAttachment(true)
        try {
            await attachmentsApi.delete(taskDrawerId, deletingAttachmentId)
            setAttachments(prev => prev.filter(a => a.id !== deletingAttachmentId))
            toast({
                title: "Success",
                description: "Attachment deleted successfully",
                variant: "success",
            })
            // Refresh task to get updated attachments
            const taskRes = await tasksApi.getById(taskDrawerId)
            if (taskRes.success) {
                const frontendTask = mapBackendTaskToFrontend(taskRes.data)
                setTask(frontendTask)
            }
        } catch (error) {
            console.error('Failed to delete attachment:', error)
            toast({
                title: "Error",
                description: getErrorMessage(error),
                variant: "destructive"
            })
        } finally {
            setIsDeletingAttachment(false)
            setIsAttachmentDeleteDialogOpen(false)
            setDeletingAttachmentId(null)
        }
    }

    const handleDownloadAttachment = async (attachment: Attachment) => {
        if (!taskDrawerId) return

        try {
            const downloadUrl = await attachmentsApi.download(taskDrawerId, attachment.id)
            // Open download URL in new tab
            window.open(downloadUrl, '_blank')
        } catch (error) {
            console.error('Failed to download attachment:', error)
            toast({
                title: "Error",
                description: getErrorMessage(error),
                variant: "destructive"
            })
        }
    }

    const handleLogHours = async () => {
        if (!logDate || (!logHours && !logMinutes) || !taskDrawerId) return
        setIsLoggingHours(true)
        try {
            const hours = parseFloat(logHours) || 0
            const minutes = parseFloat(logMinutes) || 0
            const totalDecimalHours = hours + (minutes / 60)

            if (totalDecimalHours <= 0) {
                toast({
                    title: "Error",
                    description: "Please enter at least some time",
                    variant: "destructive"
                })
                return
            }

            const startStr = `${logDate}T09:00:00Z`
            const startDate = new Date(startStr)
            const totalMinutes = (hours * 60) + minutes
            const endDate = new Date(startDate.getTime() + (totalMinutes * 60 * 1000))

            const logData = {
                start_time: startStr,
                end_time: endDate.toISOString(),
                notes: logDescription
            }

            if (editingLogId) {
                await tasksApi.updateTimeLog(taskDrawerId, editingLogId, logData)
                toast({
                    title: "Hours Updated",
                    description: "Time log updated successfully",
                    variant: "success",
                })
            } else {
                await tasksApi.addTimeLog(taskDrawerId, logData)
                toast({
                    title: "Hours Logged",
                    description: "Time log added successfully",
                    variant: "success",
                })
            }

            // Reset and refresh
            setLogHours('')
            setLogMinutes('')
            setLogDescription('')
            setEditingLogId(null)
            setIsLogDialogOpen(false)

            const timeLogsRes = await tasksApi.getTimeLogs(taskDrawerId)
            if (timeLogsRes.success) {
                const logs = Array.isArray(timeLogsRes.data) ? timeLogsRes.data : timeLogsRes.data.data || []
                setTimeLogs(logs.map((log: any) => ({
                    id: log.id,
                    hours: log.hours !== undefined ? Number(log.hours) : (log.duration_seconds ? Number(log.duration_seconds) / 3600 : 0),
                    date: log.start_time,
                    description: log.notes
                })))

                const taskRes = await tasksApi.getById(taskDrawerId)
                if (taskRes.success) {
                    setTask(mapBackendTaskToFrontend(taskRes.data))
                }
            }
            window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
        } catch (error) {
            console.error('Failed to log hours:', error)
            setIsLoggingHours(false)
            toast({
                title: "Error",
                description: getErrorMessage(error),
                variant: "destructive"
            })
        } finally {
            setIsLoggingHours(false)
        }
    }

    const startEditingLog = (log: any) => {
        setEditingLogId(log.id)
        const dateObj = new Date(log.date)
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        setLogDate(`${year}-${month}-${day}`)

        const decimalHours = log.hours || 0
        const h = Math.floor(decimalHours)
        const m = Math.round((decimalHours - h) * 60)
        setLogHours(h > 0 ? String(h) : '')
        setLogMinutes(m > 0 ? String(m) : '')
        setLogDescription(log.description || '')
        setIsLogDialogOpen(true)
    }

    const handleDeleteTimeLog = (logId: string) => {
        setDeletingLogId(logId)
        setIsLogDeleteDialogOpen(true)
    }

    const confirmDeleteTimeLog = async () => {
        if (!taskDrawerId || !deletingLogId) return
        try {
            await tasksApi.deleteTimeLog(taskDrawerId, deletingLogId)
            toast({
                title: "Log Deleted",
                description: "Time log entry removed",
                variant: "success",
            })
            fetchTaskDetails()
            window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
        } catch (error) {
            console.error('Failed to delete time log:', error)
            toast({
                title: "Error",
                description: getErrorMessage(error),
                variant: "destructive"
            })
        } finally {
            setIsLogDeleteDialogOpen(false)
            setDeletingLogId(null)
        }
    }

    const currentStatus = watch('status') as StatusType
    const currentPriority = watch('priority') as Priority
    const currentAssigneeId = watch('assignee_id')
    const currentProjectId = watch('project_id') || task?.projectId || ''
    const selectedAssignee = projectMembers.find(u => String(u.id) === String(currentAssigneeId))
    const selectedAssigneeName = selectedAssignee?.name
    const selectedProjectName = projects.find(p => String(p.id) === String(currentProjectId))?.name || task?.projectName

    const handleOpenChange = (open: boolean) => {
        if (open) return
        if (isClosingRef.current) return
        isClosingRef.current = true

        const drawerTaskId = taskDrawerId
        const toastTaskId = task?.taskId

        // Close immediately for snappy UX.
        closeTaskDrawer()

        void (async () => {
            try {
                // Wait for any pending blur-triggered save to finish
                if (savePromiseRef.current) {
                    await savePromiseRef.current
                }

                if (!drawerTaskId || !originalValuesRef.current) return

                const values = getValues()
                const orig = originalValuesRef.current

                // Check again for changes after potentially waiting for a blur-save.
                // Description is only considered changed if the user actually activated the editor;
                // Tiptap normalizes HTML on mount which would otherwise cause a false positive.
                const shouldUpdate =
                    values.title !== orig.title ||
                    (wasDescriptionEditedRef.current && (values.description || '') !== (orig.description || '')) ||
                    values.status !== orig.status ||
                    values.priority !== orig.priority ||
                    String(values.assignee_id || '') !== String(orig.assignee_id || '') ||
                    String(values.project_id || '') !== String(orig.project_id || '') ||
                    String(values.sprint_id || '') !== String((orig as any).sprint_id || '') ||
                    String(values.story_points ?? '') !== String((orig as any).story_points ?? '')

                if (!shouldUpdate) return

                await tasksApi.update(drawerTaskId, values)
                const isNowCompleted = values.status === 'completed'
                const wasAlreadyCompleted = orig.status === 'completed'
                const showCompletedToast = isNowCompleted && !wasAlreadyCompleted

                toast({
                    title: showCompletedToast ? 'Task completed! 🎉' : 'Updated',
                    description: showCompletedToast
                        ? `${toastTaskId || 'Task'} marked as done`
                        : `${toastTaskId || 'Task'} updated successfully`,
                    variant: isNowCompleted ? 'success' : 'info',
                })
            } catch (error) {
                console.error('Failed to auto-save on close:', error)
                if (originalValuesRef.current) {
                    reset(originalValuesRef.current)
                }
                toast({
                    title: 'Error',
                    description: getErrorMessage(error),
                    variant: 'destructive',
                })
            } finally {
                setHasChanges(false)
                isClosingRef.current = false
            }
        })()
    }
    const renderDrawerContent = () => {
        const isLoading = isTaskSwitchLoading || !task || isLoadingData

        return (
            <>
                <style>
                    {`
                        .ql-container.ql-snow {
                            border: none !important;
                            font-family: inherit;
                            font-size: 0.875rem;
                        }

                        .ql-container .ql-editor {
                            padding: 0 !important;
                            min-height: 60px;
                            max-height: 100px;
                            overflow-y: auto !important;
                            color: #374151;
                        }

                        /* Static preview: use ql-editor class for Quill formatting but no height limits */
                        .ql-editor-preview.ql-editor {
                            padding: 0 !important;
                            min-height: unset !important;
                            max-height: unset !important;
                            overflow-y: visible !important;
                            color: #374151;
                            font-size: 0.875rem;
                            overflow: hidden;
                            word-break: break-word;
                            overflow-wrap: break-word;
                        }

                        .ql-editor.ql-blank::before {
                            left: 0 !important;
                            font-style: normal !important;
                            color: #9ca3af !important;
                            font-family: inherit;
                        }

                        .ql-toolbar.ql-snow {
                            border: none !important;
                            border-bottom: 1px solid #f3f4f6 !important;
                            padding: 8px 0 !important;
                            margin-bottom: 8px;
                        }

                        .ql-snow .ql-stroke {
                            stroke: #6b7280 !important;
                        }

                        .ql-snow .ql-fill {
                            fill: #6b7280 !important;
                        }

                        .ql-snow .ql-picker {
                            color: #6b7280 !important;
                        }

                        .ql-snow .ql-editor pre.ql-syntax {
                            background-color: #f9fafb !important;
                            color: #111827 !important;
                            border: 1px solid #e5e7eb !important;
                            border-radius: 4px !important;
                            padding: 8px !important;
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
                        }

                        /* Quill HTML preview styles */
                        .quill-preview {
                            overflow: hidden;
                            word-break: break-word;
                            overflow-wrap: break-word;
                            max-width: 100%;
                        }
                        .quill-preview ol,
                        .quill-preview ul {
                            padding-left: 1.5em;
                            margin: 0.25em 0;
                        }
                        .quill-preview ol {
                            list-style-type: decimal;
                        }
                        .quill-preview ul {
                            list-style-type: disc;
                        }
                        .quill-preview li {
                            padding-left: 0.25em;
                            margin: 0.1em 0;
                        }
                        .quill-preview li.ql-indent-1 { padding-left: 3em; }
                        .quill-preview li.ql-indent-2 { padding-left: 5em; }
                        .quill-preview li.ql-indent-3 { padding-left: 7em; }
                        .quill-preview blockquote {
                            border-left: 4px solid #e5e7eb;
                            padding-left: 1em;
                            color: #6b7280;
                            margin: 0.5em 0;
                        }
                        .quill-preview pre {
                            background-color: #f9fafb;
                            border: 1px solid #e5e7eb;
                            border-radius: 4px;
                            padding: 8px;
                            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                            font-size: 0.8em;
                            white-space: pre-wrap;
                        }
                        .quill-preview p { margin: 0.15em 0; }
                        .quill-preview strong { font-weight: 600 !important; }
                        /* Ensure the editor itself has focusable padding and is accessible */
                        .ql-container .ql-editor:focus {
                            outline: none;
                        }
                        .quill-preview em { font-style: italic !important; }
                        .quill-preview u { text-decoration: underline !important; }
                        .quill-preview s { text-decoration: line-through !important; }
                        .quill-preview h1 { font-size: 1.5em !important; font-weight: 700 !important; margin: 0.5em 0 !important; line-height: 1.3 !important; }
                        .quill-preview h2 { font-size: 1.2em !important; font-weight: 600 !important; margin: 0.4em 0 !important; line-height: 1.3 !important; }
                        .quill-preview a { color: #4f46e5; text-decoration: underline; }
                        .quill-preview .ql-align-center { text-align: center; }
                        .quill-preview .ql-align-right { text-align: right; }
                        .quill-preview .ql-align-justify { text-align: justify; }
                    `}
                </style>
                <div className={isDesktop ? "px-5 pt-5 pb-3 border-b border-gray-100" : ""}>
                    {isDesktop ? (
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <DialogTitle className="text-lg font-semibold text-gray-900">Task Details</DialogTitle>
                                {overdue && (
                                    <div className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 text-xs font-medium px-3 py-1 border border-red-100">
                                        <AlertTriangle className="w-3 h-3" />
                                        Overdue
                                    </div>
                                )}
                            </div>
                        </DialogHeader>
                    ) : (
                        <BottomSheetHeader showBackButton onBack={() => handleOpenChange(false)}>
                            <div className="flex items-center gap-3">
                                <BottomSheetTitle>Task Details</BottomSheetTitle>
                                {overdue && (
                                    <div className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 text-xs font-medium px-3 py-1 border border-red-100">
                                        <AlertTriangle className="w-3 h-3" />
                                        Overdue
                                    </div>
                                )}
                            </div>
                        </BottomSheetHeader>
                    )}
                </div>

                <div className={isDesktop ? "h-[calc(90vh-80px)] relative" : "mt-2 space-y-0 relative"}>
                    {isLoading ? (
                        <DetailDrawerSkeleton />
                    ) : isDesktop ? (
                        <div className="flex h-full">
                            <div className="flex-1 min-w-0 overflow-y-auto">
                                {/* Title */}
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <Textarea
                                        {...register('title')}
                                        onBlur={() => handleFieldBlur('title')}
                                        placeholder="Task title"
                                        className="w-full border-none px-0 py-0 min-h-0 resize-none text-base md:text-lg font-semibold leading-snug shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-gray-400 bg-transparent overflow-hidden"
                                        rows={titleRows}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement
                                            target.style.height = 'auto'
                                            target.style.height = target.scrollHeight + 'px'
                                        }}
                                    />
                                    {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
                                    <div className="text-sm text-gray-500 mt-1 text-left flex items-center gap-2 flex-wrap">
                                        {task.breadcrumbs && task.breadcrumbs.map((crumb) => (
                                            <React.Fragment key={crumb.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => openTaskDrawer(crumb.id)}
                                                    className="text-gray-500 hover:text-brand-600 transition-colors cursor-pointer flex items-center gap-1"
                                                    title={`Go to ${crumb.title}`}
                                                >
                                                    {crumb.taskId}
                                                </button>
                                                <span className="text-gray-300">/</span>
                                            </React.Fragment>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => fetchTaskDetails()}
                                            className="text-brand-600 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                            title="Refresh current task"
                                        >
                                            {task.taskId}
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="border-b border-gray-100 px-6 py-4">
                                    <Label className="text-xs text-gray-500 mb-2 block">
                                        Description
                                    </Label>
                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="min-h-[60px]">
                                                <RichTextEditor 
                                                    value={field.value || ''}
                                                    onChange={(val) => {
                                                        field.onChange(val)
                                                        // Only mark as edited if the user actually opened the editor
                                                        if (isDescriptionEditorActive) {
                                                            wasDescriptionEditedRef.current = true
                                                        }
                                                    }}
                                                    isActive={isDescriptionEditorActive}
                                                    onActiveChange={setIsDescriptionEditorActive}
                                                    minHeight="60px"
                                                    maxHeight="400px"
                                                />
                                            </div>
                                        )}
                                    />
                                </div>

                                {/* Progress summary */}
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <div>
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="text-gray-700 font-medium">{formatHours(task.loggedHours)} logged</span>
                                            <span className="text-gray-500">{formatHours(task.estimatedHours)} est.</span>
                                        </div>
                                        <Progress
                                            value={Math.min(progress, 100)}
                                            indicatorClassName={progress > 100 ? 'bg-red-500' : 'bg-green-500'}
                                            className="h-2 rounded-full"
                                        />
                                    </div>
                                </div>

                                {/* Subtasks Section */}
                                <div className="px-6 py-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Subtasks ({task.subtasks.length})
                                        </Label>
                                        <span className="text-xs text-gray-400">
                                            {completedSubtasks} / {task.subtasks.length} done
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {task.subtasks.map((subtask: Subtask) => {
                                            // Find assignee from projectMembers to get avatar
                                            const assigneeFromMembers = subtask.assigneeId
                                                ? projectMembers.find(m => String(m.id) === String(subtask.assigneeId))
                                                : null

                                            // If subtask assignee matches main task assignee, use main task's assignee info (which has avatar)
                                            const isSameAsMainAssignee = subtask.assigneeId && task.assigneeId && String(subtask.assigneeId) === String(task.assigneeId)
                                            const assigneeAvatar = assigneeFromMembers?.avatar_url || (isSameAsMainAssignee ? task.assigneeAvatar : undefined)

                                            return (
                                                <div
                                                    key={subtask.id}
                                                    className="flex items-center gap-3 p-3 bg-gray-50/80 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group"
                                                    onClick={() => openTaskDrawer(subtask.id)}
                                                >
                                                    <CheckCircle2 className={cn(
                                                        'w-5 h-5 shrink-0',
                                                        subtask.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                                                    )} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn("text-sm font-medium truncate group-hover:text-brand-600 transition-colors", subtask.status === 'completed' && "line-through text-gray-400")}>{subtask.title}</p>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-semibold uppercase tracking-wider"
                                                        style={{
                                                            backgroundColor: getStatusStyles(subtask.status).color + '20',
                                                            color: getStatusStyles(subtask.status).color,
                                                            borderColor: 'transparent'
                                                        }}
                                                    >
                                                        {getStatusStyles(subtask.status).label}
                                                    </Badge>
                                                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        <UserAvatar
                                                            user={assigneeFromMembers ? {
                                                                id: String(assigneeFromMembers.id),
                                                                name: assigneeFromMembers.name || subtask.assigneeName || 'Unassigned',
                                                                avatar: assigneeFromMembers.avatar_url
                                                            } : subtask.assigneeId ? {
                                                                id: subtask.assigneeId,
                                                                name: subtask.assigneeName || (isSameAsMainAssignee ? task.assigneeName : 'Unassigned'),
                                                                avatar: assigneeAvatar
                                                            } : undefined}
                                                            className="h-6 w-6"
                                                            fallbackClassName="text-[10px]"
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {task.subtasks.length === 0 && (
                                        <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                                            <p className="text-sm text-gray-500">No subtasks yet</p>
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="w-full text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-brand-200"
                                        onClick={() => openModal('createTask', {
                                            parentId: task.id,
                                            projectId: task.projectId,
                                            parentStartDate: task.parentId
                                                ? (rootTaskDates?.startDate || task.startDate)
                                                : task.startDate,
                                            parentDueDate: task.parentId
                                                ? (rootTaskDates?.dueDate || task.dueDate)
                                                : task.dueDate,
                                        })}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Subtask
                                    </Button>

                                    {!canCloseTask && (
                                        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>Cannot close task: {task.subtasks.length - completedSubtasks} subtask(s) remaining</span>
                                        </div>
                                    )}
                                </div>

                                {/* Tabs for Time Log, Comments, History, Attachments */}
                                <div className="border-t pt-4 px-6 pb-6">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                        <TabsList className="w-full grid grid-cols-4 rounded-lg bg-muted p-1 text-muted-foreground">
                                            <TabsTrigger value="timelog" className="text-xs px-2">Time Log</TabsTrigger>
                                            <TabsTrigger value="comments" className="text-xs px-2">Comments ({comments.length})</TabsTrigger>
                                            <TabsTrigger value="attachments" className="text-xs px-2">Files ({attachments.length})</TabsTrigger>
                                            <TabsTrigger value="history" className="text-xs px-2">History</TabsTrigger>
                                        </TabsList>

                                        {/* Time Log Tab */}
                                        <TabsContent value="timelog" className="space-y-4 mt-4">
                                            <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full border-dashed"
                                                        onClick={() => {
                                                            setEditingLogId(null)
                                                            setLogHours('')
                                                            setLogMinutes('')
                                                            setLogDescription('')
                                                            const today = new Date()
                                                            setLogDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
                                                        }}
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Log Work Hours
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>{editingLogId ? 'Edit Time Log' : 'Log Work Hours'}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <Label>Date</Label>
                                                                <div className="flex h-10 w-full items-center rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed select-none">
                                                                    <CalendarDays className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                                                    {logDate ? new Date(logDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label>Hours</Label>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        min="0"
                                                                        value={logHours}
                                                                        onChange={(e) => setLogHours(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Minutes</Label>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        min="0"
                                                                        max="59"
                                                                        step="1"
                                                                        value={logMinutes}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.trim()
                                                                            if (val === '') {
                                                                                setLogMinutes('')
                                                                            } else {
                                                                                const numVal = parseInt(val, 10)
                                                                                if (!isNaN(numVal) && numVal >= 0 && numVal <= 59) {
                                                                                    setLogMinutes(val)
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Description</Label>
                                                            <Textarea
                                                                placeholder="What did you work on?"
                                                                value={logDescription}
                                                                onChange={(e) => setLogDescription(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="outline" onClick={() => setIsLogDialogOpen(false)} disabled={isLoggingHours}>Cancel</Button>
                                                            <Button onClick={handleLogHours} disabled={!logDate || (!logHours && !logMinutes) || isLoggingHours}>
                                                                {isLoggingHours ? (
                                                                    <>
                                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                        </svg>
                                                                        {editingLogId ? 'Updating...' : 'Logging...'}
                                                                    </>
                                                                ) : (
                                                                    editingLogId ? 'Update Log' : 'Log Hours'
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            {/* Log entries */}
                                            <div className="space-y-3">
                                                {timeLogs.map((log: any) => (
                                                    <div key={log.id} className="group relative flex items-start gap-3 p-3 border rounded-xl bg-white hover:border-brand-200 transition-colors">
                                                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-medium">{formatHoursMinutes(log.hours)}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500">{formatDate(log.date)}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-gray-400 hover:text-brand-600"
                                                                            onClick={() => startEditingLog(log)}
                                                                        >
                                                                            <Edit2 className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-gray-400 hover:text-red-600"
                                                                            onClick={() => handleDeleteTimeLog(log.id)}
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mt-1">{log.description || 'No description'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {timeLogs.length === 0 && (
                                                    <p className="text-center text-sm text-gray-400 py-4">No time logged yet.</p>
                                                )}

                                                <Dialog open={isLogDeleteDialogOpen} onOpenChange={setIsLogDeleteDialogOpen}>
                                                    <DialogContent className="sm:max-w-[400px]">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                                                <Trash2 className="w-5 h-5" />
                                                                Delete Time Log
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <p className="text-sm text-gray-600">
                                                                Are you sure you want to delete this time log? This action cannot be undone.
                                                            </p>
                                                        </div>
                                                        <div className="flex justify-end gap-3">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setIsLogDeleteDialogOpen(false)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                onClick={confirmDeleteTimeLog}
                                                            >
                                                                Delete Log
                                                            </Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TabsContent>

                                        {/* Comments Tab */}
                                        <TabsContent value="comments" className="space-y-4 mt-4">
                                            <div className="space-y-4">
                                                {isLoadingData ? (
                                                    <div className="flex justify-center py-4">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                                                    </div>
                                                ) : comments.length > 0 ? (
                                                    comments.map((comment) => (
                                                        <div key={comment.id} className="flex gap-3">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarImage src={comment.userAvatar} />
                                                                <AvatarFallback className="text-xs">{getInitials(comment.userName)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium">{comment.userName}</span>
                                                                    <span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
                                                                </div>
                                                                <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded-br-lg rounded-bl-lg rounded-tr-lg inline-block">{comment.content}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-center text-sm text-gray-400 py-4">No comments yet.</p>
                                                )}
                                            </div>
                                            <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={user?.avatar} />
                                                    <AvatarFallback className="text-xs">{getInitials(user?.name || '')}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 flex gap-2">
                                                    <Textarea
                                                        placeholder="Add a comment..."
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        className="flex-1 min-h-[40px] max-h-[100px] py-2"
                                                        rows={1}
                                                    />
                                                    <Button size="icon" onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmittingComment}>
                                                        {isSubmittingComment ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Send className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* Attachments Tab */}
                                        <TabsContent value="attachments" className="space-y-4 mt-4">
                                            <div className="space-y-3">
                                                <input
                                                    ref={attachmentFileInputRef}
                                                    type="file"
                                                    onChange={handleUploadAttachment}
                                                    className="hidden"
                                                    multiple={false}
                                                />
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-dashed"
                                                    onClick={() => attachmentFileInputRef.current?.click()}
                                                    disabled={isUploadingAttachment}
                                                >
                                                    {isUploadingAttachment ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Paperclip className="w-4 h-4 mr-2" />
                                                            Upload File
                                                        </>
                                                    )}
                                                </Button>

                                                {isLoadingData ? (
                                                    <div className="flex justify-center py-4">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                                                    </div>
                                                ) : attachments.length > 0 ? (
                                                    attachments.map((attachment) => (
                                                        <div
                                                            key={attachment.id}
                                                            className="flex items-center justify-between p-3 border rounded-xl bg-white hover:bg-gray-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                                    <Paperclip className="w-5 h-5 text-gray-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-xs text-gray-500">{attachment.formattedSize}</span>
                                                                        {attachment.uploadedBy && (
                                                                            <>
                                                                                <span className="text-xs text-gray-400">•</span>
                                                                                <span className="text-xs text-gray-500">{attachment.uploadedBy.name}</span>
                                                                            </>
                                                                        )}
                                                                        <span className="text-xs text-gray-400">•</span>
                                                                        <span className="text-xs text-gray-500">{formatRelativeTime(attachment.createdAt)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-600"
                                                                    onClick={() => handlePreviewAttachment(attachment)}
                                                                    title="Preview"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-600"
                                                                    onClick={() => handleDownloadAttachment(attachment)}
                                                                    title="Download"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-center text-sm text-gray-400 py-4">No attachments yet.</p>
                                                )}
                                            </div>
                                        </TabsContent>

                                        {/* History Tab */}
                                        <TabsContent value="history" className="space-y-3 mt-4">
                                            {isLoadingData ? (
                                                <div className="flex justify-center py-4">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                                                </div>
                                            ) : history.length > 0 ? (
                                                history.map((entry: any) => (
                                                    <div key={entry.id} className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3 ml-1 py-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-medium text-gray-900">{entry.userName}</span>
                                                                <span className="text-gray-500 text-xs">{formatDateTime(entry.createdAt)}</span>
                                                            </div>

                                                            {entry.changes && entry.changes.length > 0 ? (
                                                                <div className="space-y-1.5 mt-2">
                                                                    {entry.changes.map((change: any, idx: number) => (
                                                                        <div key={idx} className="bg-gray-50 rounded-md p-2 border border-gray-100">
                                                                            <div className="text-xs font-semibold text-gray-600 mb-1">{change.field}</div>
                                                                            <div className="flex items-center gap-2 text-xs">
                                                                                {change.oldValue !== null ? (
                                                                                    <>
                                                                                        <span className="line-through text-gray-500">{change.oldValue}</span>
                                                                                        <span className="text-gray-400">→</span>
                                                                                        <span className="font-medium text-gray-700">{change.newValue}</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="font-medium text-gray-700">{change.newValue}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-gray-500 text-xs mt-1">{entry.action}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-gray-500">No history yet</div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </div>

                            <div className="w-[440px] border-l border-gray-100 bg-white overflow-y-auto">
                                <div className="p-4">
                                    <div className=" bg-white">
                                        <div className="flex items-center justify-between px-4 py-3 ">
                                            <div className="text-sm font-semibold text-gray-900">Details</div>
                                            <button type="button" className="text-gray-400 hover:text-gray-600">
                                                {/* <ChevronDown className="w-4 h-4" /> */}
                                            </button>
                                        </div>

                                        {/* Assignee */}
                                        <div className=" px-4">
                                            <Controller
                                                name="assignee_id"
                                                control={control}
                                                render={({ field }) => (
                                                    <>
                                                        <FieldRow
                                                            icon={
                                                                selectedAssignee ? (
                                                                    <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                                                        <AvatarImage src={selectedAssignee.avatar_url} />
                                                                        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                                            {selectedAssignee.name ? selectedAssignee.name.charAt(0).toUpperCase() : '?'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                ) : (
                                                                    <UserRound className="w-5 h-5" />
                                                                )
                                                            }
                                                            label="Assignee"
                                                            value={selectedAssigneeName}
                                                            placeholder="Unassigned"
                                                            onClick={() => setAssigneeSheetOpen(true)}
                                                        />
                                                        <Dialog
                                                            open={assigneeSheetOpen}
                                                            onOpenChange={(open) => {
                                                                setAssigneeSheetOpen(open)
                                                                if (!open) setAssigneeSearch('')
                                                            }}
                                                        >
                                                            <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-[425px]">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-center">Select Assignee</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="mt-4 space-y-2 pb-6 px-4 flex-1 overflow-y-auto">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            field.onChange('')
                                                                            handleAutoSave()
                                                                            setAssigneeSheetOpen(false)
                                                                        }}
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                                            !field.value
                                                                                ? "bg-indigo-50 border-2 border-indigo-500"
                                                                                : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                                        )}
                                                                    >
                                                                        <span className="font-semibold text-sm text-gray-700">Unassigned</span>
                                                                        {!field.value && <span className="text-indigo-600 text-lg">✓</span>}
                                                                    </button>
                                                                    {projectMembers
                                                                        .filter(member =>
                                                                            !assigneeSearch.trim() ||
                                                                            member.name?.toLowerCase().includes(assigneeSearch.toLowerCase())
                                                                        )
                                                                        .sort((a, b) => {
                                                                            // Sort current user to the top
                                                                            if (String(a.id) === String(user?.id)) return -1
                                                                            if (String(b.id) === String(user?.id)) return 1
                                                                            return 0
                                                                        })
                                                                        .map(member => (
                                                                            <button
                                                                                key={member.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    field.onChange(String(member.id))
                                                                                    handleAutoSave()
                                                                                    setAssigneeSheetOpen(false)
                                                                                }}
                                                                                className={cn(
                                                                                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                                                    String(field.value) === String(member.id)
                                                                                        ? "bg-indigo-50 border-2 border-indigo-500"
                                                                                        : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-2.5">
                                                                                    <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                                                                        <AvatarImage src={member.avatar_url} />
                                                                                        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                                                            {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                                                        </AvatarFallback>
                                                                                    </Avatar>
                                                                                    <span className="font-semibold text-sm text-gray-700">
                                                                                        {member.name}
                                                                                        {String(member.id) === String(user?.id) && <span className="text-gray-400 font-normal ml-1">(Me)</span>}
                                                                                    </span>
                                                                                </div>
                                                                                {String(field.value) === String(member.id) && <span className="text-indigo-600 text-lg">✓</span>}
                                                                            </button>
                                                                        ))}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </>
                                                )}
                                            />
                                        </div>

                                        {/* Start Date */}
                                        <div className=" px-4">
                                            <div className="relative">
                                                <FieldRow
                                                    icon={<CalendarDays className="w-5 h-5" />}
                                                    label="Start date"
                                                    value={task.startDate ? new Date(task.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                                    placeholder="Pick a start date"
                                                    onClick={() => {
                                                        setStartDateSheetOpen(prev => !prev)
                                                        setDueDateSheetOpen(false)
                                                    }}
                                                    rightContent={
                                                        <ChevronDown className={`w-4 h-4 transition-colors ${startDateSheetOpen ? 'text-indigo-600 rotate-180' : 'text-gray-400'}`} />
                                                    }
                                                />
                                                {startDateSheetOpen && (
                                                    <div className="absolute left-8 top-full z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                                        <ReactDatePicker
                                                            selected={task.startDate ? parseISOToLocal(task.startDate) : null}
                                                            onChange={handleUpdateStartDate}
                                                            minDate={getTodayDate()}
                                                            maxDate={task.dueDate ? parseISOToLocal(task.dueDate) || undefined : undefined}
                                                            inline
                                                            calendarClassName="!border-none !shadow-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Due Date */}
                                        <div className=" px-4">
                                            <div className="relative">
                                                <FieldRow
                                                    icon={<CalendarDays className="w-5 h-5" />}
                                                    label="Due date"
                                                    value={task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                                    placeholder="Pick a due date"
                                                    onClick={() => {
                                                        if (canApproveRequests(getAccessLevel(user))) {
                                                            setDueDateSheetOpen(prev => !prev)
                                                            setStartDateSheetOpen(false)
                                                        } else {
                                                            openModal('dueDateRequest', { taskId: task.id, startDate: task.startDate })
                                                        }
                                                    }}
                                                    rightContent={
                                                        <ChevronDown className={`w-4 h-4 transition-colors ${dueDateSheetOpen ? 'text-indigo-600 rotate-180' : 'text-gray-400'}`} />
                                                    }
                                                />
                                                {pendingDueDateRequest && (
                                                    <div className="pb-3 pt-2 bg-amber-50 border-l-4 border-amber-400 rounded-r-md px-4 mt-2 mb-2">
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-medium text-amber-900 mb-1">
                                                                    Pending Due Date Change Request
                                                                </p>
                                                                <p className="text-xs text-amber-700 mb-1">
                                                                    <span className="font-medium">{pendingDueDateRequest.requester?.name || 'User'}</span> requested to change due date from{' '}
                                                                    <span className="font-medium">
                                                                        {pendingDueDateRequest.current_due_date
                                                                            ? new Date(pendingDueDateRequest.current_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                            : 'N/A'}
                                                                    </span>{' '}
                                                                    to{' '}
                                                                    <span className="font-medium">
                                                                        {pendingDueDateRequest.proposed_due_date
                                                                            ? new Date(pendingDueDateRequest.proposed_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                            : 'N/A'}
                                                                    </span>
                                                                </p>
                                                                {pendingDueDateRequest.reason && (
                                                                    <p className="text-xs text-amber-600 italic">
                                                                        "{pendingDueDateRequest.reason}"
                                                                    </p>
                                                                )}
                                                                {canApproveRequests(getAccessLevel(user)) && (
                                                                    <div className="flex gap-2 mt-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            // className="h-6 text-xs px-2"
                                                                            className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700 text-white hover:text-white border-none"
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await tasksApi.approveDueDateRequest(pendingDueDateRequest.id)
                                                                                    toast({
                                                                                        title: 'Request Approved',
                                                                                        description: 'The due date has been updated.',
                                                                                        variant: 'info',
                                                                                    })
                                                                                    fetchTaskDetails()
                                                                                    window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
                                                                                } catch (error) {
                                                                                    console.error('Failed to approve request:', error)
                                                                                    toast({
                                                                                        title: 'Error',
                                                                                        description: 'Failed to approve the request.',
                                                                                        variant: 'destructive',
                                                                                    })
                                                                                }
                                                                            }}
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            // className="h-6 text-xs px-2"
                                                                            className="h-6 text-xs px-2 bg-red-600 hover:bg-red-700 text-white hover:text-white border-none"
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await tasksApi.rejectDueDateRequest(pendingDueDateRequest.id)
                                                                                    toast({
                                                                                        title: 'Request Rejected',
                                                                                        description: 'The due date change request has been rejected.',
                                                                                        variant: 'info',
                                                                                    })
                                                                                    fetchTaskDetails()
                                                                                } catch (error) {
                                                                                    console.error('Failed to reject request:', error)
                                                                                    toast({
                                                                                        title: 'Error',
                                                                                        description: 'Failed to reject the request.',
                                                                                        variant: 'destructive',
                                                                                    })
                                                                                }
                                                                            }}
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {canApproveRequests(getAccessLevel(user)) && dueDateSheetOpen && (
                                                    <div className="absolute left-8 top-full z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                                        <ReactDatePicker
                                                            selected={task.dueDate ? parseISOToLocal(task.dueDate) : null}
                                                            onChange={async (date: Date | null) => {
                                                                if (date && taskDrawerId) {
                                                                    const formattedDate = formatLocalDate(date)
                                                                    try {
                                                                        const res = await tasksApi.update(taskDrawerId, { deadline: formattedDate })
                                                                        if (res.data) {
                                                                            setTask(mapBackendTaskToFrontend(res.data))
                                                                            setHasChanges(true)
                                                                            window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
                                                                            setDueDateSheetOpen(false)
                                                                        }
                                                                    } catch (error: any) {
                                                                        console.error('Failed to update due date:', error)
                                                                        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update due date'
                                                                        const statusCode = error?.response?.status

                                                                        if (statusCode === 403) {
                                                                            toast({
                                                                                title: 'Permission Denied',
                                                                                description: errorMessage || 'You cannot change the due date directly. Please submit a due date change request.',
                                                                                variant: 'destructive',
                                                                            })
                                                                            // Close the date picker and open request modal instead
                                                                            setDueDateSheetOpen(false)
                                                                            openModal('dueDateRequest', { taskId: taskDrawerId, startDate: task.startDate })
                                                                        } else {
                                                                            toast({
                                                                                title: 'Error',
                                                                                description: errorMessage,
                                                                                variant: 'destructive',
                                                                            })
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            minDate={task.startDate ? parseISOToLocal(task.startDate) || getTodayDate() : getTodayDate()}
                                                            inline
                                                            calendarClassName="!border-none !shadow-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>



                                        {/* Status */}
                                        <div className=" px-4">
                                            <Controller
                                                name="status"
                                                control={control}
                                                render={({ field }) => (
                                                    <>
                                                        <FieldRow
                                                            icon={<Activity className="w-5 h-5" />}
                                                            label="Status"
                                                            value={getStatusStyles(currentStatus).label}
                                                            placeholder="Select status"
                                                            onClick={() => setStatusSheetOpen(true)}
                                                            rightContent={
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusStyles(currentStatus).color }} />
                                                            }
                                                        />
                                                        <Dialog open={statusSheetOpen} onOpenChange={setStatusSheetOpen}>
                                                            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[425px]">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-center">Select Status</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="mt-4 space-y-2 pb-6">
                                                                    {statuses.length === 0 ? (
                                                                        <div className="text-sm text-gray-500 py-6 text-center">
                                                                            No statuses found
                                                                        </div>
                                                                    ) : (
                                                                        statuses
                                                                            .slice()
                                                                            .sort((a, b) => a.order - b.order)
                                                                            .map((status) => (
                                                                                <button
                                                                                    key={status.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        field.onChange(status.slug)
                                                                                        handleAutoSave()
                                                                                        setHasChanges(false)
                                                                                        setStatusSheetOpen(false)
                                                                                    }}
                                                                                    className={cn(
                                                                                        "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                                                        currentStatus === status.slug
                                                                                            ? "bg-indigo-50 border-2 border-indigo-500"
                                                                                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                                                    )}
                                                                                >
                                                                                    <div className="flex items-center gap-2.5">
                                                                                        <div className="w-3.5 h-3.5 rounded-full shadow-sm border-2 border-white" style={{ backgroundColor: status.color || '#6b7280' }} />
                                                                                        <span className="font-semibold text-sm text-gray-700">{status.name}</span>
                                                                                    </div>
                                                                                    {currentStatus === status.slug && <span className="text-indigo-600 text-lg">✓</span>}
                                                                                </button>
                                                                            ))
                                                                    )}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </>
                                                )}
                                            />
                                        </div>

                                        {/* Priority */}
                                        <div className=" px-4">
                                            <Controller
                                                name="priority"
                                                control={control}
                                                render={({ field }) => (
                                                    <>
                                                        <FieldRow
                                                            icon={<Flag className="w-5 h-5" fill={priorityConfig[currentPriority]?.color} stroke={priorityConfig[currentPriority]?.color} />}
                                                            label="Priority"
                                                            value={priorityConfig[currentPriority]?.label}
                                                            placeholder="Select priority"
                                                            onClick={() => setPrioritySheetOpen(true)}
                                                        />
                                                        <Dialog open={prioritySheetOpen} onOpenChange={setPrioritySheetOpen}>
                                                            <DialogContent className="sm:max-w-[425px]">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-center">Select Priority</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="mt-4 space-y-2 pb-6">
                                                                    {Object.entries(priorityConfig).map(([key, config]: [string, any]) => (
                                                                        <button
                                                                            key={key}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                field.onChange(key)
                                                                                handleAutoSave()
                                                                                setPrioritySheetOpen(false)
                                                                            }}
                                                                            className={cn(
                                                                                "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                                                currentPriority === key
                                                                                    ? "bg-indigo-50 border-2 border-indigo-500"
                                                                                    : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="w-3.5 h-3.5 rounded-full shadow-sm border-2 border-white" style={{ backgroundColor: config.color }} />
                                                                                <span className="font-semibold text-sm text-gray-700">{config.label}</span>
                                                                            </div>
                                                                            {currentPriority === key && <span className="text-indigo-600 text-lg">✓</span>}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </>
                                                )}
                                            />
                                        </div>

                                        {/* Project */}
                                        <div className=" px-4">
                                            <Controller
                                                name="project_id"
                                                control={control}
                                                render={({ field }) => (
                                                    <>
                                                        <FieldRow
                                                            icon={
                                                                selectedProjectName ? (
                                                                    <div className={cn(
                                                                        "w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0",
                                                                        projects.find(p => String(p.id) === String(currentProjectId))?.icon ? 'bg-gray-100' : getRandomColor(String(currentProjectId) || '')
                                                                    )}>
                                                                        {projects.find(p => String(p.id) === String(currentProjectId))?.icon ? (
                                                                            <img src={projects.find(p => String(p.id) === String(currentProjectId))?.icon} alt={selectedProjectName} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            (() => { const Icon = getRandomIcon(String(currentProjectId) || ''); return <Icon className="w-5 h-5" /> })()
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <FolderKanban className="w-5 h-5" />
                                                                )
                                                            }
                                                            label="Project"
                                                            value={selectedProjectName}
                                                            placeholder="No project"
                                                            onClick={() => setProjectSheetOpen(true)}
                                                        />
                                                        <Dialog open={projectSheetOpen} onOpenChange={(open) => {
                                                            setProjectSheetOpen(open)
                                                            if (!open) setProjectSearch('')
                                                        }}>
                                                            <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-[425px]">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-center">Select Project</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="px-4 mt-2">
                                                                    <div className="relative">
                                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                        <Input
                                                                            value={projectSearch}
                                                                            onChange={(e) => setProjectSearch(e.target.value)}
                                                                            placeholder="Search projects..."
                                                                            className="pl-9 h-9"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="mt-4 space-y-2 pb-6 overflow-y-auto flex-1 px-1">
                                                                    {!projectSearch && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                field.onChange('')
                                                                                handleAutoSave()
                                                                                setProjectSheetOpen(false)
                                                                            }}
                                                                            className={cn(
                                                                                "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                                                !field.value
                                                                                    ? "bg-indigo-50 border-2 border-indigo-500"
                                                                                    : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                                            )}
                                                                        >
                                                                            <span className="font-semibold text-sm text-gray-700">No project</span>
                                                                            {!field.value && <span className="text-indigo-600 text-lg">✓</span>}
                                                                        </button>
                                                                    )}
                                                                    {projects
                                                                        .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                                                                        .map(project => (
                                                                            <button
                                                                                key={project.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    field.onChange(project.id)
                                                                                    handleAutoSave()
                                                                                    setProjectSheetOpen(false)
                                                                                }}
                                                                                className={cn(
                                                                                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                                                    String(field.value) === String(project.id)
                                                                                        ? "bg-indigo-50 border-2 border-indigo-500"
                                                                                        : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-2.5">
                                                                                    <div className={cn(
                                                                                        "w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0",
                                                                                        project.icon ? 'bg-gray-100' : getRandomColor(String(project.id))
                                                                                    )}>
                                                                                        {project.icon ? (
                                                                                            <img src={project.icon} alt={project.name} className="w-full h-full object-cover" />
                                                                                        ) : (
                                                                                            (() => { const Icon = getRandomIcon(String(project.id)); return <Icon className="w-4 h-4" /> })()
                                                                                        )}
                                                                                    </div>
                                                                                    <span className="font-semibold text-sm text-gray-700">{project.name}</span>
                                                                                </div>
                                                                                {String(field.value) === String(project.id) && (
                                                                                    <span className="text-indigo-600 text-lg">✓</span>
                                                                                )}
                                                                            </button>
                                                                        ))}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </>
                                                )}
                                            />
                                        </div>

                                        {sprintEnabled && (
                                            <>
                                                {/* Sprint */}
                                                <div className="border-b border-gray-100 px-4">
                                                    <Controller
                                                        name="sprint_id"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <FieldRow
                                                                icon={<LayoutGrid className="w-5 h-5" />}
                                                                label="Sprint"
                                                                value={field.value ? sprints.find(s => s.id === field.value)?.name ?? '' : ''}
                                                                placeholder="No sprint"
                                                                onClick={isUserAdmin ? () => { } : undefined}
                                                                rightContent={isUserAdmin ? (
                                                                    <select
                                                                        value={field.value || ''}
                                                                        onChange={(e) => {
                                                                            field.onChange(e.target.value || '')
                                                                            setTimeout(handleAutoSave, 0)
                                                                        }}
                                                                        className="bg-transparent border-0 text-sm text-gray-700 focus:ring-0 cursor-pointer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <option value="">No sprint</option>
                                                                        {sprints.map(s => (
                                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : null}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                                {/* Story Points */}
                                                <div className="border-b border-gray-100 px-4">
                                                    <Controller
                                                        name="story_points"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <FieldRow
                                                                icon={<Hash className="w-5 h-5" />}
                                                                label="Story Points"
                                                                value={field.value !== undefined && field.value !== '' ? String(field.value) : ''}
                                                                placeholder="0"
                                                                onClick={isUserAdmin ? () => { } : undefined}
                                                                rightContent={isUserAdmin ? (
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        className="w-20 h-8 text-sm text-right"
                                                                        placeholder="0"
                                                                        value={field.value ?? ''}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value
                                                                            if (v === '') field.onChange('')
                                                                            else {
                                                                                const n = parseInt(v, 10)
                                                                                if (!isNaN(n) && n >= 0) field.onChange(n)
                                                                            }
                                                                        }}
                                                                        onBlur={() => handleFieldBlur('story_points')}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                ) : null}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Estimation */}
                                        <div className=" px-4">
                                            <FieldRow
                                                icon={<Clock className="w-5 h-5" />}
                                                label="Estimation"
                                                value={task.estimatedHours ? (() => {
                                                    const decimal = task.estimatedHours
                                                    const hours = Math.floor(decimal)
                                                    const minutes = Math.round((decimal % 1) * 60)
                                                    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                                                })() : ''}
                                                placeholder="Add hours"
                                                onClick={() => {
                                                    if (task.estimatedHours) {
                                                        const decimal = task.estimatedHours
                                                        const hours = Math.floor(decimal)
                                                        const minutes = Math.round((decimal % 1) * 60)
                                                        setHoursInput(String(hours))
                                                        setMinutesInput(String(minutes))
                                                    } else {
                                                        setHoursInput('')
                                                        setMinutesInput('')
                                                    }
                                                    setHoursSheetOpen(true)
                                                }}
                                            />
                                            <Dialog open={hoursSheetOpen} onOpenChange={setHoursSheetOpen}>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-center">Estimated Hours</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="mt-4 space-y-3 pb-6">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <Label htmlFor="hours-input" className="text-sm font-semibold text-gray-700 mb-2 block">
                                                                    Hours
                                                                </Label>
                                                                <Input
                                                                    id="hours-input"
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={hoursInput}
                                                                    onChange={(e) => {
                                                                        setHoursInput(e.target.value)
                                                                        if (estimationError) setEstimationError(null)
                                                                    }}
                                                                    className={cn("h-10 text-sm", estimationError && "border-red-700 focus-visible:ring-red-700")}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="minutes-input" className="text-sm font-semibold text-gray-700 mb-2 block">
                                                                    Minutes
                                                                </Label>
                                                                <Input
                                                                    id="minutes-input"
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={minutesInput}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                                                                            setMinutesInput(val)
                                                                            if (estimationError) setEstimationError(null)
                                                                        }
                                                                    }}
                                                                    className={cn("h-10 text-sm", estimationError && "border-red-700 focus-visible:ring-red-700")}
                                                                />
                                                            </div>
                                                        </div>

                                                        {estimationError && (
                                                            <p className="text-xs text-red-600 mt-1">{estimationError}</p>
                                                        )}

                                                        <div className="flex gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setValue('estimated_hours' as any, '')
                                                                    setHoursInput('')
                                                                    setMinutesInput('')
                                                                    setEstimationError(null)
                                                                    handleUpdateEstimatedHours()
                                                                }}
                                                                className="flex-1 h-9"
                                                            >
                                                                Clear
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                onClick={handleUpdateEstimatedHours}
                                                                className="flex-1 h-9"
                                                                disabled={isUpdatingEstimation}
                                                            >
                                                                {isUpdatingEstimation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                                Done
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Title */}
                            <div className="px-4 py-3 border-b border-gray-100">
                                <Textarea
                                    {...register('title')}
                                    onBlur={() => handleFieldBlur('title')}
                                    placeholder="Task title"
                                    className="w-full border-none px-0 py-0 min-h-0 resize-none text-base md:text-lg font-semibold leading-snug shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-gray-400 bg-transparent overflow-hidden"
                                    rows={titleRows}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement
                                        target.style.height = 'auto'
                                        target.style.height = target.scrollHeight + 'px'
                                    }}
                                />
                                {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
                                <div className="text-sm text-gray-500 mt-1 text-left flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fetchTaskDetails()}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-medium"
                                        title="Refresh current task"
                                    >
                                        {/* <Hash className="w-2.5 h-2.5" /> */}
                                        {task.taskId}
                                    </button>
                                    {task.parent_task_id && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => openTaskDrawer(task.parentId!)}
                                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-medium"
                                                title="Go to parent task"
                                            >
                                                {/* <Hash className="w-2.5 h-2.5" /> */}
                                                {task.parent_task_id}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="border-b border-gray-100 px-4 py-4">
                                <Label className="text-xs text-gray-500 mb-2 block">
                                    Description
                                </Label>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="min-h-[40px]">
                                                <RichTextEditor 
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                    isActive={isDescriptionEditorActive}
                                                    onActiveChange={setIsDescriptionEditorActive}
                                                    minHeight="40px"
                                                    maxHeight="200px"
                                                />
                                        </div>
                                    )}
                                />
                            </div>

                            {/* Status */}
                            <div className="border-b border-gray-100 px-4">
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field: _field }) => (
                                        <>
                                            <FieldRow
                                                icon={<Activity className="w-5 h-5" />}
                                                label="Status"
                                                value={statuses.find(s => s.slug === currentStatus)?.name || currentStatus}
                                                placeholder="Select status"
                                                onClick={() => setStatusSheetOpen(true)}
                                                rightContent={
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statuses.find(s => s.slug === currentStatus)?.color || '#6b7280' }} />
                                                }
                                            />
                                        </>
                                    )}
                                />
                            </div>
                            <Dialog open={statusSheetOpen} onOpenChange={setStatusSheetOpen}>
                                <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Select Status</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4 space-y-2 pb-6 px-4">
                                        {statuses.length === 0 ? (
                                            <div className="text-sm text-gray-500 py-6 text-center">
                                                No statuses found
                                            </div>
                                        ) : (
                                            statuses
                                                .slice()
                                                .sort((a, b) => a.order - b.order)
                                                .map((status) => (
                                                    <button
                                                        key={status.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setValue('status', status.slug)
                                                            handleAutoSave()
                                                            setStatusSheetOpen(false)
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                            currentStatus === status.slug
                                                                ? "bg-indigo-50 border-2 border-indigo-500"
                                                                : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-3.5 h-3.5 rounded-full shadow-sm border-2 border-white" style={{ backgroundColor: status.color || '#6b7280' }} />
                                                            <span className="font-semibold text-sm text-gray-700">{status.name}</span>
                                                        </div>
                                                        {currentStatus === status.slug && <span className="text-indigo-600 text-lg">✓</span>}
                                                    </button>
                                                ))
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Priority */}
                            <div className="border-b border-gray-100 px-4">
                                <Controller
                                    name="priority"
                                    control={control}
                                    render={({ field: _field }) => (
                                        <>
                                            <FieldRow
                                                icon={<Flag className="w-5 h-5" fill={priorityConfig[currentPriority]?.color} stroke={priorityConfig[currentPriority]?.color} />}
                                                label="Priority"
                                                value={priorityConfig[currentPriority]?.label}
                                                placeholder="Select priority"
                                                onClick={() => setPrioritySheetOpen(true)}
                                            />
                                        </>
                                    )}
                                />
                            </div>
                            <Dialog open={prioritySheetOpen} onOpenChange={setPrioritySheetOpen}>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Select Priority</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4 space-y-2 pb-6 px-4">
                                        {Object.entries(priorityConfig).map(([key, config]: [string, any]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => {
                                                    setValue('priority', key)
                                                    handleAutoSave()
                                                    setPrioritySheetOpen(false)
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                    currentPriority === key
                                                        ? "bg-indigo-50 border-2 border-indigo-500"
                                                        : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-3.5 h-3.5 rounded-full shadow-sm border-2 border-white" style={{ backgroundColor: config.color }} />
                                                    <span className="font-semibold text-sm text-gray-700">{config.label}</span>
                                                </div>
                                                {currentPriority === key && <span className="text-indigo-600 text-lg">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Project */}
                            <div className="border-b border-gray-100 px-4">
                                <Controller
                                    name="project_id"
                                    control={control}
                                    render={({ field: _field }) => (
                                        <>
                                            <FieldRow
                                                icon={
                                                    selectedProjectName ? (
                                                        <div className={cn(
                                                            "w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0",
                                                            projects.find(p => String(p.id) === String(watch('project_id') || task?.projectId))?.icon ? 'bg-gray-100' : getRandomColor(String(watch('project_id') || task?.projectId || ''))
                                                        )}>
                                                            {projects.find(p => String(p.id) === String(watch('project_id') || task?.projectId))?.icon ? (
                                                                <img src={projects.find(p => String(p.id) === String(watch('project_id') || task?.projectId))?.icon} alt={selectedProjectName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                (() => { const Icon = getRandomIcon(String(watch('project_id') || task?.projectId || '')); return <Icon className="w-5 h-5" /> })()
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <FolderKanban className="w-5 h-5" />
                                                    )
                                                }
                                                label="Project"
                                                value={selectedProjectName}
                                                placeholder="Select Project"
                                                onClick={() => setProjectSheetOpen(true)}
                                            />
                                        </>
                                    )}
                                />
                            </div>
                            <Dialog open={projectSheetOpen} onOpenChange={setProjectSheetOpen}>
                                <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Select Project</DialogTitle>
                                    </DialogHeader>
                                    <div className="px-4 mt-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                value={projectSearch}
                                                onChange={(e) => setProjectSearch(e.target.value)}
                                                placeholder="Search projects..."
                                                className="pl-9 h-9"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2 pb-6 px-4 overflow-y-auto flex-1">
                                        {!projectSearch && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setValue('project_id', '')
                                                    handleAutoSave()
                                                    setProjectSheetOpen(false)
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                    !getValues('project_id')
                                                        ? "bg-indigo-50 border-2 border-indigo-500"
                                                        : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                )}
                                            >
                                                <span className="font-semibold text-sm text-gray-700">Select Project</span>
                                                {!getValues('project_id') && <span className="text-indigo-600 text-lg">✓</span>}
                                            </button>
                                        )}
                                        {projects
                                            .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                                            .map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setValue('project_id', p.id)
                                                        handleAutoSave()
                                                        setProjectSheetOpen(false)
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                        String(getValues('project_id')) === String(p.id)
                                                            ? "bg-indigo-50 border-2 border-indigo-500"
                                                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0",
                                                            p.icon ? 'bg-gray-100' : getRandomColor(String(p.id))
                                                        )}>
                                                            {p.icon ? (
                                                                <img src={p.icon} alt={p.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                (() => { const Icon = getRandomIcon(String(p.id)); return <Icon className="w-4 h-4" /> })()
                                                            )}
                                                        </div>
                                                        <span className="font-semibold text-sm text-gray-700">{p.name}</span>
                                                    </div>
                                                    {String(getValues('project_id')) === String(p.id) && (
                                                        <span className="text-indigo-600 text-lg">✓</span>
                                                    )}
                                                </button>
                                            ))}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Sprint & Story Points (Mobile only if enabled) */}
                            {sprintEnabled && (
                                <>
                                    <div className="border-b border-gray-100 px-4">
                                        <Controller
                                            name="sprint_id"
                                            control={control}
                                            render={({ field }) => (
                                                <FieldRow
                                                    icon={<LayoutGrid className="w-5 h-5" />}
                                                    label="Sprint"
                                                    value={field.value ? sprints.find(s => s.id === field.value)?.name ?? '' : ''}
                                                    placeholder="No sprint"
                                                    onClick={() => { }}
                                                    rightContent={
                                                        <select
                                                            value={field.value || ''}
                                                            onChange={(e) => {
                                                                field.onChange(e.target.value || '')
                                                                setTimeout(handleAutoSave, 0)
                                                            }}
                                                            className="bg-transparent border-0 text-sm text-gray-700 focus:ring-0 cursor-pointer"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="">No sprint</option>
                                                            {sprints.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    }
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="border-b border-gray-100 px-4">
                                        <Controller
                                            name="story_points"
                                            control={control}
                                            render={({ field }) => (
                                                <FieldRow
                                                    icon={<Hash className="w-5 h-5" />}
                                                    label="Story Points"
                                                    value={field.value !== undefined && field.value !== '' ? String(field.value) : ''}
                                                    placeholder="0"
                                                    onClick={() => { }}
                                                    rightContent={
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            className="w-20 h-8 text-sm text-right"
                                                            placeholder="0"
                                                            value={field.value ?? ''}
                                                            onChange={(e) => {
                                                                const v = e.target.value
                                                                if (v === '') field.onChange('')
                                                                else {
                                                                    const n = parseInt(v, 10)
                                                                    if (!isNaN(n) && n >= 0) field.onChange(n)
                                                                }
                                                            }}
                                                            onBlur={() => handleFieldBlur('story_points')}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    }
                                                />
                                            )}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Assignee */}
                            <div className="border-b border-gray-100 px-4">
                                <Controller
                                    name="assignee_id"
                                    control={control}
                                    render={({ field: _field }) => (
                                        <>
                                            <FieldRow
                                                icon={
                                                    selectedAssignee ? (
                                                        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                                            <AvatarImage src={selectedAssignee.avatar_url} />
                                                            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                                {selectedAssignee.name ? selectedAssignee.name.charAt(0).toUpperCase() : '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    ) : (
                                                        <UserRound className="w-5 h-5" />
                                                    )
                                                }
                                                label="Assignee"
                                                value={selectedAssigneeName}
                                                placeholder="Unassigned"
                                                onClick={() => setAssigneeSheetOpen(true)}
                                            />
                                        </>
                                    )}
                                />
                            </div>
                            <Dialog
                                open={assigneeSheetOpen}
                                onOpenChange={(open) => {
                                    setAssigneeSheetOpen(open)
                                    if (!open) setAssigneeSearch('')
                                }}
                            >
                                <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Select Assignee</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4 space-y-2 pb-6 px-4 flex-1 overflow-y-auto">
                                        <div className="relative mb-2">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                placeholder="Search members..."
                                                value={assigneeSearch}
                                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                                className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
                                            />
                                            {assigneeSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAssigneeSearch('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setValue('assignee_id', '')
                                                handleAutoSave()
                                                setAssigneeSheetOpen(false)
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                !getValues('assignee_id')
                                                    ? "bg-indigo-50 border-2 border-indigo-500"
                                                    : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                            )}
                                        >
                                            <span className="font-semibold text-sm text-gray-700">Unassigned</span>
                                            {!getValues('assignee_id') && <span className="text-indigo-600 text-lg">✓</span>}
                                        </button>
                                        {projectMembers
                                            .filter(member =>
                                                !assigneeSearch.trim() ||
                                                member.name?.toLowerCase().includes(assigneeSearch.toLowerCase())
                                            )
                                            .sort((a, b) => {
                                                if (String(a.id) === String(user?.id)) return -1
                                                if (String(b.id) === String(user?.id)) return 1
                                                return 0
                                            })
                                            .map(member => (
                                                <button
                                                    key={member.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setValue('assignee_id', String(member.id))
                                                        handleAutoSave()
                                                        setAssigneeSheetOpen(false)
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
                                                        String(getValues('assignee_id')) === String(member.id)
                                                            ? "bg-indigo-50 border-2 border-indigo-500"
                                                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                                            <AvatarImage src={member.avatar_url} />
                                                            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                                {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-semibold text-sm text-gray-700">
                                                            {member.name}
                                                            {String(member.id) === String(user?.id) && <span className="text-gray-400 font-normal ml-1">(Me)</span>}
                                                        </span>
                                                    </div>
                                                    {String(getValues('assignee_id')) === String(member.id) && <span className="text-indigo-600 text-lg">✓</span>}
                                                </button>
                                            ))}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Start Date */}
                            <div className="border-b border-gray-100 px-4">
                                <FieldRow
                                    icon={<CalendarDays className="w-5 h-5" />}
                                    label="Start date"
                                    value={task.startDate ? new Date(task.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                    placeholder="Pick a start date"
                                    onClick={() => setStartDateSheetOpen(true)}
                                />
                            </div>
                            <Dialog open={startDateSheetOpen} onOpenChange={setStartDateSheetOpen}>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Select Start Date</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4 flex justify-center pb-6 px-4">
                                        <ReactDatePicker
                                            selected={task.startDate ? parseISOToLocal(task.startDate) : null}
                                            onChange={handleUpdateStartDate}
                                            minDate={getTodayDate()}
                                            maxDate={task.dueDate ? parseISOToLocal(task.dueDate) || undefined : undefined}
                                            inline
                                            calendarClassName="!border-none !shadow-none"
                                            wrapperClassName="w-full"
                                            className="w-full"
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Due Date */}
                            <div className="border-b border-gray-100 px-4">
                                <FieldRow
                                    icon={<CalendarDays className="w-5 h-5" />}
                                    label="Due date"
                                    value={task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                    placeholder="Pick a due date"
                                    onClick={() => {
                                        if (canApproveRequests(getAccessLevel(user))) {
                                            setDueDateSheetOpen(true)
                                        } else {
                                            openModal('dueDateRequest', { taskId: task.id, startDate: task.startDate })
                                        }
                                    }}
                                />
                                {pendingDueDateRequest && (
                                    <div className="px-4 pb-3 pt-2 bg-amber-50 border-l-4 border-amber-400 rounded-r-md mx-0 mb-3">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-amber-900 mb-1">
                                                    Pending Due Date Change Request
                                                </p>
                                                <p className="text-xs text-amber-700 mb-1">
                                                    <span className="font-medium">{pendingDueDateRequest.requester?.name || 'User'}</span> requested to change due date from{' '}
                                                    <span className="font-medium">
                                                        {pendingDueDateRequest.current_due_date
                                                            ? new Date(pendingDueDateRequest.current_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : 'N/A'}
                                                    </span>{' '}
                                                    to{' '}
                                                    <span className="font-medium">
                                                        {pendingDueDateRequest.proposed_due_date
                                                            ? new Date(pendingDueDateRequest.proposed_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : 'N/A'}
                                                    </span>
                                                </p>
                                                {pendingDueDateRequest.reason && (
                                                    <p className="text-xs text-amber-600 italic">
                                                        "{pendingDueDateRequest.reason}"
                                                    </p>
                                                )}
                                                {canApproveRequests(getAccessLevel(user)) && (
                                                    <div className="flex gap-2 mt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 text-xs px-2"
                                                            onClick={async () => {
                                                                try {
                                                                    const response = await tasksApi.approveDueDateRequest(pendingDueDateRequest.id)
                                                                    toast({
                                                                        title: 'Request Approved',
                                                                        description: response.message || 'The due date has been updated.',
                                                                    })
                                                                    fetchTaskDetails()
                                                                    window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
                                                                } catch (error: any) {
                                                                    console.error('Failed to approve request:', error)
                                                                    const errorMessage = error?.response?.data?.message || 'Failed to approve the request.'
                                                                    toast({
                                                                        title: 'Error',
                                                                        description: errorMessage,
                                                                        variant: 'destructive',
                                                                    })
                                                                }
                                                            }}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 text-xs px-2"
                                                            onClick={async () => {
                                                                try {
                                                                    const response = await tasksApi.rejectDueDateRequest(pendingDueDateRequest.id)
                                                                    toast({
                                                                        title: 'Request Rejected',
                                                                        description: response.message || 'The due date change request has been rejected.',
                                                                    })
                                                                    fetchTaskDetails()
                                                                } catch (error: any) {
                                                                    console.error('Failed to reject request:', error)
                                                                    const errorMessage = error?.response?.data?.message || 'Failed to reject the request.'
                                                                    toast({
                                                                        title: 'Error',
                                                                        description: errorMessage,
                                                                        variant: 'destructive',
                                                                    })
                                                                }
                                                            }}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Dialog open={dueDateSheetOpen} onOpenChange={setDueDateSheetOpen}>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Select Due Date</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4 flex justify-center pb-6 px-4">
                                        <ReactDatePicker
                                            selected={task.dueDate ? parseISOToLocal(task.dueDate) : null}
                                            onChange={async (date: Date | null) => {
                                                if (date && taskDrawerId) {
                                                    const formattedDate = formatLocalDate(date)
                                                    try {
                                                        const res = await tasksApi.update(taskDrawerId, { deadline: formattedDate })
                                                        if (res.data) {
                                                            setTask(mapBackendTaskToFrontend(res.data))
                                                            setHasChanges(true)
                                                            window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: taskDrawerId } }))
                                                            setDueDateSheetOpen(false)
                                                        }
                                                    } catch (error: any) {
                                                        console.error('Failed to update due date:', error)
                                                        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update due date'
                                                        const statusCode = error?.response?.status

                                                        if (statusCode === 403) {
                                                            toast({
                                                                title: 'Permission Denied',
                                                                description: errorMessage || 'You cannot change the due date directly. Please submit a due date change request.',
                                                                variant: 'destructive',
                                                            })
                                                            setDueDateSheetOpen(false)
                                                            openModal('dueDateRequest', { taskId: taskDrawerId, startDate: task.startDate })
                                                        } else {
                                                            toast({
                                                                title: 'Error',
                                                                description: errorMessage,
                                                                variant: 'destructive',
                                                            })
                                                        }
                                                    }
                                                }
                                            }}
                                            minDate={task.startDate ? parseISOToLocal(task.startDate) || getTodayDate() : getTodayDate()}
                                            inline
                                            calendarClassName="!border-none !shadow-none"
                                            wrapperClassName="w-full"
                                            className="w-full"
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Estimated Hours */}
                            <div className="border-b border-gray-100 px-4">
                                <FieldRow
                                    icon={<Clock className="w-5 h-5" />}
                                    label="Estimation Hours"
                                    value={task.estimatedHours ? (() => {
                                        const decimal = task.estimatedHours
                                        const hours = Math.floor(decimal)
                                        const minutes = Math.round((decimal % 1) * 60)
                                        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                                    })() : ''}
                                    placeholder="Add hours"
                                    onClick={() => {
                                        if (task.estimatedHours) {
                                            const decimal = task.estimatedHours
                                            const hours = Math.floor(decimal)
                                            const minutes = Math.round((decimal % 1) * 60)
                                            setHoursInput(String(hours))
                                            setMinutesInput(String(minutes))
                                        } else {
                                            setHoursInput('')
                                            setMinutesInput('')
                                        }
                                        setHoursSheetOpen(true)
                                    }}
                                />
                            </div>
                            <Dialog open={hoursSheetOpen} onOpenChange={setHoursSheetOpen}>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Estimated Hours</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4 space-y-3 pb-6 px-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label htmlFor="hours-input-ms" className="text-sm font-semibold text-gray-700 mb-2 block">
                                                    Hours
                                                </Label>
                                                <Input
                                                    id="hours-input-ms"
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={hoursInput}
                                                    onChange={(e) => setHoursInput(e.target.value)}
                                                    className="h-10 text-sm"
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="minutes-input-ms" className="text-sm font-semibold text-gray-700 mb-2 block">
                                                    Minutes
                                                </Label>
                                                <Input
                                                    id="minutes-input-ms"
                                                    type="number"
                                                    min="0"
                                                    max="59"
                                                    placeholder="0"
                                                    value={minutesInput}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                                                            setMinutesInput(val)
                                                        }
                                                    }}
                                                    className="h-10 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setValue('story_points' as any, '')
                                                    setHoursInput('')
                                                    setMinutesInput('')
                                                    handleUpdateEstimatedHours()
                                                }}
                                                className="flex-1 h-9"
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={handleUpdateEstimatedHours}
                                                className="flex-1 h-9"
                                                disabled={isUpdatingEstimation}
                                            >
                                                {isUpdatingEstimation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Done
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>


                            {/* Progress summary */}
                            <div className="px-4 py-3 border-b border-gray-100">
                                <div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-gray-700 font-medium">{formatHours(task.loggedHours)} logged</span>
                                        <span className="text-gray-500">{formatHours(task.estimatedHours)} est.</span>
                                    </div>
                                    <Progress
                                        value={Math.min(progress, 100)}
                                        indicatorClassName={progress > 100 ? 'bg-red-500' : 'bg-green-500'}
                                        className="h-2 rounded-full"
                                    />
                                </div>
                            </div>

                            {/* Subtasks Section */}
                            <div className="px-4 py-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Subtasks ({task.subtasks.length})
                                    </Label>
                                    <span className="text-xs text-gray-400">
                                        {completedSubtasks} / {task.subtasks.length} done
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {task.subtasks.map((subtask: Subtask) => {
                                        const subStatus = statuses.find(s => s.slug === subtask.status)
                                        // Find assignee from projectMembers to get avatar
                                        const assigneeFromMembers = subtask.assigneeId
                                            ? projectMembers.find(m => String(m.id) === String(subtask.assigneeId))
                                            : null

                                        // If subtask assignee matches main task assignee, use main task's assignee info (which has avatar)
                                        const isSameAsMainAssignee = subtask.assigneeId && task.assigneeId && String(subtask.assigneeId) === String(task.assigneeId)
                                        const assigneeAvatar = assigneeFromMembers?.avatar_url || (isSameAsMainAssignee ? task.assigneeAvatar : undefined)

                                        return (
                                            <div
                                                key={subtask.id}
                                                className="flex items-center gap-2.5 p-2.5 bg-gray-50/80 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group"
                                                onClick={() => openTaskDrawer(subtask.id)}
                                            >
                                                <CheckCircle2 className={cn(
                                                    'w-4 h-4 shrink-0',
                                                    subtask.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-xs font-medium truncate group-hover:text-brand-600 transition-colors", subtask.status === 'completed' && "line-through text-gray-400")}>{subtask.title}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4.5" style={{ backgroundColor: subStatus?.color ? `${subStatus.color}20` : '#f3f4f6', color: subStatus?.color || '#6b7280', borderColor: 'transparent' }}>
                                                        {subStatus?.name || subtask.status}
                                                    </Badge>
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <UserAvatar
                                                            user={assigneeFromMembers ? {
                                                                id: String(assigneeFromMembers.id),
                                                                name: assigneeFromMembers.name || subtask.assigneeName || 'Unassigned',
                                                                avatar: assigneeFromMembers.avatar_url
                                                            } : subtask.assigneeId ? {
                                                                id: subtask.assigneeId,
                                                                name: subtask.assigneeName || (isSameAsMainAssignee ? task.assigneeName : 'Unassigned'),
                                                                avatar: assigneeAvatar
                                                            } : undefined}
                                                            className="h-5 w-5"
                                                            fallbackClassName="text-[8px]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {task.subtasks.length === 0 && (
                                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                                        <p className="text-sm text-gray-500">No subtasks yet</p>
                                    </div>
                                )}
                                <Button
                                    variant="outline"
                                    className="w-full text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-brand-200"
                                    onClick={() => openModal('createTask', { parentId: task.id, projectId: task.projectId })}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Subtask
                                </Button>

                                {!canCloseTask && (
                                    <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>Cannot close task: {task.subtasks.length - completedSubtasks} subtask(s) remaining</span>
                                    </div>
                                )}
                            </div>

                            {/* Tabs for Time Log, Comments, History, Attachments */}
                            <div className="border-t pt-4 px-4">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 rounded-lg bg-muted p-1 text-muted-foreground h-auto">
                                        <TabsTrigger value="timelog" className="py-2 text-xs">Time Log</TabsTrigger>
                                        <TabsTrigger value="comments" className="py-2 text-xs">Comments ({comments.length})</TabsTrigger>
                                        <TabsTrigger value="attachments" className="py-2 text-xs">Files ({attachments.length})</TabsTrigger>
                                        <TabsTrigger value="history" className="py-2 text-xs">History</TabsTrigger>
                                    </TabsList>

                                    {/* Time Log Tab */}
                                    <TabsContent value="timelog" className="space-y-4 mt-4">
                                        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-dashed"
                                                    onClick={() => {
                                                        setEditingLogId(null)
                                                        setLogHours('')
                                                        setLogMinutes('')
                                                        setLogDescription('')
                                                        const today = new Date()
                                                        setLogDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
                                                    }}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Log Work Hours
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>{editingLogId ? 'Edit Time Log' : 'Log Work Hours'}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label>Date</Label>
                                                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-not-allowed select-none">
                                                                <CalendarDays className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                                                {logDate ? new Date(logDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Hours</Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    min="0"
                                                                    value={logHours}
                                                                    onChange={(e) => setLogHours(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Minutes</Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    min="0"
                                                                    max="59"
                                                                    step="1"
                                                                    value={logMinutes}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value.trim()
                                                                        if (val === '') {
                                                                            setLogMinutes('')
                                                                        } else {
                                                                            const numVal = parseInt(val, 10)
                                                                            if (!isNaN(numVal) && numVal >= 0 && numVal <= 59) {
                                                                                setLogMinutes(val)
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Description</Label>
                                                        <Textarea
                                                            placeholder="What did you work on?"
                                                            value={logDescription}
                                                            onChange={(e) => setLogDescription(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="outline" onClick={() => setIsLogDialogOpen(false)} disabled={isLoggingHours}>Cancel</Button>
                                                        <Button onClick={handleLogHours} disabled={!logDate || (!logHours && !logMinutes) || isLoggingHours}>
                                                            {isLoggingHours ? (
                                                                <>
                                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                    </svg>
                                                                    {editingLogId ? 'Updating...' : 'Logging...'}
                                                                </>
                                                            ) : (
                                                                editingLogId ? 'Update Log' : 'Log Hours'
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Log entries */}
                                        <div className="space-y-3">
                                            {timeLogs.map((log: any) => (
                                                <div key={log.id} className="group relative flex items-start gap-3 p-3 border rounded-xl bg-white hover:border-brand-200 transition-colors">
                                                    <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium">{formatHoursMinutes(log.hours)}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-gray-500">{formatDate(log.date)}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-gray-400 hover:text-brand-600"
                                                                        onClick={() => startEditingLog(log)}
                                                                    >
                                                                        <Edit2 className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-gray-400 hover:text-red-600"
                                                                        onClick={() => handleDeleteTimeLog(log.id)}
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">{log.description || 'No description'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {timeLogs.length === 0 && (
                                                <p className="text-center text-sm text-gray-400 py-4">No time logged yet.</p>
                                            )}

                                            <Dialog open={isLogDeleteDialogOpen} onOpenChange={setIsLogDeleteDialogOpen}>
                                                <DialogContent className="sm:max-w-[400px]">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2 text-red-800">
                                                            <Trash2 className="w-5 h-5" />
                                                            Delete Time Log
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <div className="py-4">
                                                        <p className="text-sm text-gray-600">
                                                            Are you sure you want to delete this time log? This action cannot be undone.
                                                        </p>
                                                    </div>
                                                    <div className="flex justify-end gap-3">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setIsLogDeleteDialogOpen(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={confirmDeleteTimeLog}
                                                        >
                                                            Delete Log
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                        </div>
                                    </TabsContent>

                                    {/* Comments Tab */}
                                    <TabsContent value="comments" className="space-y-4 mt-4">
                                        <div className="space-y-4">
                                            {isLoadingData ? (
                                                <div className="flex justify-center py-4">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                                                </div>
                                            ) : comments.length > 0 ? (
                                                comments.map((comment) => (
                                                    <div key={comment.id} className="flex gap-3">
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarImage src={comment.userAvatar} />
                                                            <AvatarFallback className="text-xs">{getInitials(comment.userName)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium">{comment.userName}</span>
                                                                <span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded-br-lg rounded-bl-lg rounded-tr-lg inline-block">{comment.content}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-sm text-gray-400 py-4">No comments yet.</p>
                                            )}
                                        </div>
                                        <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white pb-2 px-4 -mx-4">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={user?.avatar} />
                                                <AvatarFallback className="text-xs">{getInitials(user?.name || '')}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 flex gap-2">
                                                <Textarea
                                                    placeholder="Add a comment..."
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    className="flex-1 min-h-[40px] max-h-[100px] py-2"
                                                    rows={1}
                                                />
                                                <Button size="icon" onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmittingComment}>
                                                    {isSubmittingComment ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Attachments Tab */}
                                    <TabsContent value="attachments" className="space-y-4 mt-4">
                                        <div className="space-y-3">
                                            <input
                                                ref={attachmentFileInputRef}
                                                type="file"
                                                onChange={handleUploadAttachment}
                                                className="hidden"
                                                multiple={false}
                                            />
                                            <Button
                                                variant="outline"
                                                className="w-full border-dashed"
                                                onClick={() => attachmentFileInputRef.current?.click()}
                                                disabled={isUploadingAttachment}
                                            >
                                                {isUploadingAttachment ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Paperclip className="w-4 h-4 mr-2" />
                                                        Upload File
                                                    </>
                                                )}
                                            </Button>

                                            {isLoadingData ? (
                                                <div className="flex justify-center py-4">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                                                </div>
                                            ) : attachments.length > 0 ? (
                                                attachments.map((attachment) => (
                                                    <div
                                                        key={attachment.id}
                                                        className="flex items-center justify-between p-3 border rounded-xl bg-white hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                                <Paperclip className="w-5 h-5 text-gray-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-xs text-gray-500">{attachment.formattedSize}</span>
                                                                    {attachment.uploadedBy && (
                                                                        <>
                                                                            <span className="text-xs text-gray-400">•</span>
                                                                            <span className="text-xs text-gray-500">{attachment.uploadedBy.name}</span>
                                                                        </>
                                                                    )}
                                                                    <span className="text-xs text-gray-400">•</span>
                                                                    <span className="text-xs text-gray-500">{formatRelativeTime(attachment.createdAt)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-600"
                                                                onClick={() => handlePreviewAttachment(attachment)}
                                                                title="Preview"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleDownloadAttachment(attachment)}
                                                                title="Download"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDeleteAttachment(attachment.id)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-sm text-gray-400 py-4">No attachments yet.</p>
                                            )}
                                        </div>
                                    </TabsContent>

                                    {/* History Tab */}
                                    <TabsContent value="history" className="space-y-3 mt-4">
                                        {isLoadingData ? (
                                            <div className="flex justify-center py-4">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                                            </div>
                                        ) : history.length > 0 ? (
                                            history.map((entry: any) => (
                                                <div key={entry.id} className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3 ml-1 py-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-gray-900">{entry.userName}</span>
                                                            <span className="text-gray-500 text-xs">{formatDateTime(entry.createdAt)}</span>
                                                        </div>

                                                        {entry.changes && entry.changes.length > 0 ? (
                                                            <div className="space-y-1.5 mt-2">
                                                                {entry.changes.map((change: any, idx: number) => (
                                                                    <div key={idx} className="bg-gray-50 rounded-md p-2 border border-gray-100">
                                                                        <div className="text-xs font-semibold text-gray-600 mb-1">{change.field}</div>
                                                                        <div className="flex items-center gap-2 text-xs">
                                                                            {change.oldValue !== null ? (
                                                                                <>
                                                                                    <span className="line-through text-gray-500">{change.oldValue}</span>
                                                                                    <span className="text-gray-400">→</span>
                                                                                    <span className="font-medium text-gray-700">{change.newValue}</span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="font-medium text-gray-700">{change.newValue}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500 text-xs mt-1">{entry.action}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">No history yet</div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </>
                    )}
                    <Dialog open={isAttachmentDeleteDialogOpen} onOpenChange={setIsAttachmentDeleteDialogOpen}>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                    <Trash2 className="w-5 h-5" />
                                    Delete Attachment
                                </DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                <p className="text-sm text-gray-600">
                                    Are you sure you want to delete this attachment? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAttachmentDeleteDialogOpen(false)}
                                    disabled={isDeletingAttachment}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmDeleteAttachment}
                                    disabled={isDeletingAttachment}
                                >
                                    {isDeletingAttachment ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
                            <DialogHeader className="p-4 pr-12 border-b">
                                <DialogTitle className="flex items-center justify-between gap-2">
                                    <span className="truncate">{previewAttachment?.filename}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => previewAttachment && handleDownloadAttachment(previewAttachment)}
                                        className="h-8 gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </Button>
                                </DialogTitle>
                            </DialogHeader>
                            <div className="bg-gray-50 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto p-4">
                                {previewAttachment && isImageFile(previewAttachment.filename) ? (
                                    <img
                                        src={previewAttachment.downloadUrl}
                                        alt={previewAttachment.filename}
                                        className="max-w-full h-auto rounded-lg shadow-sm"
                                    />
                                ) : (
                                    <div className="text-center py-12">
                                        <Paperclip className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 mb-6">Preview not available for this file type.</p>
                                        <Button
                                            onClick={() => previewAttachment && handleDownloadAttachment(previewAttachment)}
                                            className="gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download to View
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </>
        )
    }


    // return (
    //     <Dialog open={taskDrawerOpen} onOpenChange={handleOpenChange}>
    //         <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
    //             {renderDrawerContent()}
    //         </DialogContent>
    //     </Dialog>
    // )

    // Render based on screen size
    if (isDesktop) {
        return (
            <Dialog open={taskDrawerOpen} onOpenChange={handleOpenChange}>
                <DialogContent
                    className="w-[85vw] max-w-[900px] sm:w-[95vw] sm:max-w-[1200px] p-0 gap-0 overflow-hidden"
                    onPointerDownOutside={(e) => {
                        if (e.target instanceof Element && e.target.closest('.Toastify')) {
                            e.preventDefault()
                        }
                    }}
                    onInteractOutside={(e) => {
                        if (e.target instanceof Element && e.target.closest('.Toastify')) {
                            e.preventDefault()
                        }
                    }}
                >
                    {renderDrawerContent()}
                </DialogContent>
            </Dialog>
        )
    } else {
        return (
            <BottomSheet open={taskDrawerOpen} onOpenChange={handleOpenChange}>
                <BottomSheetContent
                    className="max-h-[92vh] overflow-y-auto"
                    onPointerDownOutside={(e) => {
                        if (e.target instanceof Element && e.target.closest('.Toastify')) {
                            e.preventDefault()
                        }
                    }}
                    onInteractOutside={(e) => {
                        if (e.target instanceof Element && e.target.closest('.Toastify')) {
                            e.preventDefault()
                        }
                    }}
                >
                    {renderDrawerContent()}
                </BottomSheetContent>
            </BottomSheet>
        )
    }
}

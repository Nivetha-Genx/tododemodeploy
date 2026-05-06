import React, { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUIStore, useAuthStore, isAdmin, isTeamLead, getAccessLevel } from '@/stores'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { organizationsApi } from '@/api/organizations'
import { projectsApi, mapBackendProjectToFrontend } from '@/api/projects'
import { sprintsApi } from '@/api/sprints'
import { attachmentsApi } from '@/api/attachments'
import { priorityConfig } from '@/mock'
import { Project, User } from '@/types'
import { useStatusStore } from '@/stores/statusStore'
import { useToast } from '@/components/ui/use-toast'
import { RichTextEditor } from '@/components/ui'
import {
    Button,
    Label,
    Input,
    Textarea,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    CreateTaskModalSkeleton,
} from '@/components/ui'
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn, parseISOToLocal, getRandomColor, getRandomIcon, getErrorMessage } from "@/lib/utils"
import {
    BottomSheet,
    BottomSheetContent,
    BottomSheetHeader,
    BottomSheetTitle,
} from '@/components/ui/bottom-sheet'
import {
    FolderKanban,
    UserRound,
    Flag,
    CalendarDays,
    Clock,
    X,
    ChevronRight,
    ChevronDown,
    Search,
    Paperclip,
    Mic,
    Expand,
    ChevronUp,
    Tag,
    LayoutGrid,
    Hash,
} from 'lucide-react'
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const CustomDialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[96%] sm:max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl sm:rounded-lg max-h-[90vh] overflow-y-auto",
                className
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
))
CustomDialogContent.displayName = "CustomDialogContent"


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



const createTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
    description: z.string().optional(),
    assignee_id: z.string().optional(),
    status: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    deadline: z.string().optional(),
    task_date: z.string().optional(),
    estimated_hours: z.string().optional(),
    project_id: z.string().optional(),
    parent_id: z.string().optional(),
    sprint_id: z.string().optional(),
    story_points: z.union([z.string(), z.number()]).optional(),
})


type CreateTaskValues = z.infer<typeof createTaskSchema>


interface FieldRowProps {
    icon: React.ReactNode
    label: string
    required?: boolean
    value?: string
    placeholder?: string
    onClick?: () => void
    error?: string
    rightContent?: React.ReactNode
    disabled?: boolean
}


function FieldRow({ icon, label, required, value, placeholder, onClick, error, rightContent, disabled }: FieldRowProps) {
    return (
        <div className="w-full">
            <button
                type="button"
                onClick={disabled ? undefined : onClick}
                className={cn(
                    "w-full flex items-center gap-3 py-3 px-4 text-left transition-colors rounded-lg",
                    disabled ? "cursor-default opacity-80" : "hover:bg-gray-50 text-gray-900"
                )}
            >
                <div className="flex-shrink-0 text-gray-500">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-0.5">
                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </div>
                    <div className={`text-sm ${value ? (disabled ? "text-gray-600" : "text-gray-900") : "text-gray-400"} truncate font-medium`}>
                        {value || placeholder}
                    </div>
                </div>
                {!disabled && (rightContent ?? <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />)}
            </button>
            {error && (
                <p className="text-xs text-red-600 mt-1 ml-4">{error}</p>
            )}
        </div>
    )
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

export function CreateTaskModal() {
    const { activeModal, closeModal, modalData } = useUIStore()
    const { user: currentUser } = useAuthStore()
    const isEditMode = activeModal === 'editTask'
    const { toast } = useToast()
    const [orgUsers, setOrgUsers] = useState<User[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const { statuses, getStatusStyles } = useStatusStore()
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [projectSheetOpen, setProjectSheetOpen] = useState(false)
    const [projectSearch, setProjectSearch] = useState('')
    const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false)
    const [assigneeSearch, setAssigneeSearch] = useState('')
    const [statusSheetOpen, setStatusSheetOpen] = useState(false)
    const [prioritySheetOpen, setPrioritySheetOpen] = useState(false)
    const [startDateOpen, setStartDateOpen] = useState(false)
    const [dueDateOpen, setDueDateOpen] = useState(false)
    const [hoursSheetOpen, setHoursSheetOpen] = useState(false)
    const [sprintSheetOpen, setSprintSheetOpen] = useState(false)
    const [hoursInput, setHoursInput] = useState('')
    const [minutesInput, setMinutesInput] = useState('')
    const [estimationError, setEstimationError] = useState<string | null>(null)
    const [sprintEnabled, setSprintEnabled] = useState(false)
    const [sprints, setSprints] = useState<{ id: string; name: string; start_date: string; end_date: string }[]>([])
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isDescriptionEditorActive, setIsDescriptionEditorActive] = useState(false)

    // Responsive detection
    const isDesktop = useMediaQuery('(min-width: 768px)')
    const isUserAdmin = isAdmin(getAccessLevel(currentUser))
    const isUserTeamLead = isTeamLead(getAccessLevel(currentUser))
    
    const hoursInputRef = React.useRef<HTMLInputElement>(null)
    const didFocusHoursOnOpenRef = React.useRef(false)

    // Check if any selection popup is open
    const isAnySelectionOpen = projectSheetOpen || assigneeSheetOpen || statusSheetOpen || prioritySheetOpen || hoursSheetOpen || sprintSheetOpen

    const parentStartDate = modalData?.parentStartDate as string | undefined
    const parentDueDate = modalData?.parentDueDate as string | undefined

    const {
        register,
        handleSubmit,
        control,
        watch,
        reset,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<CreateTaskValues>({
        resolver: zodResolver(createTaskSchema),
        defaultValues: {
            title: '',
            description: '',
            assignee_id: currentUser?.id || '', // Default to current user
            status: (modalData?.status as string) || 'new', // Default to 'new' status
            priority: 'high', // Default to high priority
            deadline: (modalData?.deadline as string) || '',
            task_date: formatLocalDate(new Date()), // Start date = today
            estimated_hours: '',
            project_id: (modalData?.projectId as string) || '',
            parent_id: (modalData?.parentId as string) || '',
        },
    })

    useEffect(() => {
        const fetchData = async () => {
            if (activeModal === 'createTask' || activeModal === 'editTask') {
                setIsLoadingData(true)
                try {
                    const [usersRes, projectsRes, settingsRes] = await Promise.all([
                        organizationsApi.getMembers(),
                        projectsApi.getAll((isUserAdmin || isUserTeamLead) ? undefined : { assignee_id: getValues('assignee_id') || currentUser?.id }),
                        organizationsApi.getSettings(),
                    ])
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

                    if (usersRes?.data) {
                        const data = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.data || []
                        setOrgUsers(data)
                    } else if (Array.isArray(usersRes)) {
                        setOrgUsers(usersRes)
                    }

                    if (projectsRes?.data) {
                        const rawData = Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data.data || []
                        setProjects(rawData.map(mapBackendProjectToFrontend))
                    } else if (Array.isArray(projectsRes)) {
                        setProjects(projectsRes.map(mapBackendProjectToFrontend))
                    }

                    if (activeModal === 'editTask' && modalData?.taskId) {
                        try {
                            const taskRes = await tasksApi.getById(modalData.taskId as string)
                            if (taskRes.success) {
                                const task = mapBackendTaskToFrontend(taskRes.data)
                                reset({
                                    title: task.title,
                                    description: task.description || '',
                                    assignee_id: task.assigneeId || '',
                                    status: task.status || 'new',
                                    priority: (task.priority as any) || 'medium',
                                    deadline: task.dueDate ? task.dueDate.split('T')[0] : '',
                                    task_date: task.startDate ? task.startDate.split('T')[0] : formatLocalDate(new Date()),
                                    estimated_hours: task.estimatedHours ? String(task.estimatedHours) : '',
                                    project_id: task.projectId || (modalData?.projectId as string) || '',
                                    parent_id: task.parentId || (modalData?.parentId as string) || '',
                                    sprint_id: task.sprintId || '',
                                    story_points: task.storyPoints != null ? String(task.storyPoints) : '',
                                })
                                setHoursInput(task.estimatedHours ? String(task.estimatedHours) : '')
                            }
                        } catch (error) {
                            console.error('Failed to load task for editing:', error)
                        }
                    } else if (activeModal === 'createTask' && modalData?.template) {
                        // Prefill from task template
                        const t = modalData.template as {
                            title?: string
                            description?: string
                            priority?: string
                            estimated_hours?: string
                            project_id?: string
                        }
                        reset({
                            title: t.title ?? '',
                            description: t.description ?? '',
                            assignee_id: currentUser?.id || '',
                            status: 'new',
                            priority: (t.priority as any) || 'high',
                            deadline: (modalData?.deadline as string) || '',
                            task_date: formatLocalDate(new Date()),
                            estimated_hours: t.estimated_hours ?? '',
                            project_id: t.project_id ?? (modalData?.projectId as string) ?? '',
                            parent_id: (modalData?.parentId as string) || '',
                            sprint_id: '',
                            story_points: '',
                        })
                        setHoursInput(t.estimated_hours ?? '')
                    } else {
                        reset({
                            title: '',
                            description: '',
                            assignee_id: currentUser?.id || '', // Default to current user
                            status: (modalData?.status as string) || 'new', // Default to 'new' status
                            priority: 'high', // Default to high priority
                            deadline: (modalData?.deadline as string) || '',
                            task_date: formatLocalDate(new Date()), // Start date = today
                            estimated_hours: '',
                            project_id: (modalData?.projectId as string) || '',
                            parent_id: (modalData?.parentId as string) || '',
                            sprint_id: '',
                            story_points: '',
                        })
                        setHoursInput('')
                    }
                } catch (error) {
                    console.error('Failed to fetch modal data:', error)
                } finally {
                    setIsLoadingData(false)
                }
            }
        }
        fetchData()
    }, [activeModal, modalData, reset, currentUser, getValues])

    const onTaskSubmit = async (data: CreateTaskValues) => {
        try {
            const startDate = data.task_date || formatLocalDate(new Date())
            const dueDate = data.deadline || startDate

            const payload: Record<string, unknown> = {
                ...data,
                assignee_id: data.assignee_id || null,
                estimated_hours: data.estimated_hours ? parseFloat(data.estimated_hours) : undefined,
                task_date: startDate,
                deadline: dueDate,
            }
            if (data.sprint_id) payload.sprint_id = data.sprint_id
            else payload.sprint_id = null
            if (data.story_points !== undefined && data.story_points !== '') {
                payload.story_points = typeof data.story_points === 'string' ? parseInt(data.story_points, 10) : data.story_points
            }

            if (isEditMode && modalData?.taskId) {
                const response = await tasksApi.update(modalData.taskId as string, payload)
                const updatedTask = response.data
                const taskIdentifier = updatedTask?.task_id || ''

                toast({
                    title: 'Updated',
                    description: taskIdentifier
                        ? `Task ${taskIdentifier} updated successfully`
                        : 'Task updated successfully',
                    variant: 'info',
                })

                window.dispatchEvent(new CustomEvent('task-updated', { detail: { taskId: modalData.taskId } }))
                closeModal()
            } else {
                const response = await tasksApi.create(payload)
                const createdTask = response.data?.data || response.data
                const taskIdentifier = createdTask?.task_id || ''
                const taskId = createdTask?.id

                // Upload attachments after task creation
                if (selectedFiles.length > 0 && taskId) {
                    try {
                        await Promise.all(
                            selectedFiles.map(file => attachmentsApi.upload(taskId, file))
                        )
                    } catch (error) {
                        console.error('Failed to upload attachments:', error)
                        toast({
                            title: 'Warning',
                            description: 'Task created but some attachments failed to upload.',
                            variant: 'warning',
                        })
                    }
                }

                toast({
                    title: 'Success',
                    description: data.parent_id
                        ? `Subtask created successfully`
                        : `Task created successfully`,
                    variant: 'success',
                })

                window.dispatchEvent(new CustomEvent('task-created'))
                reset()
                setSelectedFiles([])
                closeModal()
            }
        } catch (error: any) {
            console.error('Failed to create/update task:', error)
            const errorMessage = getErrorMessage(error)
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            })
        }
    }

    // Watch form values for display
    const projectId = watch('project_id')
    const assigneeId = watch('assignee_id')
    const status = watch('status')
    const priority = watch('priority')
    const parentId = watch('parent_id')

    // Re-fetch projects when assignee changes
    useEffect(() => {
        const fetchFilteredProjects = async () => {
            if (!assigneeId && !(isUserAdmin || isUserTeamLead)) return
            try {
                const projectsRes = await projectsApi.getAll((isUserAdmin || isUserTeamLead) ? undefined : { assignee_id: assigneeId })
                if (projectsRes?.data) {
                    const rawData = Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data.data || []
                    setProjects(rawData.map(mapBackendProjectToFrontend))
                } else if (Array.isArray(projectsRes)) {
                    setProjects(projectsRes.map(mapBackendProjectToFrontend))
                }
            } catch (error) {
                console.error('Failed to fetch filtered projects:', error)
            }
        }

        if (activeModal === 'createTask' || activeModal === 'editTask') {
            fetchFilteredProjects()
        }
    }, [assigneeId, activeModal])

    const selectedProjectName = projects.find(p => p.id === projectId)?.name
    const selectedAssignee = orgUsers.find(u => u.id === assigneeId)
    const selectedAssigneeName = selectedAssignee?.name
    const { label: selectedStatusLabel, color: selectedStatusColor } = getStatusStyles(status || 'new')
    const selectedPriorityLabel = priorityConfig[priority as keyof typeof priorityConfig]?.label
    const selectedPriorityColor = priorityConfig[priority as keyof typeof priorityConfig]?.color

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && (activeModal === 'createTask' || activeModal === 'editTask')) {
                handleSubmit(onTaskSubmit)()
            }
            if (e.key === 'Escape' && (activeModal === 'createTask' || activeModal === 'editTask')) {
                closeModal()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeModal])

    // Selection popups rendering based on device
    const SelectionWrapper = isDesktop ? Dialog : BottomSheet

    const SelectionContent = isDesktop ? CustomDialogContent : BottomSheetContent
    const SelectionHeader = isDesktop ? DialogHeader : BottomSheetHeader
    const SelectionTitle = isDesktop ? DialogTitle : BottomSheetTitle

    useEffect(() => {
        if (hoursSheetOpen && !didFocusHoursOnOpenRef.current) {
            didFocusHoursOnOpenRef.current = true
            requestAnimationFrame(() => hoursInputRef.current?.focus())
        }
        if (!hoursSheetOpen) {
            didFocusHoursOnOpenRef.current = false
        }
    }, [hoursSheetOpen])

    const desktopFormContent = (
        <>
            <style>
                {`
                    input[type="number"]::-webkit-outer-spin-button,
                    input[type="number"]::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }

                    input[type="number"] {
                        -moz-appearance: textfield;
                    }

                    .react-datepicker {
                        font-family: inherit;
                        border: none !important;
                        box-shadow: none !important;
                    }

                    .react-datepicker__header {
                        background-color: #f9fafb !important;
                        border-bottom: 1px solid #e5e7eb !important;
                        padding-top: 0.75rem !important;
                    }

                    .react-datepicker__current-month {
                        font-weight: 600 !important;
                        color: #111827 !important;
                        font-size: 0.9rem !important;
                    }

                    .react-datepicker__day-name {
                        color: #6b7280 !important;
                        font-weight: 600 !important;
                        font-size: 0.8rem !important;
                    }

                    .react-datepicker__day {
                        border-radius: 0.375rem !important;
                        transition: all 0.2s !important;
                    }

                    .react-datepicker__day:hover {
                        background-color: #eef2ff !important;
                        color: #4f46e5 !important;
                    }

                    .react-datepicker__day--selected {
                        background-color: #4f46e5 !important;
                        color: white !important;
                        font-weight: 600 !important;
                    }

                    .react-datepicker__day--keyboard-selected {
                        background-color: #eef2ff !important;
                        color: #4f46e5 !important;
                    }

                    .react-datepicker__day--disabled {
                        color: #d1d5db !important;
                    }

                    @keyframes slide-in-from-top-1 {
                        from {
                            opacity: 0;
                            transform: translateY(-4px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    .animate-in {
                        animation: slide-in-from-top-1 0.2s ease-out;
                    }

                    @keyframes spin {
                        to {
                            transform: rotate(360deg);
                        }
                    }

                    .animate-spin {
                        animation: spin 1s linear infinite;
                    }

                    textarea {
                        field-sizing: content;
                    }
                    
                    .tiptap p.is-editor-empty:first-child::before {
                        color: #9ca3af;
                        content: attr(data-placeholder);
                        float: left;
                        height: 0;
                        pointer-events: none;
                    }
                `}
            </style>
            <form onSubmit={handleSubmit(onTaskSubmit)} className="space-y-0">
                {/* Title Input */}
                <div className="px-4 py-3 border-b border-gray-100">
                    <Textarea
                        id="title"
                        autoFocus
                        placeholder="Task Title"
                        {...register('title')}
                        className="w-full border-none px-0 py-0 min-h-0 resize-none text-base md:text-lg font-semibold leading-snug shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-gray-400 bg-transparent overflow-hidden"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === ' ' && (e.target as HTMLTextAreaElement).value.length === 0) {
                                e.preventDefault()
                            }
                        }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement
                            target.style.height = 'auto'
                            target.style.height = target.scrollHeight + 'px'
                        }}
                    />
                    {errors.title && (
                        <p className="text-xs text-red-600 mt-1.5 animate-in slide-in-from-top-1">{errors.title.message}</p>
                    )}
                </div>

                {/* Description */}
                <div className="border-b border-gray-100 px-4 py-3">
                    <Label htmlFor="description" className="text-xs text-gray-500 mb-2 block">
                        Description
                    </Label>
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <div className="min-h-[60px]">
                                <RichTextEditor 
                                    value={field.value || ''} 
                                    onChange={field.onChange} 
                                    isActive={isDescriptionEditorActive}
                                    onActiveChange={setIsDescriptionEditorActive}
                                    minHeight="60px"
                                    maxHeight="150px"
                                />
                            </div>
                        )}
                    />
                </div>

                {/* Status */}
                <div className="border-b border-gray-100">
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <>
                                <FieldRow
                                    icon={<Tag className="w-5 h-5" style={{ color: selectedStatusColor }} />}
                                    label="Status"
                                    value={selectedStatusLabel}
                                    placeholder="New"
                                    onClick={() => setStatusSheetOpen(true)}
                                    rightContent={
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedStatusColor }} />
                                    }
                                />
                                <SelectionWrapper open={statusSheetOpen} onOpenChange={setStatusSheetOpen}>
                                    <SelectionContent className={isDesktop ? "max-w-md" : "max-h-[80vh] overflow-y-auto"}>
                                        <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setStatusSheetOpen(false) })}>
                                            <SelectionTitle>Select Status</SelectionTitle>
                                        </SelectionHeader>
                                        <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-2 ${isDesktop ? '' : 'pb-6'}`}>
                                            {statuses.length === 0 ? (
                                                <div className="text-sm text-gray-500 py-6 text-center">
                                                    No statuses found
                                                </div>
                                            ) : (
                                                statuses
                                                    .slice()
                                                    .sort((a, b) => a.order - b.order)
                                                    .map((statusItem) => (
                                                        <button
                                                            type="button"
                                                            key={statusItem.id}
                                                            onClick={() => {
                                                                field.onChange(statusItem.slug)
                                                                setStatusSheetOpen(false)
                                                            }}
                                                            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${field.value === statusItem.slug
                                                                ? 'bg-indigo-50 border-2 border-indigo-500'
                                                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-3.5 h-3.5 rounded-full shadow-sm border-2 border-white" style={{ backgroundColor: statusItem.color || '#6b7280' }} />
                                                                <span className="font-semibold text-sm text-gray-700">{statusItem.name}</span>
                                                            </div>
                                                            {field.value === statusItem.slug && <span className="text-indigo-600 text-lg">✓</span>}
                                                        </button>
                                                    ))
                                            )}
                                        </div>
                                    </SelectionContent>
                                </SelectionWrapper>
                            </>
                        )}
                    />
                </div>

                {/* Priority */}
                <div className="border-b border-gray-100">
                    <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                            <>
                                <FieldRow
                                    icon={<Flag className="w-5 h-5" fill={selectedPriorityColor} stroke={selectedPriorityColor} />}
                                    label="Priority"
                                    value={selectedPriorityLabel}
                                    placeholder="High"
                                    onClick={() => setPrioritySheetOpen(true)}
                                />
                                <SelectionWrapper open={prioritySheetOpen} onOpenChange={setPrioritySheetOpen}>
                                    <SelectionContent className={isDesktop ? "max-w-md" : ""}>
                                        <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setPrioritySheetOpen(false) })}>
                                            <SelectionTitle>Select Priority</SelectionTitle>
                                        </SelectionHeader>
                                        <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-2 ${isDesktop ? '' : 'pb-6'}`}>
                                            {Object.entries(priorityConfig).map(([key, config]: [string, any]) => (
                                                <button
                                                    type="button"
                                                    key={key}
                                                    onClick={() => {
                                                        field.onChange(key)
                                                        setPrioritySheetOpen(false)
                                                    }}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${field.value === key
                                                        ? 'bg-indigo-50 border-2 border-indigo-500'
                                                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-3.5 h-3.5 rounded-full shadow-sm border-2 border-white" style={{ backgroundColor: config.color }} />
                                                        <span className="font-semibold text-sm text-gray-700">{config.label}</span>
                                                    </div>
                                                    {field.value === key && <span className="text-indigo-600 text-lg">✓</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </SelectionContent>
                                </SelectionWrapper>
                            </>
                        )}
                    />
                </div>

                {/* Estimated Hours */}
                <div className="border-b border-gray-100">
                    <Controller
                        name="estimated_hours"
                        control={control}
                        render={({ field }) => (
                            <>
                                <FieldRow
                                    icon={<Clock className="w-5 h-5" />}
                                    label="Estimation Hours"
                                    value={field.value ? (() => {
                                        const decimal = parseFloat(field.value)
                                        const hours = Math.floor(decimal)
                                        const minutes = Math.round((decimal % 1) * 60)
                                        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                                    })() : ''}
                                    placeholder="Add hours"
                                    onClick={() => {
                                        if (field.value) {
                                            const decimal = parseFloat(field.value)
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
                                <SelectionWrapper open={hoursSheetOpen} onOpenChange={setHoursSheetOpen}>
                                    <SelectionContent className={isDesktop ? "max-w-sm" : ""}>
                                        <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setHoursSheetOpen(false) })}>
                                            <SelectionTitle>Estimated Hours</SelectionTitle>
                                        </SelectionHeader>
                                        <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-3 ${isDesktop ? '' : 'pb-6'}`}>
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
                                                        className={cn("h-10 text-sm", estimationError && "border-red-500 focus-visible:ring-red-500")}
                                                        ref={hoursInputRef}
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
                                                        className={cn("h-10 text-sm", estimationError && "border-red-500 focus-visible:ring-red-500")}
                                                    />
                                                </div>
                                            </div>

                                            {estimationError && (
                                                <p className="text-xs text-red-700 mt-1">{estimationError}</p>
                                            )}

                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        field.onChange('')
                                                        setHoursInput('')
                                                        setMinutesInput('')
                                                        setEstimationError(null)
                                                        setHoursSheetOpen(false)
                                                    }}
                                                    className="flex-1 h-9"
                                                >
                                                    Clear
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        const hVal = parseFloat(hoursInput) || 0
                                                        const mVal = parseFloat(minutesInput) || 0

                                                        if (hVal < 0 || mVal < 0) {
                                                            setEstimationError("Estimation hours cannot be negative")
                                                            return
                                                        }

                                                        const totalDecimalHours = hVal + (mVal / 60)
                                                        field.onChange(totalDecimalHours > 0 ? String(totalDecimalHours) : '')
                                                        setEstimationError(null)
                                                        setHoursSheetOpen(false)
                                                    }}
                                                    className="flex-1 h-9"
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </div>
                                    </SelectionContent>
                                </SelectionWrapper>
                            </>
                        )}
                    />
                </div>

                {sprintEnabled && isUserAdmin && (
                    <>
                        {/* Sprint */}
                        <div className="border-b border-gray-100">
                            <Controller
                                name="sprint_id"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        <FieldRow
                                            icon={<LayoutGrid className="w-5 h-5" />}
                                            label="Sprint"
                                            value={field.value ? sprints.find(s => s.id === field.value)?.name ?? '' : ''}
                                            placeholder="No sprint"
                                            onClick={() => setSprintSheetOpen(true)}
                                        />
                                        <SelectionWrapper open={sprintSheetOpen} onOpenChange={setSprintSheetOpen}>
                                            <SelectionContent className={isDesktop ? "max-w-md" : ""}>
                                                <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setSprintSheetOpen(false) })}>
                                                    <SelectionTitle>Select Sprint</SelectionTitle>
                                                </SelectionHeader>
                                                <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-2 ${isDesktop ? 'max-h-[60vh] overflow-y-auto' : 'pb-6'}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            field.onChange('')
                                                            setSprintSheetOpen(false)
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${!field.value
                                                            ? 'bg-indigo-50 border-2 border-indigo-500'
                                                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
                                                                <LayoutGrid className="w-4 h-4 text-gray-500" />
                                                            </div>
                                                            <span className="font-semibold text-sm text-gray-700">No sprint</span>
                                                        </div>
                                                        {!field.value && <span className="text-indigo-600 text-lg">✓</span>}
                                                    </button>
                                                    {sprints.map(s => (
                                                        <button
                                                            type="button"
                                                            key={s.id}
                                                            onClick={() => {
                                                                field.onChange(s.id)
                                                                setSprintSheetOpen(false)
                                                            }}
                                                            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${field.value === s.id
                                                                ? 'bg-indigo-50 border-2 border-indigo-500'
                                                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                                    <LayoutGrid className="w-4 h-4" />
                                                                </div>
                                                                <div className="flex flex-col text-left">
                                                                    <span className="font-semibold text-sm text-gray-700">{s.name}</span>
                                                                    <span className="text-[12px] text-gray-500 font-medium">
                                                                        {new Date(s.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(s.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {field.value === s.id && <span className="text-indigo-600 text-lg">✓</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </SelectionContent>
                                        </SelectionWrapper>
                                    </>
                                )}
                            />
                        </div>
                        {/* Story Points */}
                        <div className="border-b border-gray-100">
                            <Controller
                                name="story_points"
                                control={control}
                                render={({ field }) => (
                                    <FieldRow
                                        icon={<Hash className="w-5 h-5" />}
                                        label="Story Points"
                                        value={field.value !== undefined && field.value !== '' ? String(field.value) : ''}
                                        placeholder="Points"
                                        onClick={() => { }}
                                        rightContent={
                                            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm" onClick={(e) => e.stopPropagation()}>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="w-12 h-8 text-sm text-center px-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none shadow-none"
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
                                                />
                                                <div className="flex flex-col border-l border-gray-200 h-8 w-6 bg-gray-50 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            const current = typeof field.value === 'number' ? field.value : parseInt(field.value || '0', 10) || 0
                                                            field.onChange(current + 1)
                                                        }}
                                                        className="flex-1 flex items-center justify-center hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors border-b border-gray-200"
                                                    >
                                                        <ChevronUp className="w-3 h-3" strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            const current = typeof field.value === 'number' ? field.value : parseInt(field.value || '0', 10) || 0
                                                            if (current > 0) field.onChange(current - 1)
                                                        }}
                                                        className="flex-1 flex items-center justify-center hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                                                    >
                                                        <ChevronDown className="w-3 h-3" strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </div>
                                        }
                                    />
                                )}
                            />
                        </div>
                    </>
                )}

                {/* Start Date */}
                <div className="border-b border-gray-100">
                    <Controller
                        name="task_date"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <FieldRow
                                    icon={<CalendarDays className="w-5 h-5" />}
                                    label="Start Date"
                                    value={field.value ? new Date(field.value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    placeholder="Start date"
                                    onClick={() => {
                                        setStartDateOpen(prev => !prev)
                                        setDueDateOpen(false)
                                    }}
                                    rightContent={
                                        <ChevronDown className={`w-4 h-4 transition-colors ${startDateOpen ? 'text-indigo-600 rotate-180' : 'text-gray-400'}`} />
                                    }
                                />
                                {startDateOpen && (
                                    <div className="relative">
                                        <div className="absolute left-12 top-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                            <ReactDatePicker
                                                selected={field.value ? parseISOToLocal(field.value) : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        field.onChange(formatLocalDate(date))
                                                        setStartDateOpen(false)
                                                    }
                                                }}
                                                minDate={parentStartDate ? (parseISOToLocal(parentStartDate) || getTodayDate()) : getTodayDate()}
                                                maxDate={(() => {
                                                    const currentDeadline = watch('deadline')
                                                    const deadlineDate = currentDeadline ? parseISOToLocal(currentDeadline) : null
                                                    const parentEnd = parentDueDate ? parseISOToLocal(parentDueDate) : null

                                                    if (deadlineDate && parentEnd) {
                                                        return deadlineDate < parentEnd ? deadlineDate : parentEnd
                                                    }
                                                    return deadlineDate || parentEnd || undefined
                                                })()}
                                                inline
                                                calendarClassName="!border-none !shadow-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>

                {/* Due Date */}
                <div className="border-b border-gray-100">
                    <Controller
                        name="deadline"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <FieldRow
                                    icon={<CalendarDays className="w-5 h-5" />}
                                    label="Due Date"
                                    value={field.value ? new Date(field.value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    placeholder="Due Date"
                                    onClick={() => {
                                        setDueDateOpen(prev => !prev)
                                        setStartDateOpen(false)
                                    }}
                                    rightContent={
                                        <ChevronDown className={`w-4 h-4 transition-colors ${dueDateOpen ? 'text-indigo-600 rotate-180' : 'text-gray-400'}`} />
                                    }
                                />
                                {dueDateOpen && (
                                    <div className="relative">
                                        <div className="absolute left-12 top-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                            <ReactDatePicker
                                                selected={field.value ? parseISOToLocal(field.value) : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        field.onChange(formatLocalDate(date))
                                                        setDueDateOpen(false)
                                                    }
                                                }}
                                                minDate={(() => {
                                                    const currentStartDate = watch('task_date')
                                                    const startDateParsed = currentStartDate ? parseISOToLocal(currentStartDate) : null
                                                    const parentStart = parentStartDate ? parseISOToLocal(parentStartDate) : null

                                                    if (startDateParsed && parentStart) {
                                                        return startDateParsed > parentStart ? startDateParsed : parentStart
                                                    }
                                                    return startDateParsed || parentStart || getTodayDate()
                                                })()}
                                                maxDate={parentDueDate ? parseISOToLocal(parentDueDate) || undefined : undefined}
                                                inline
                                                calendarClassName="!border-none !shadow-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>

                {/* Assignee */}
                <div className="border-b border-gray-100">
                    <Controller
                        name="assignee_id"
                        control={control}
                        render={({ field }) => (
                            <>
                                <FieldRow
                                    icon={
                                        selectedAssignee ? (
                                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                                <AvatarImage src={(selectedAssignee as any).avatar_url || selectedAssignee.avatar} />
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
                                    placeholder="Select assignee"
                                    onClick={() => setAssigneeSheetOpen(true)}
                                />
                                <SelectionWrapper
                                    open={assigneeSheetOpen}
                                    onOpenChange={(open) => {
                                        setAssigneeSheetOpen(open)
                                        if (!open) setAssigneeSearch('')
                                    }}
                                >
                                    <SelectionContent className={isDesktop ? "max-w-md" : "max-h-[85vh]"}>
                                        <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setAssigneeSheetOpen(false) })}>
                                            <SelectionTitle>Select Assignee</SelectionTitle>
                                        </SelectionHeader>
                                        <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-2 ${isDesktop ? '' : 'pb-6'}`}>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    autoFocus
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
                                            <div className={`space-y-2 ${isDesktop ? 'max-h-[50vh] overflow-y-auto' : ''}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        field.onChange('')
                                                        setAssigneeSheetOpen(false)
                                                    }}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${!field.value
                                                        ? 'bg-indigo-50 border-2 border-indigo-500'
                                                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
                                                            <UserRound className="w-4 h-4 text-gray-500" />
                                                        </div>
                                                        <span className="font-semibold text-sm text-gray-700">Unassigned</span>
                                                    </div>
                                                    {!field.value && <span className="text-indigo-600 text-lg">✓</span>}
                                                </button>
                                                {orgUsers
                                                    .filter(user =>
                                                        !assigneeSearch.trim() ||
                                                        user.name.toLowerCase().includes(assigneeSearch.toLowerCase())
                                                    )
                                                    .map(user => (
                                                        <button
                                                            type="button"
                                                            key={user.id}
                                                            onClick={() => {
                                                                field.onChange(user.id)
                                                                setAssigneeSheetOpen(false)
                                                            }}
                                                            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${field.value === user.id
                                                                ? 'bg-indigo-50 border-2 border-indigo-500'
                                                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                                                    <AvatarImage src={(user as any).avatar_url || user.avatar} />
                                                                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-semibold text-sm text-gray-700">{user.name}</span>
                                                            </div>
                                                            {field.value === user.id && <span className="text-indigo-600 text-lg">✓</span>}
                                                        </button>
                                                    ))
                                                }
                                                {orgUsers.length > 0 && orgUsers.filter(user =>
                                                    !assigneeSearch.trim() ||
                                                    user.name.toLowerCase().includes(assigneeSearch.toLowerCase())
                                                ).length === 0 && (
                                                        <div className="text-center py-6">
                                                            <p className="text-sm text-gray-400">No members found</p>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </SelectionContent>
                                </SelectionWrapper>
                            </>
                        )}
                    />
                </div>

                {/* Project */}
                <div className="border-b border-gray-100">
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
                                                projects.find(p => p.id === projectId)?.icon ? 'bg-gray-100' : getRandomColor(projectId || '')
                                            )}>
                                                {projects.find(p => p.id === projectId)?.icon ? (
                                                    <img src={projects.find(p => p.id === projectId)?.icon} alt={selectedProjectName} className="w-full h-full object-cover" />
                                                ) : (
                                                    (() => {
                                                        const Icon = getRandomIcon(projectId || '')
                                                        return <Icon className="w-5 h-5" />
                                                    })()
                                                )}
                                            </div>
                                        ) : (
                                            <FolderKanban className="w-5 h-5" />
                                        )
                                    }
                                    label="Project"
                                    value={parentId && !selectedProjectName ? 'None' : selectedProjectName}
                                    placeholder={isLoadingData ? 'Loading…' : (parentId ? 'None' : 'Select project')}
                                    onClick={() => setProjectSheetOpen(true)}
                                    disabled={!!parentId}
                                />
                                <SelectionWrapper
                                    open={projectSheetOpen}
                                    onOpenChange={(open) => {
                                        setProjectSheetOpen(open)
                                        if (!open) setProjectSearch('')
                                    }}
                                >
                                    <SelectionContent className={isDesktop ? "max-w-md" : "max-h-[85vh]"}>
                                        <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setProjectSheetOpen(false) })}>
                                            <SelectionTitle>Select Project</SelectionTitle>
                                        </SelectionHeader>
                                        <div className="px-4 mt-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    value={projectSearch}
                                                    onChange={(e) => setProjectSearch(e.target.value)}
                                                    placeholder="Search projects..."
                                                    className="pl-9 h-9"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-2 ${isDesktop ? 'max-h-[60vh] overflow-y-auto' : 'pb-6'}`}>
                                            {!projectSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        field.onChange('')
                                                        setProjectSheetOpen(false)
                                                    }}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${!field.value
                                                        ? 'bg-indigo-50 border-2 border-indigo-500'
                                                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                        }`}
                                                >
                                                    <span className="font-semibold text-sm text-gray-700">None</span>
                                                    {!field.value && <span className="text-indigo-600 text-lg">✓</span>}
                                                </button>
                                            )}
                                            {projects
                                                .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                                                .map(project => (
                                                    <button
                                                        type="button"
                                                        key={project.id}
                                                        onClick={() => {
                                                            field.onChange(project.id)
                                                            setProjectSheetOpen(false)
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${field.value === project.id
                                                            ? 'bg-indigo-50 border-2 border-indigo-500'
                                                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0",
                                                                project.icon ? 'bg-gray-100' : getRandomColor(project.id)
                                                            )}>
                                                                {project.icon ? (
                                                                    <img src={project.icon} alt={project.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    (() => {
                                                                        const Icon = getRandomIcon(project.id)
                                                                        return <Icon className="w-5 h-5" />
                                                                    })()
                                                                )}
                                                            </div>
                                                            <span className="font-semibold text-sm text-gray-700">{project.name}</span>
                                                        </div>
                                                        {field.value === project.id && <span className="text-indigo-600 text-lg">✓</span>}
                                                    </button>
                                                ))}
                                        </div>
                                    </SelectionContent>
                                </SelectionWrapper>
                            </>
                        )}
                    />
                </div>

                {/* Attachment */}
                <div className="border-b border-gray-100">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            // Validate file size (10MB max)
                            const validFiles = files.filter(file => {
                                if (file.size > 10 * 1024 * 1024) {
                                    toast({
                                        title: 'File too large',
                                        description: `${file.name} exceeds 10MB limit`,
                                        variant: 'destructive',
                                    })
                                    return false
                                }
                                return true
                            })
                            setSelectedFiles(prev => [...prev, ...validFiles])
                            // Reset input
                            if (fileInputRef.current) {
                                fileInputRef.current.value = ''
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 py-3 px-4 text-left hover:bg-gray-50 transition-colors"
                    >
                        <Paperclip className="w-5 h-5 flex-shrink-0 text-gray-500" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 mb-0.5">
                                Attachment
                            </div>
                            <div className="text-sm text-gray-400">
                                {selectedFiles.length > 0
                                    ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`
                                    : 'Add attachments'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                                Max file size: 10MB
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    </button>
                    {selectedFiles.length > 0 && (
                        <div className="px-4 pb-3 space-y-2">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-gray-700 truncate">{file.name}</div>
                                        <div className="text-gray-500">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                        className="ml-2 text-gray-400 hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 p-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={closeModal}
                        className="flex-1 h-10 text-sm font-medium"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 h-10 text-sm font-medium bg-brand-500 hover:bg-brand-600"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            <span>Save</span>
                        )}
                    </Button>
                </div>
            </form>
        </>
    )

    const mobileFormContent = (
        <form onSubmit={handleSubmit(onTaskSubmit)} className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-1 ">
                <Input
                    id="title"
                    autoFocus
                    placeholder="Add a task…"
                    {...register('title')}
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-gray-400"
                />
                <button
                    type="button"
                    className="h-9 w-9 rounded-full grid place-items-center text-gray-500 hover:bg-gray-50"
                    aria-label="Voice input"
                >
                    <Mic className="h-5 w-5" />
                </button>
            </div>

            <div className="flex items-center justify-between pt-1 px-1">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 w-9 rounded-full border border-gray-200 bg-white grid place-items-center text-gray-500 hover:bg-gray-50"
                        aria-label="Add attachment"
                    >
                        <Paperclip className="h-5 w-5" />
                    </button>
                    {selectedFiles.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
                            {selectedFiles.length}
                        </span>
                    )}
                </div>

                <Controller
                    name="deadline"
                    control={control}
                    render={({ field }) => (
                        <>
                            <button
                                type="button"
                                onClick={() => setDueDateOpen(true)}
                                className={cn(
                                    "h-9 rounded-full border px-3 flex items-center gap-1.5 transition-colors",
                                    field.value
                                        ? "border-indigo-200 bg-indigo-50"
                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                )}
                                aria-label="Select Due Date"
                            >
                                <CalendarDays className={cn("h-5 w-5", field.value ? "text-indigo-600" : "text-gray-500")} />
                                <span className={cn("text-[11px] font-medium whitespace-nowrap", field.value ? "text-indigo-700" : "text-gray-600")}>
                                    {field.value
                                        ? new Date(field.value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
                                        : 'Due'}
                                </span>
                            </button>

                            <SelectionWrapper open={dueDateOpen} onOpenChange={setDueDateOpen}>
                                <SelectionContent className={isDesktop ? "max-w-sm" : "max-h-[80vh]"} >
                                    <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setDueDateOpen(false) })}>
                                        <SelectionTitle>Select Due Date</SelectionTitle>
                                    </SelectionHeader>
                                    <div className={`${isDesktop ? 'mt-2' : 'mt-4'} flex justify-center ${isDesktop ? '' : 'pb-6'}`}>
                                        <ReactDatePicker
                                            selected={field.value ? parseISOToLocal(field.value) : null}
                                            onChange={(date: Date | null) => {
                                                if (date) {
                                                    field.onChange(formatLocalDate(date))
                                                    setDueDateOpen(false)
                                                }
                                            }}
                                            minDate={(() => {
                                                const currentStartDate = watch('task_date')
                                                const startDateParsed = currentStartDate ? parseISOToLocal(currentStartDate) : null
                                                const parentStart = parentStartDate ? parseISOToLocal(parentStartDate) : null

                                                if (startDateParsed && parentStart) {
                                                    return startDateParsed > parentStart ? startDateParsed : parentStart
                                                }
                                                return startDateParsed || parentStart || getTodayDate()
                                            })()}
                                            maxDate={parentDueDate ? parseISOToLocal(parentDueDate) || undefined : undefined}
                                            inline
                                        />
                                    </div>
                                    {field.value && (
                                        <div className={isDesktop ? "mt-2" : "px-4 pb-4"}>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    field.onChange('')
                                                    setDueDateOpen(false)
                                                }}
                                                className="w-full h-9"
                                            >
                                                Clear Date
                                            </Button>
                                        </div>
                                    )}
                                </SelectionContent>
                            </SelectionWrapper>
                        </>
                    )}
                />

                <Controller
                    name="assignee_id"
                    control={control}
                    render={({ field }) => (
                        <>
                            <button
                                type="button"
                                onClick={() => setAssigneeSheetOpen(true)}
                                className={cn(
                                    "h-9 w-9 rounded-full border grid place-items-center transition-colors overflow-hidden shrink-0",
                                    field.value
                                        ? "border-indigo-200 bg-indigo-50"
                                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                )}
                                aria-label="Select assignee"
                            >
                                {selectedAssignee ? (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={(selectedAssignee as any).avatar_url || selectedAssignee.avatar} />
                                        <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                            {selectedAssignee.name ? selectedAssignee.name.charAt(0).toUpperCase() : '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <UserRound className="h-5 w-5" />
                                )}
                            </button>

                            <SelectionWrapper
                                open={assigneeSheetOpen}
                                onOpenChange={(open) => {
                                    setAssigneeSheetOpen(open)
                                    if (!open) setAssigneeSearch('')
                                }}
                            >
                                <SelectionContent className={isDesktop ? "max-w-md" : "max-h-[85vh]"} >
                                    <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setAssigneeSheetOpen(false) })}>
                                        <SelectionTitle>Select Assignee</SelectionTitle>
                                    </SelectionHeader>
                                    <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-2 ${isDesktop ? '' : 'pb-6'}`}>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                autoFocus
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
                                        <div className={`space-y-2 ${isDesktop ? 'max-h-[50vh] overflow-y-auto' : ''}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    field.onChange('')
                                                    setAssigneeSheetOpen(false)
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${!field.value
                                                    ? 'bg-indigo-50 border-2 border-indigo-500'
                                                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center">
                                                        <UserRound className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                    <span className="font-semibold text-sm text-gray-700">Unassigned</span>
                                                </div>
                                                {!field.value && <span className="text-indigo-600 text-lg">✓</span>}
                                            </button>
                                            {orgUsers
                                                .filter(user =>
                                                    !assigneeSearch.trim() ||
                                                    user.name.toLowerCase().includes(assigneeSearch.toLowerCase())
                                                )
                                                .map(user => (
                                                    <button
                                                        type="button"
                                                        key={user.id}
                                                        onClick={() => {
                                                            field.onChange(user.id)
                                                            setAssigneeSheetOpen(false)
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${field.value === user.id
                                                            ? 'bg-indigo-50 border-2 border-indigo-500'
                                                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                                                <AvatarImage src={(user as any).avatar_url || user.avatar} />
                                                                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                                                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-semibold text-sm text-gray-700">{user.name}</span>
                                                        </div>
                                                        {field.value === user.id && <span className="text-indigo-600 text-lg">✓</span>}
                                                    </button>
                                                ))
                                            }
                                            {orgUsers.length > 0 && orgUsers.filter(user =>
                                                !assigneeSearch.trim() ||
                                                user.name.toLowerCase().includes(assigneeSearch.toLowerCase())
                                            ).length === 0 && (
                                                    <div className="text-center py-6">
                                                        <p className="text-sm text-gray-400">No members found</p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </SelectionContent>
                            </SelectionWrapper>
                        </>
                    )}
                />

                <Controller
                    name="project_id"
                    control={control}
                    render={({ field }) => (
                        <>
                            <button
                                type="button"
                                onClick={parentId ? undefined : () => setProjectSheetOpen(true)}
                                className={cn(
                                    "h-9 w-9 rounded-full border grid place-items-center transition-colors shrink-0",
                                    field.value
                                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50",
                                    parentId && "opacity-70 cursor-default"
                                )}
                                aria-label="Select project"
                            >
                                {selectedProjectName ? (
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center overflow-hidden",
                                        projects.find(p => p.id === projectId)?.icon ? 'bg-gray-100' : getRandomColor(projectId || '')
                                    )}>
                                        {projects.find(p => p.id === projectId)?.icon ? (
                                            <img src={projects.find(p => p.id === projectId)?.icon} alt={selectedProjectName} className="w-full h-full object-cover" />
                                        ) : (
                                            (() => {
                                                const Icon = getRandomIcon(projectId || '')
                                                return <Icon className="w-4 h-4" />
                                            })()
                                        )}
                                    </div>
                                ) : (
                                    <FolderKanban className="h-5 w-5" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="h-9 w-9 rounded-full border border-gray-200 bg-white grid place-items-center text-gray-500 hover:bg-gray-50 shrink-0"
                                aria-label="Expand form"
                            >
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
                            </button>

                            <SelectionWrapper
                                open={projectSheetOpen}
                                onOpenChange={(open) => {
                                    setProjectSheetOpen(open)
                                    if (!open) setProjectSearch('')
                                }}
                            >
                                <SelectionContent className={isDesktop ? "max-w-md" : "max-h-[85vh]"} >
                                    <SelectionHeader {...(isDesktop ? {} : { showBackButton: true, onBack: () => setProjectSheetOpen(false) })}>
                                        <SelectionTitle>Select Project</SelectionTitle>
                                    </SelectionHeader>
                                    <div className="px-4 mt-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                value={projectSearch}
                                                onChange={(e) => setProjectSearch(e.target.value)}
                                                placeholder="Search projects..."
                                                className="pl-9 h-9"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-2 ${isDesktop ? 'max-h-[60vh] overflow-y-auto' : 'pb-6'}`}>
                                        {!projectSearch && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    field.onChange('')
                                                    setProjectSheetOpen(false)
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${!field.value
                                                    ? 'bg-indigo-50 border-2 border-indigo-500'
                                                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                    }`}
                                            >
                                                <span className="font-semibold text-sm text-gray-700">None</span>
                                                {!field.value && <span className="text-indigo-600 text-lg">✓</span>}
                                            </button>
                                        )}
                                        {projects
                                            .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                                            .map(project => (
                                                <button
                                                    type="button"
                                                    key={project.id}
                                                    onClick={() => {
                                                        field.onChange(project.id)
                                                        setProjectSheetOpen(false)
                                                    }}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${field.value === project.id
                                                        ? 'bg-indigo-50 border-2 border-indigo-500'
                                                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0",
                                                            project.icon ? 'bg-gray-100' : getRandomColor(project.id)
                                                        )}>
                                                            {project.icon ? (
                                                                <img src={project.icon} alt={project.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                (() => {
                                                                    const Icon = getRandomIcon(project.id)
                                                                    return <Icon className="w-5 h-5" />
                                                                })()
                                                            )}
                                                        </div>
                                                        <span className="font-semibold text-sm text-gray-700">{project.name}</span>
                                                    </div>
                                                    {field.value === project.id && <span className="text-indigo-600 text-lg">✓</span>}
                                                </button>
                                            ))}
                                    </div>
                                </SelectionContent>
                            </SelectionWrapper>
                        </>
                    )}
                />


                <Button
                    type="submit"
                    size="icon"
                    disabled={isSubmitting}
                    className="h-9 w-9 rounded-full bg-brand-500 hover:bg-brand-600 shrink-0"
                    aria-label="Send"
                >
                    {isSubmitting ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </Button>
            </div>

            {errors.title && (
                <p className="text-xs text-red-600 px-1">{errors.title.message}</p>
            )}
        </form>
    )

    // Render based on screen size
    if (isDesktop) {
        return (
            <Dialog open={activeModal === 'createTask' || activeModal === 'editTask'} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className={cn("max-w-3xl p-0 gap-0 overflow-hidden flex flex-col", isAnySelectionOpen && "blur-sm")}>
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100">
                        <DialogTitle className="text-lg font-semibold text-gray-900">
                            {isEditMode ? 'Edit Task' : 'Create A New Task'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-4 pb-4">
                        {isLoadingData ? <CreateTaskModalSkeleton /> : desktopFormContent}
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    // Mobile view
    return (
        <BottomSheet open={activeModal === 'createTask' || activeModal === 'editTask'} onOpenChange={(open) => !open && closeModal()}>
            <BottomSheetContent showCloseButton={false} className="max-h-[92vh] overflow-y-auto">
                <BottomSheetHeader onBack={closeModal}>
                    <BottomSheetTitle className="text-lg font-semibold">
                        {isEditMode ? 'Edit Task' : 'Create A New Task'}
                    </BottomSheetTitle>
                </BottomSheetHeader>
                <div className="mt-2 text-left">
                    {isLoadingData ? <CreateTaskModalSkeleton /> : (isExpanded ? desktopFormContent : mobileFormContent)}
                </div>
            </BottomSheetContent>
        </BottomSheet>
    )
}

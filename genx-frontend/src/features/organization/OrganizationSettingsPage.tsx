import { useState, useEffect } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Button,
    Input,
    Label,
    Separator,
    Badge,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import {
    Settings,
    Shield,
    Clock,
    Zap,
    CheckCircle2,
    History,
    Briefcase,
    Save,
    AlertCircle,
    Trophy,
    Tag,
    Plus,
    Edit,
    Trash2,
    GripVertical,
    ListTodo,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notificationStore'
import { useStatusStore } from '@/stores/statusStore'
import { organizationsApi } from '@/api/organizations'
import { taskStatusesApi, TaskStatus } from '@/api/taskStatuses'
import { teamApi } from '@/api/team'

interface OrganizationSettings {
    // General
    timezone: string
    working_days: string[]
    expected_hours_per_day: number

    // Productivity
    min_daily_hours: number
    allow_overtime: boolean
    require_extra_hours_approval: boolean
    under_utilization_threshold: number
    over_utilization_threshold: number
    work_start_time?: string
    work_end_time?: string

    // Workflow
    custom_kanban_enabled: boolean
    workflow_definition: any
    enforce_subtask_completion: boolean
    require_delay_reason: boolean
    sprint_enabled?: boolean
    standup_time_minutes?: number

    // Daily Report
    daily_report_enabled: boolean
    daily_report_recipients: string[]
    daily_report_time: string

    // Time Logging
    allow_manual_time_entry: boolean
    lock_logs_after_days: number
    require_work_description: boolean

    // Approvals
    due_date_approvers: 'admin' | 'lead' | 'both'
    sla_duration_hours: number

    // Audit
    audit_enabled: boolean
    retention_period_days: number

    // Leaderboard Points
    points_task_on_time?: number
    points_all_tasks_no_overdue?: number
    points_full_day_complete?: number
    points_per_extra_hour?: number
}

export function OrganizationSettingsPage() {
    const { show } = useNotificationStore()
    const { statuses: storeStatuses, fetchStatuses: syncGlobalStatuses } = useStatusStore()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [statuses, setStatuses] = useState<TaskStatus[]>([])
    const [isLoadingStatuses, setIsLoadingStatuses] = useState(false)
    const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [statusToDelete, setStatusToDelete] = useState<TaskStatus | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [orgMembers, setOrgMembers] = useState<{ id: string; name: string; email: string; role: string }[]>([])
    const [newStatusName, setNewStatusName] = useState('')
    const [newStatusColor, setNewStatusColor] = useState('#6b7280')
    const [settings, setSettings] = useState<OrganizationSettings>({
        timezone: 'UTC',
        working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        expected_hours_per_day: 8,
        min_daily_hours: 0,
        allow_overtime: true,
        require_extra_hours_approval: false,
        under_utilization_threshold: 70,
        over_utilization_threshold: 110,
        work_start_time: '09:00:00',
        work_end_time: '18:00:00',
        custom_kanban_enabled: false,
        workflow_definition: null,
        enforce_subtask_completion: false,
        require_delay_reason: false,
        sprint_enabled: false,
        daily_report_enabled: false,
        daily_report_recipients: [],
        daily_report_time: '18:00',
        allow_manual_time_entry: true,
        lock_logs_after_days: 7,
        require_work_description: true,
        due_date_approvers: 'admin',
        sla_duration_hours: 24,
        audit_enabled: true,
        retention_period_days: 90,
        points_task_on_time: 5,
        points_all_tasks_no_overdue: 10,
        points_full_day_complete: 15,
        points_per_extra_hour: 10,
        standup_time_minutes: 2,
    })

    const fetchStatuses = async () => {
        try {
            setIsLoadingStatuses(true)
            await syncGlobalStatuses()
        } catch (error) {
            console.error('Failed to fetch statuses:', error)
            show({
                type: 'error',
                title: 'Fetch Failed',
                message: 'Could not load task statuses.'
            })
        } finally {
            setIsLoadingStatuses(false)
        }
    }

    // Sync store statuses to local state when they change
    useEffect(() => {
        if (storeStatuses.length > 0) {
            setStatuses(storeStatuses)
        }
    }, [storeStatuses])

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setIsLoading(true)
                const response = await organizationsApi.getSettings()
                if (response.success && response.data) {
                    const data = response.data
                    setSettings({
                        timezone: data.timezone || 'UTC',
                        working_days: data.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                        expected_hours_per_day: data.expected_hours_per_day || 8,
                        min_daily_hours: data.min_daily_hours ?? 0,
                        allow_overtime: data.allow_overtime ?? true,
                        require_extra_hours_approval: data.require_extra_hours_approval ?? false,
                        under_utilization_threshold: data.under_utilization_threshold ?? 70,
                        over_utilization_threshold: data.over_utilization_threshold ?? 110,
                        work_start_time: data.work_start_time
                            ? data.work_start_time.substring(0, 5)
                            : '09:00',
                        work_end_time: data.work_end_time
                            ? data.work_end_time.substring(0, 5)
                            : '18:00',
                        custom_kanban_enabled: data.custom_kanban_enabled ?? false,
                        workflow_definition: data.workflow_definition || null,
                        enforce_subtask_completion: data.enforce_subtask_completion ?? false,
                        require_delay_reason: data.require_delay_reason ?? false,
                        sprint_enabled: data.sprint_enabled ?? false,
                        daily_report_enabled: data.daily_report_enabled ?? false,
                        daily_report_recipients: data.daily_report_recipients ?? [],
                        daily_report_time: data.daily_report_time
                            ? data.daily_report_time.substring(0, 5)
                            : '18:00',
                        allow_manual_time_entry: data.allow_manual_time_entry ?? true,
                        lock_logs_after_days: data.lock_logs_after_days ?? 7,
                        require_work_description: data.require_work_description ?? true,
                        due_date_approvers: data.due_date_approvers || 'admin',
                        sla_duration_hours: data.sla_duration_hours ?? 24,
                        audit_enabled: data.audit_enabled ?? true,
                        retention_period_days: data.retention_period_days ?? 90,
                        points_task_on_time: data.points_task_on_time ?? 5,
                        points_all_tasks_no_overdue: data.points_all_tasks_no_overdue ?? 10,
                        points_full_day_complete: data.points_full_day_complete ?? 15,
                        points_per_extra_hour: data.points_per_extra_hour ?? 10,
                        standup_time_minutes: data.standup_time_minutes ?? 2,
                    })
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error)
                show({
                    type: 'error',
                    title: 'Fetch Failed',
                    message: 'Could not load organization settings.'
                })
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
        fetchStatuses()
        teamApi.getMembers().then((res: any) => {
            const members = res?.data ?? res ?? []
            setOrgMembers(members.map((m: any) => ({
                id: m.id,
                name: m.name,
                email: m.email,
                role: m.role,
            })))
        }).catch(() => { })
    }, [show])

    const handleCreateStatus = async () => {
        if (!newStatusName.trim()) {
            show({
                type: 'error',
                title: 'Validation Error',
                message: 'Status name is required.'
            })
            return
        }

        try {
            const response = await taskStatusesApi.create({
                name: newStatusName.trim(),
                color: newStatusColor,
            })
            if (response.success) {
                show({
                    type: 'success',
                    title: 'Success',
                    message: 'Status created successfully.'
                })
                setNewStatusName('')
                setNewStatusColor('#6b7280')
                fetchStatuses()
            }
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Create Failed',
                message: error.response?.data?.message || 'Could not create status.'
            })
        }
    }

    const handleUpdateStatus = async (status: TaskStatus, updates: { name?: string; color?: string }) => {
        try {
            const response = await taskStatusesApi.update(status.id, updates)
            if (response.success) {
                show({
                    type: 'success',
                    title: 'Success',
                    message: 'Status updated successfully.'
                })
                setEditingStatus(null)
                fetchStatuses()
            }
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Update Failed',
                message: error.response?.data?.message || 'Could not update status.'
            })
        }
    }

    const handleDeleteStatus = async (status: TaskStatus) => {
        setStatusToDelete(status)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!statusToDelete) return

        try {
            setIsDeleting(true)
            const response = await taskStatusesApi.delete(statusToDelete.id)
            if (response.success) {
                show({
                    type: 'success',
                    title: 'Success',
                    message: 'Status deleted successfully.'
                })
                setIsDeleteDialogOpen(false)
                setStatusToDelete(null)
                fetchStatuses()
            }
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Delete Failed',
                message: error.response?.data?.message || 'Could not delete status.'
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id) {
            return
        }

        const oldIndex = statuses.findIndex((s) => s.id === active.id)
        const newIndex = statuses.findIndex((s) => s.id === over.id)

        if (oldIndex === -1 || newIndex === -1) {
            return
        }

        // Reorder locally for immediate feedback
        const newStatuses = [...statuses]
        const [movedStatus] = newStatuses.splice(oldIndex, 1)
        newStatuses.splice(newIndex, 0, movedStatus)

        // Update order values
        const reorderedStatuses = newStatuses.map((status, index) => ({
            id: status.id,
            order: index + 1,
        }))

        setStatuses(newStatuses)

        try {
            const response = await taskStatusesApi.reorder(reorderedStatuses)
            if (response.success) {
                show({
                    type: 'success',
                    title: 'Success',
                    message: 'Status order updated successfully.'
                })
                fetchStatuses()
            }
        } catch (error: any) {
            // Revert on error
            setStatuses(statuses)
            show({
                type: 'error',
                title: 'Reorder Failed',
                message: error.response?.data?.message || 'Could not reorder statuses.'
            })
        }
    }

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Sortable Status Item Component
    const SortableStatusItem = ({ status }: { status: TaskStatus }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({
            id: status.id,
            disabled: status.is_system || editingStatus?.id === status.id,
        })

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            zIndex: isDragging ? 50 : undefined,
        }

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    "group flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 bg-white rounded-xl border border-gray-50 transition-all duration-300",
                    isDragging
                        ? "shadow-xl border-brand-100 scale-[1.01] ring-2 ring-brand-50"
                        : "hover:bg-brand-50/30 hover:border-brand-100 hover:shadow-lg hover:shadow-brand-100/20"
                )}
            >
                <div className="flex items-center gap-4 sm:gap-6 flex-1">
                    <div
                        {...attributes}
                        {...listeners}
                        className={cn(
                            "cursor-grab active:cursor-grabbing p-1.5 rounded-lg border border-transparent transition-all",
                            (status.is_system || editingStatus?.id === status.id)
                                ? "cursor-not-allowed opacity-30"
                                : "hover:border-gray-100 hover:bg-gray-50 text-gray-300 hover:text-gray-500"
                        )}
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="relative">
                        <div
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: status.color || '#6b7280' }}
                        />
                        <div
                            className="absolute inset-0 rounded-full ring-2 ring-gray-100/30"
                            style={{ borderColor: `${status.color}20` }}
                        />
                    </div>

                    {editingStatus?.id === status.id ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <Input
                                value={editingStatus.name}
                                onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                                className="flex-1 rounded-xl h-9 sm:h-10 border-brand-100 focus:ring-brand-500 text-sm"
                                placeholder="Status name"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleUpdateStatus(status, { name: editingStatus.name })
                                    }
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Input
                                        type="color"
                                        value={editingStatus.color || '#6b7280'}
                                        onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                                        className="w-12 h-9 sm:h-10 p-1 rounded-xl cursor-pointer border-brand-100"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(status, {
                                        name: editingStatus.name,
                                        color: editingStatus.color || undefined
                                    })}
                                    className="rounded-full px-5 bg-brand-600 hover:bg-brand-700 h-8 sm:h-9 font-bold text-xs"
                                >
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setEditingStatus(null)}
                                    className="rounded-full px-5 h-8 sm:h-9 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-900 text-xs sm:text-sm tracking-tight truncate uppercase">{status.name}</div>
                            </div>
                            {status.is_system && (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-none font-bold text-[10px] uppercase tracking-widest px-3">
                                    System
                                </Badge>
                            )}
                        </>
                    )}
                </div>

                {!status.is_system && editingStatus?.id !== status.id && (
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingStatus({ ...status })}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-gray-300 hover:text-brand-600 hover:bg-brand-50 transition-all p-0"
                        >
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteStatus(status)}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all p-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    const handleSave = async () => {
        try {
            setIsSaving(true)
            const payload = {
                ...settings,
                daily_report_time: settings.daily_report_time
                    ? settings.daily_report_time.length === 5
                        ? `${settings.daily_report_time}:00`
                        : settings.daily_report_time
                    : undefined,
                work_start_time: settings.work_start_time
                    ? settings.work_start_time.length === 5
                        ? `${settings.work_start_time}:00`
                        : settings.work_start_time
                    : undefined,
                work_end_time: settings.work_end_time
                    ? settings.work_end_time.length === 5
                        ? `${settings.work_end_time}:00`
                        : settings.work_end_time
                    : undefined,
            }
            await organizationsApi.updateSettings(payload)
            window.dispatchEvent(new CustomEvent('organization-settings-updated', { detail: { settings } }))
            show({
                type: 'success',
                title: 'Settings Saved',
                message: 'Organization configuration has been updated successfully.'
            })
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Update Failed',
                message: error.response?.data?.message || 'Failed to save settings. Please try again.'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const toggleWorkingDay = (day: string) => {
        setSettings(prev => ({
            ...prev,
            working_days: prev.working_days.includes(day)
                ? prev.working_days.filter(d => d !== day)
                : [...prev.working_days, day]
        }))
    }

    const toggleSetting = (key: keyof OrganizationSettings) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    if (isLoading) {
        return <PageSkeleton />
    }

    const cardClassName = "border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl"
    const headerClassName = "bg-gray-50/50 border-b border-gray-100 px-8 py-6"
    const inputClassName = "rounded-xl border-gray-200 focus:ring-brand-500 focus:border-brand-500 h-12 transition-all"

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4 sm:gap-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="bg-brand-100 text-brand-700 hover:bg-brand-100 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                Workspace Admin
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Settings className="w-6 h-6 text-brand-600 shrink-0" />
                            Organization Settings
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm sm:text-base">
                            Global configuration for your entire organization's workflow.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 sm:flex-none rounded-full px-6 md:px-8 lg:px-10 h-10 md:h-11 lg:h-12 bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-200 transition-all font-bold flex items-center justify-center gap-2 active:scale-95"
                    >
                        {isSaving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="general" className="space-y-6 md:space-y-7 lg:space-y-8">
                <div className="sticky top-0 z-10 py-3 md:py-3.5 lg:py-4 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 mb-6">
                    <TabsList className="bg-white/50 p-1 md:p-1.25 lg:p-1.5 rounded-2xl sm:rounded-full border border-gray-200/50 flex flex-wrap sm:flex-nowrap h-auto w-full sm:w-max mx-auto gap-1 sm:gap-1 shadow-sm">
                        {[
                            { value: 'general', label: 'General', icon: Settings },
                            { value: 'workflow-time', label: 'Workflow & Time', icon: Briefcase },
                            { value: 'advanced', label: 'Advanced', icon: Zap },
                        ].map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex-1 sm:flex-none px-2 md:px-4 lg:px-6 py-2 md:py-2.25 lg:py-2.5 rounded-xl sm:rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[9px] min-[380px]:text-[10px] md:text-xs uppercase tracking-widest text-gray-500 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
                            >
                                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="general" className="animate-in fade-in slide-in-from-right-4 duration-500 outline-none">
                    <Card className={cardClassName}>
                        <CardHeader className={cn(headerClassName, "px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6")}>
                            <CardTitle className="text-md md:text-lg lg:text-xl font-bold text-gray-900">General Configuration</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Core organization identity and localized settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-6 lg:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 sm:gap-y-10">
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-brand-500 rounded-full" />
                                        <Label className="text-xs sm:text-sm lg:text-md font-bold text-gray-900 uppercase tracking-wider">Primary Timezone</Label>
                                    </div>
                                    <Input
                                        value={settings.timezone}
                                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                        className={cn(inputClassName, "h-11 md:h-12 lg:h-13 text-sm font-medium shadow-sm bg-white/50 border-gray-100 hover:border-gray-200 focus:bg-white")}
                                        placeholder="UTC"
                                    />
                                    <p className="text-[11px] text-xs sm:text-sm text-gray-500 font-medium">Used for SLA calculations and notification timing.</p>
                                </div>
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-brand-500 rounded-full" />
                                        <Label className="text-xs sm:text-sm lg:text-md font-bold text-gray-900 uppercase tracking-wider">Expected Work Hours / Day</Label>
                                    </div>
                                    <div className="relative group">
                                        <Input
                                            type="number"
                                            min="1"
                                            max="24"
                                            step="0.5"
                                            value={settings.expected_hours_per_day || ''}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setSettings({ ...settings, expected_hours_per_day: e.target.value === '' ? 0 : Number(e.target.value) })}
                                            className={cn(inputClassName, "h-11 md:h-12 lg:h-13 pl-11 md:pl-12 lg:pl-14 pr-16 md:pr-18 lg:pr-20 text-sm font-bold tabular-nums shadow-sm bg-white/50 border-gray-100 hover:border-gray-200 focus:bg-white")}
                                        />
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 transition-transform group-focus-within:scale-110" />
                                        <span className="absolute right-4 md:right-5 lg:right-6 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-gray-400 font-bold pointer-events-none uppercase tracking-widest">Hours</span>
                                    </div>
                                    <p className="text-[11px] text-xs sm:text-sm text-gray-500 font-medium">Standard daily target used for utilization reporting.</p>
                                </div>
                            </div>

                            <Separator className="bg-gray-100" />

                            <div className="space-y-6 sm:space-y-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-brand-500 rounded-full" />
                                    <Label className="text-xs sm:text-sm lg:text-md font-bold text-gray-900 uppercase tracking-wider">Standard Working Days</Label>
                                </div>
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button
                                            key={day}
                                            onClick={() => toggleWorkingDay(day)}
                                            className={cn(
                                                "px-4 sm:px-6 py-2 sm:py-3 lg:py-3 lg:px-5 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all md:px-4 md:py-2 md:text-xs",
                                                settings.working_days.includes(day)
                                                    ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-100"
                                                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="workflow-time" className="animate-in fade-in slide-in-from-right-4 duration-500 outline-none space-y-6">
                    {/* Workflow Section */}
                    <Card className={cardClassName}>
                        <CardHeader className={cn(headerClassName, "px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6")}>
                            <CardTitle className="text-md md:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-brand-600"/>
                                Task Workflow Rules
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Governance for task lifecycle and status transitions.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 lg:space-y-10">
                            <div className="space-y-4 sm:space-y-6">
                                {/* Custom Kanban */}
                                <div className="flex flex-row items-center justify-between gap-4 p-5 md:p-6 lg:p-7 rounded-2xl md:rounded-[1.75rem] lg:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
                                    <div className="flex gap-4 md:gap-5 lg:gap-6 flex-1">
                                        <div className="p-3 md:p-3.5 lg:p-4 rounded-2xl bg-brand-50 text-brand-600 shrink-0 h-fit transition-transform group-hover:scale-110 duration-300 shadow-sm">
                                            <Zap className="w-5 h-5 md:w-5.5 lg:w-6 md:h-5.5 lg:h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Custom Kanban Boards</h4>
                                            <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium max-w-md mt-1.5 opacity-80">Allow projects to define their own status columns instead of standard global workflow.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center shrink-0">
                                        <button
                                            onClick={() => toggleSetting('custom_kanban_enabled')}
                                            className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"
                                        >
                                            <span className={cn(
                                                "text-[10px] sm:text-xs font-extrabold uppercase tracking-widest leading-none",
                                                settings.custom_kanban_enabled ? "text-brand-600" : "text-gray-400"
                                            )}>
                                                {settings.custom_kanban_enabled ? "Enabled" : "Disabled"}
                                            </span>
                                            <div className={cn(
                                                "w-10 h-5 sm:w-11 sm:h-6 rounded-full relative cursor-pointer p-1 transition-all duration-300",
                                                settings.custom_kanban_enabled ? "bg-brand-500 shadow-lg shadow-brand-100" : "bg-gray-200"
                                            )}>
                                                <div className={cn(
                                                    "w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-md transition-all duration-300",
                                                    settings.custom_kanban_enabled ? "translate-x-5 sm:translate-x-5" : "translate-x-0"
                                                )} />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Enforce Subtasks */}
                                <div className="flex flex-row items-center justify-between gap-4 p-5 md:p-6 lg:p-7 rounded-2xl md:rounded-[1.75rem] lg:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
                                    <div className="flex gap-4 md:gap-5 lg:gap-6 flex-1">
                                        <div className="p-3 md:p-3.5 lg:p-4 rounded-2xl bg-brand-50 text-brand-600 shrink-0 h-fit transition-transform group-hover:scale-110 duration-300 shadow-sm">
                                            <Shield className="w-5 h-5 md:w-5.5 lg:w-6 md:h-5.5 lg:h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Enforce Subtask Completion</h4>
                                            <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium max-w-md mt-1.5 opacity-80">Prevent closing a main task if it still contains open subtasks.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center shrink-0">
                                        <button
                                            onClick={() => toggleSetting('enforce_subtask_completion')}
                                            className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"
                                        >
                                            <span className={cn(
                                                "text-[10px] sm:text-xs font-extrabold uppercase tracking-widest leading-none",
                                                settings.enforce_subtask_completion ? "text-brand-600" : "text-gray-400"
                                            )}>
                                                {settings.enforce_subtask_completion ? "Enabled" : "Disabled"}
                                            </span>
                                            <div className={cn(
                                                "w-10 h-5 sm:w-11 sm:h-6 rounded-full relative cursor-pointer p-1 transition-all duration-300",
                                                settings.enforce_subtask_completion ? "bg-brand-500 shadow-lg shadow-brand-100" : "bg-gray-200"
                                            )}>
                                                <div className={cn(
                                                    "w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-md transition-all duration-300",
                                                    settings.enforce_subtask_completion ? "translate-x-5 sm:translate-x-5" : "translate-x-0"
                                                )} />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Delayed Reason */}
                                <div className="flex flex-row items-center justify-between gap-4 p-5 md:p-6 lg:p-7 rounded-2xl md:rounded-[1.75rem] lg:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
                                    <div className="flex gap-4 md:gap-5 lg:gap-6 flex-1">
                                        <div className="p-3 md:p-3.5 lg:p-4 rounded-2xl bg-brand-50 text-brand-600 shrink-0 h-fit transition-transform group-hover:scale-110 duration-300 shadow-sm">
                                            <AlertCircle className="w-5 h-5 md:w-5.5 lg:w-6 md:h-5.5 lg:h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Require Delay Reason</h4>
                                            <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium max-w-md mt-1.5 opacity-80">Prompt users for a brief explanation when a task moves past its original due date.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center shrink-0">
                                        <button
                                            onClick={() => toggleSetting('require_delay_reason')}
                                            className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"
                                        >
                                            <span className={cn(
                                                "text-[10px] sm:text-xs font-extrabold uppercase tracking-widest leading-none",
                                                settings.require_delay_reason ? "text-brand-600" : "text-gray-400"
                                            )}>
                                                {settings.require_delay_reason ? "Enabled" : "Disabled"}
                                            </span>
                                            <div className={cn(
                                                "w-10 h-5 sm:w-11 sm:h-6 rounded-full relative cursor-pointer p-1 transition-all duration-300",
                                                settings.require_delay_reason ? "bg-brand-500 shadow-lg shadow-brand-100" : "bg-gray-200"
                                            )}>
                                                <div className={cn(
                                                    "w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-md transition-all duration-300",
                                                    settings.require_delay_reason ? "translate-x-5 sm:translate-x-5" : "translate-x-0"
                                                )} />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Sprint & Backlog */}
                                <div className="flex flex-row items-center justify-between gap-4 p-5 md:p-6 lg:p-7 rounded-2xl md:rounded-[1.75rem] lg:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
                                    <div className="flex gap-4 md:gap-5 lg:gap-6 flex-1">
                                        <div className="p-3 md:p-3.5 lg:p-4 rounded-2xl bg-brand-50 text-brand-600 shrink-0 h-fit transition-transform group-hover:scale-110 duration-300 shadow-sm">
                                            <ListTodo className="w-5 h-5 md:w-5.5 lg:w-6 md:h-5.5 lg:h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Sprint & Backlog</h4>
                                            <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium max-w-md mt-1.5 opacity-80">Enable sprint planning, backlog view, story points on tasks and standup time limit.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center shrink-0">
                                        <button
                                            onClick={() => toggleSetting('sprint_enabled')}
                                            className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"
                                        >
                                            <span className={cn(
                                                "text-[10px] sm:text-xs font-extrabold uppercase tracking-widest leading-none",
                                                settings.sprint_enabled ? "text-brand-600" : "text-gray-400"
                                            )}>
                                                {settings.sprint_enabled ? "Enabled" : "Disabled"}
                                            </span>
                                            <div className={cn(
                                                "w-10 h-5 sm:w-11 sm:h-6 rounded-full relative cursor-pointer p-1 transition-all duration-300",
                                                settings.sprint_enabled ? "bg-brand-500 shadow-lg shadow-brand-100" : "bg-gray-200"
                                            )}>
                                                <div className={cn(
                                                    "w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-md transition-all duration-300",
                                                    settings.sprint_enabled ? "translate-x-5 sm:translate-x-5" : "translate-x-0"
                                                )} />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {settings.sprint_enabled && (
                                    <div className="mt-4 md:mt-5 lg:mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-[1.5rem] lg:rounded-3xl border border-brand-100 bg-brand-50/20 shadow-none">
                                            <div className="space-y-1 md:space-y-1.5 flex-1">
                                                <p className="font-bold text-sm md:text-base lg:text-lg text-gray-900">Standup Time Limit</p>
                                                <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium opacity-80">Set the default duration for each team member during daily standup sessions.</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white p-1.5 md:p-2 rounded-2xl border border-gray-100 shadow-sm shrink-0 h-fit w-fit lg:ml-auto">
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max="60"
                                                        value={settings.standup_time_minutes || ''}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => setSettings(s => ({ ...s, standup_time_minutes: e.target.value === '' ? 0 : Number(e.target.value) }))}
                                                        className="w-16 md:w-20 lg:w-24 h-9 md:h-10 lg:h-11 rounded-xl border-none bg-gray-50/50 focus:ring-2 focus:ring-brand-500 text-center font-bold text-brand-700 text-sm"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1 border-l border-gray-100 pl-2 md:pl-3">
                                                    <button
                                                        onClick={() => setSettings(s => ({ ...s, standup_time_minutes: Math.min(60, (s.standup_time_minutes || 0) + 1) }))}
                                                        className="p-1 hover:bg-brand-50 rounded-lg text-brand-600 transition-all active:scale-90"
                                                    >
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => setSettings(s => ({ ...s, standup_time_minutes: Math.max(1, (s.standup_time_minutes || 0) - 1) }))}
                                                        className="p-1 hover:bg-brand-50 rounded-lg text-brand-600 transition-all active:scale-90"
                                                    >
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <span className="text-[10px] md:text-[11px] lg:text-xs font-black text-brand-400 uppercase tracking-tighter ml-1">Min</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Daily Report */}
                            <div className="flex flex-row items-center justify-between gap-4 p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-[1.5rem] lg:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-100 group mt-6 md:mt-8 lg:mt-10">
                                <div className="flex gap-4 md:gap-5 lg:gap-6 flex-1">
                                    <div className="p-3 md:p-3.5 lg:p-4 rounded-2xl bg-brand-50 text-brand-600 shrink-0 h-fit transition-transform group-hover:scale-110 duration-300 shadow-sm">
                                        <Clock className="w-5 h-5 md:w-5.5 lg:w-6 md:h-5.5 lg:h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Daily Summary Report</h4>
                                        <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium max-w-md mt-1.5 opacity-80">Send an automated daily summary report to selected recipients.</p>
                                    </div>
                                </div>
                                <div className="flex items-center shrink-0">
                                    <button
                                        onClick={() => toggleSetting('daily_report_enabled')}
                                        className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"
                                    >
                                        <span className={cn(
                                            "text-[10px] sm:text-xs font-extrabold uppercase tracking-widest leading-none",
                                            settings.daily_report_enabled ? "text-brand-600" : "text-gray-400"
                                        )}>
                                            {settings.daily_report_enabled ? "Enabled" : "Disabled"}
                                        </span>
                                        <div className={cn(
                                            "w-10 h-5 sm:w-11 sm:h-6 rounded-full relative cursor-pointer p-1 transition-all duration-300",
                                            settings.daily_report_enabled ? "bg-brand-500 shadow-lg shadow-brand-100" : "bg-gray-200"
                                        )}>
                                            <div className={cn(
                                                "w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-md transition-all duration-300",
                                                settings.daily_report_enabled ? "translate-x-5 sm:translate-x-5" : "translate-x-0"
                                            )} />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Daily Report sub-settings */}
                            {settings.daily_report_enabled && (
                                <div className="mt-4 md:mt-5 lg:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Recipients */}
                                    <div className="flex flex-col justify-between gap-5 p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-[1.5rem] lg:rounded-3xl border border-brand-100 bg-brand-50/20 shadow-none">
                                        <div className="space-y-1 md:space-y-1.5 text-left">
                                            <p className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Report Recipients</p>
                                            <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium opacity-80">Choose who receives the daily report email.</p>
                                        </div>
                                        <div className="flex flex-row items-center gap-2 overflow-x-auto no-scrollbar pb-1 justify-start">
                                            {([
                                                { label: 'Lead', roles: ['team_lead'] },
                                                { label: 'Admin', roles: ['admin'] },
                                                { label: 'Both', roles: ['admin', 'team_lead'] },
                                            ] as const).map(option => {
                                                const emailsForOption = orgMembers
                                                    .filter(m => (Array.from(option.roles) as string[]).includes(m.role))
                                                    .map(m => m.email)

                                                const isSelected = emailsForOption.length > 0 &&
                                                    emailsForOption.every(e => settings.daily_report_recipients.includes(e)) &&
                                                    settings.daily_report_recipients.every(e => emailsForOption.includes(e))

                                                const handleSelect = () => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        daily_report_recipients: isSelected ? [] : emailsForOption,
                                                    }))
                                                }

                                                return (
                                                    <button
                                                        key={option.label}
                                                        onClick={handleSelect}
                                                        className={cn(
                                                            "px-3 sm:px-5 py-1.5 rounded-full border-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 whitespace-nowrap shrink-0",
                                                            isSelected
                                                                ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-200"
                                                                : "bg-white border-gray-100 text-gray-500 hover:border-brand-200 hover:text-brand-600"
                                                        )}
                                                    >
                                                        {option.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Report Time */}
                                    <div className="flex flex-col justify-between gap-5 p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-[1.5rem] lg:rounded-3xl border border-brand-100 bg-brand-50/20 shadow-none">
                                        <div className="space-y-1 md:space-y-1.5 text-left">
                                            <p className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Delivery Time</p>
                                            <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium opacity-80">Set the scheduled time for automated delivery.</p>
                                        </div>
                                        <div className="relative inline-flex items-center justify-start w-full">
                                            <div className="relative group">
                                                <input
                                                    type="time"
                                                    value={settings.daily_report_time}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, daily_report_time: e.target.value }))}
                                                    className="pl-4 pr-4 h-8 md:h-8.5 lg:h-9 w-[150px] md:w-[160px] lg:w-[180px] rounded-full border-2 border-gray-100 bg-white text-sm md:text-[15px] lg:text-base font-bold text-gray-800 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50 transition-all shadow-sm cursor-pointer appearance-none text-center tabular-nums"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Time Logging Section */}
                    <Card className={cardClassName}>
                        <CardHeader className={cn(headerClassName, "px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6")}>
                            <CardTitle className="text-md md:text-md lg:text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-brand-600" />
                                Time Logging Configuration
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Control how time is tracked and logged across the organization.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-6 lg:space-y-8">
                            <div className="space-y-4 sm:space-y-6">
                                <div className="flex items-center justify-between p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-[1.5rem] lg:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
                                    <div className="flex gap-4 md:gap-5 lg:gap-6 flex-1">
                                        <div className="p-3 md:p-3.5 lg:p-4 rounded-2xl bg-brand-50 text-brand-600 shrink-0 h-fit transition-transform group-hover:scale-110 duration-300 shadow-sm">
                                            <Clock className="w-5 h-5 md:w-5.5 lg:w-6 md:h-5.5 lg:h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Allow Manual Time Entry</h4>
                                            <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium opacity-80 mt-1">Enable users to manually log time instead of using timers.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSetting('allow_manual_time_entry')}
                                        className={cn(
                                            "w-10 h-5 sm:w-11 sm:h-6 rounded-full relative cursor-pointer transition-all duration-300 shrink-0 p-1",
                                            settings.allow_manual_time_entry ? "bg-brand-500 shadow-lg shadow-brand-100" : "bg-gray-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-md transition-all duration-300",
                                            settings.allow_manual_time_entry ? "translate-x-5 sm:translate-x-5" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-[1.5rem] lg:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
                                    <div className="flex gap-4 md:gap-5 lg:gap-6 flex-1">
                                        <div className="p-3 md:p-3.5 lg:p-4 rounded-2xl bg-brand-50 text-brand-600 shrink-0 h-fit transition-transform group-hover:scale-110 duration-300 shadow-sm">
                                            <AlertCircle className="w-5 h-5 md:w-5.5 lg:w-6 md:h-5.5 lg:h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Require Work Description</h4>
                                            <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 font-medium opacity-80 mt-1">Mandate a description when logging activity.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSetting('require_work_description')}
                                        className={cn(
                                            "w-10 h-5 sm:w-11 sm:h-6 rounded-full relative cursor-pointer transition-all duration-300 shrink-0 p-1",
                                            settings.require_work_description ? "bg-brand-500 shadow-lg shadow-brand-100" : "bg-gray-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-md transition-all duration-300",
                                            settings.require_work_description ? "translate-x-5 sm:translate-x-5" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-brand-500 rounded-full" />
                                        <Label className="text-md md:text-lg lg:text-lg font-bold text-gray-900">Log Lock Period (Days)</Label>
                                    </div>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={settings.lock_logs_after_days || ''}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => setSettings({ ...settings, lock_logs_after_days: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className={cn(inputClassName, "h-11 sm:h-13 text-sm font-bold tabular-nums shadow-sm bg-white border-gray-100 hover:border-gray-200 focus:bg-white")}
                                    />
                                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Prevent editing time logs after this interval.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="advanced" className="animate-in fade-in slide-in-from-right-4 duration-500 outline-none space-y-6">
                    {/* Productivity Section */}
                    <Card className={cardClassName}>
                        <CardHeader className={cn(headerClassName, "px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6")}>
                            <CardTitle className="text-md md:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-brand-600" />
                                Productivity & Efficiency Rules
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Define how work progress and utilization are measured.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 lg:p-8 space-y-8 md:space-y-8 lg:space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12">
                                <div className="space-y-4 md:space-y-5 lg:space-y-6">
                                    <div className="flex items-center justify-between p-4 md:p-4.5 lg:p-5 rounded-xl md:rounded-[1.25rem] lg:rounded-2xl bg-gray-50/50 border border-gray-100">
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm md:text-[15px] lg:text-lg text-gray-900">Allow Overtime Logging</p>
                                            <p className="text-xs sm:text-sm text-gray-500">Log time beyond expected daily hours.</p>
                                        </div>
                                        <button
                                            onClick={() => toggleSetting('allow_overtime')}
                                            className={cn(
                                                "w-10 h-5 md:w-11 md:h-5.5 lg:w-12 lg:h-6 rounded-full relative cursor-pointer transition-all shrink-0",
                                                settings.allow_overtime ? "bg-brand-500 shadow-inner shadow-brand-600/20" : "bg-gray-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-0.5 md:top-0.75 lg:top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                                settings.allow_overtime ? "right-0.5 md:right-0.75 lg:right-1" : "left-0.5 md:left-0.75 lg:left-1"
                                            )} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 md:p-4.5 lg:p-5 rounded-xl md:rounded-[1.25rem] lg:rounded-2xl bg-gray-50/50 border border-gray-100">
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm md:text-[15px] lg:text-lg text-gray-900">Approval for Extra Hours</p>
                                            <p className="text-xs sm:text-sm text-gray-500">Require Lead approval for {'>'} 8 hours.</p>
                                        </div>
                                        <button
                                            onClick={() => toggleSetting('require_extra_hours_approval')}
                                            className={cn(
                                                "w-10 h-5 md:w-11 md:h-5.5 lg:w-12 lg:h-6 rounded-full relative cursor-pointer transition-all shrink-0",
                                                settings.require_extra_hours_approval ? "bg-brand-500 shadow-inner shadow-brand-600/20" : "bg-gray-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-0.5 md:top-0.75 lg:top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                                settings.require_extra_hours_approval ? "right-0.5 md:right-0.75 lg:right-1" : "left-0.5 md:left-0.75 lg:left-1"
                                            )} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6 md:space-y-7 lg:space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-xs md:text-[15px] lg:text-md font-bold">
                                            <span className="lg:text-lg">Under-utilization Threshold</span>
                                            <span className="text-brand-600 font-mono">{settings.under_utilization_threshold}%</span>
                                        </div>
                                        <Input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={settings.under_utilization_threshold}
                                            onChange={(e) => setSettings({ ...settings, under_utilization_threshold: Number(e.target.value) })}
                                            className="w-full h-1.5 md:h-1.75 lg:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                        />
                                        <p className="text-xs sm:text-sm text-gray-500 flex items-start gap-1.5">
                                            <AlertCircle className="w-3 h-3 md:w-3.25 lg:w-3.5 md:h-3.25 lg:h-3.5 mt-0.5 text-yellow-500 flex-shrink-0" />
                                            Flag users as under-utilized if logged hours are below this threshold.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-xs md:text-[15px] lg:text-sm font-bold">
                                            <span className="lg:text-lg">Over-utilization Threshold</span>
                                            <span className="text-brand-600 font-mono">{settings.over_utilization_threshold}%</span>
                                        </div>
                                        <Input
                                            type="range"
                                            min="100"
                                            max="200"
                                            value={settings.over_utilization_threshold}
                                            onChange={(e) => setSettings({ ...settings, over_utilization_threshold: Number(e.target.value) })}
                                            className="w-full h-1.5 md:h-1.75 lg:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                        />
                                        <p className="text-xs sm:text-sm text-gray-500 flex items-start gap-1.5">
                                            <AlertCircle className="w-3 h-3 md:w-3.25 lg:w-3.5 md:h-3.25 lg:h-3.5 mt-0.5 text-red-500 flex-shrink-0" />
                                            Flag users as over-worked if logged hours exceed this threshold.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1 h-4 bg-brand-500 rounded-full" />
                                        <Label className="text-xs sm:text-sm lg:text-lg font-bold text-gray-900">Minimum Daily Hours</Label>
                                    </div>
                                    <Input
                                        type="number"
                                        min="1"
                                        step="0.5"
                                        value={settings.min_daily_hours || ''}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => setSettings({ ...settings, min_daily_hours: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className={cn(inputClassName, "w-full h-11 md:h-11 lg:h-12 text-sm md:text-[15px] lg:text-base font-bold tabular-nums text-gray-800 shadow-sm")}
                                    />
                                    <p className="text-xs sm:text-sm text-gray-500">Minimum hours required for a user per day to meet utilization expectations.</p>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-4 p-4 md:p-5 lg:p-7 rounded-2xl md:rounded-[1.5rem] lg:rounded-3xl border border-gray-100 bg-gray-50/50 group hover:bg-white hover:border-brand-100 hover:shadow-md transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 md:p-3 rounded-2xl bg-brand-50 text-brand-600 shrink-0 transition-transform group-hover:scale-110">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm md:text-base lg:text-lg text-gray-900 leading-tight">Official Office Hours</p>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-1">Define standard start and end boundaries for a typical work day.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] md:text-[10px] lg:text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Start Time</Label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={settings.work_start_time || ''}
                                                onChange={(e) => setSettings({ ...settings, work_start_time: e.target.value })}
                                                className="w-full h-11 md:h-11 lg:h-12 rounded-xl border-2 border-gray-200 bg-white text-sm md:text-[15px] lg:text-base font-bold text-gray-800 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50 transition-all shadow-sm cursor-pointer appearance-none text-left px-4 tabular-nums"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] md:text-[10px] lg:text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">End Time</Label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={settings.work_end_time || ''}
                                                onChange={(e) => setSettings({ ...settings, work_end_time: e.target.value })}
                                                className="w-full h-11 md:h-11 lg:h-12 rounded-xl border-2 border-gray-200 bg-white text-sm md:text-[15px] lg:text-base font-bold text-gray-800 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50 transition-all shadow-sm cursor-pointer appearance-none text-left px-4 tabular-nums"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Approvals Section */}
                    <Card className={cardClassName}>
                        <CardHeader className={cn(headerClassName, "px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6")}>
                            <CardTitle className="text-md md:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-brand-600" />
                                Approval Workflows
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Configure who can approve requests and SLA durations.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 lg:space-y-10">
                            <div className="space-y-4 sm:space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 mb-2">Due Date Change Approvers</Label>
                                    <div className="flex flex-wrap gap-2 sm:gap-4">
                                        {(['admin', 'lead', 'both'] as const).map(option => (
                                            <button
                                                key={option}
                                                onClick={() => setSettings({ ...settings, due_date_approvers: option })}
                                                className={cn(
                                                    "px-2 sm:px-4 py-1 sm:py-1 rounded-full border-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95",
                                                    settings.due_date_approvers === option
                                                        ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-200"
                                                        : "bg-white border-gray-100 text-gray-500 hover:border-brand-200 hover:text-brand-600"
                                                )}
                                            >
                                                {option === 'both' ? 'Admin & Lead' : option}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 mt-2">Who can approve due date change requests.</p>
                                </div>
                                <div className="space-y-2 sm:space-y-3 pt-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1 h-4 bg-brand-500 rounded-full" />
                                        <Label className="text-xs sm:text-sm lg:text-base font-bold text-gray-900">SLA Duration (Hours)</Label>
                                    </div>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={settings.sla_duration_hours || ''}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => setSettings({ ...settings, sla_duration_hours: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className={cn(inputClassName, "h-11 md:h-12 lg:h-13 text-sm font-bold tabular-nums shadow-sm bg-white border-gray-100 hover:border-gray-200 focus:bg-white")}
                                    />
                                    <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 mt-2">Standard SLA duration for task approvals.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Audit Section */}
                    <Card className={cardClassName}>
                        <CardHeader className={cn(headerClassName, "px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6")}>
                            <CardTitle className="text-md md:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-brand-600" />
                                Audit & Compliance
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Track and retain organization activity logs.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 lg:space-y-10">
                            <div className="space-y-4 sm:space-y-6">
                                <div className="flex items-center justify-between p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-[1.5rem] lg:rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm sm:text-base lg:text-lg text-gray-900">Enable Audit Logging</p>
                                        <p className="text-[11px] sm:text-xs lg:text-md text-gray-500">Track configuration changes and actions.</p>
                                    </div>
                                    <button
                                        onClick={() => toggleSetting('audit_enabled')}
                                        className={cn(
                                            "w-10 h-5 sm:w-12 sm:h-6 rounded-full relative cursor-pointer transition-all shrink-0",
                                            settings.audit_enabled ? "bg-brand-500 shadow-inner shadow-brand-600/20" : "bg-gray-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                            settings.audit_enabled ? "right-0.5 sm:right-1" : "left-0.5 sm:left-1"
                                        )} />
                                    </button>
                                </div>
                                <div className="space-y-2 sm:space-y-3 pt-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1 h-4 bg-brand-500 rounded-full" />
                                        <Label className="text-xs sm:text-sm lg:text-base font-bold text-gray-900">Retention Period (Days)</Label>
                                    </div>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={settings.retention_period_days || ''}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => setSettings({ ...settings, retention_period_days: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className={cn(inputClassName, "h-11 md:h-12 lg:h-13 text-sm font-bold tabular-nums shadow-sm bg-white border-gray-100 hover:border-gray-200 focus:bg-white")}
                                    />
                                    <p className="text-xs md:text-[13px] lg:text-sm text-gray-500 mt-2">Log retention duration.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Leaderboard Points Section */}
                    <Card className={cardClassName}>
                        <CardHeader className={cn(headerClassName, "px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6")}>
                            <CardTitle className="text-md md:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-brand-600" />
                                Leaderboard Performance Points
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Incentivize efficiency by defining point rewards for key milestones.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 lg:space-y-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                                {[
                                    {
                                        key: 'points_task_on_time',
                                        label: 'On-Time Task',
                                        desc: 'Completed within estimation',
                                        icon: CheckCircle2,
                                        color: 'bg-green-50 text-green-600'
                                    },
                                    {
                                        key: 'points_all_tasks_no_overdue',
                                        label: 'Perfect Day',
                                        desc: '+No overdue & all tasks done',
                                        icon: Zap,
                                        color: 'bg-brand-50 text-brand-600'
                                    },
                                    {
                                        key: 'points_full_day_complete',
                                        label: 'Full Utilization',
                                        desc: '+Worked full expected hours',
                                        icon: Trophy,
                                        color: 'bg-amber-50 text-amber-600'
                                    },
                                    {
                                        key: 'points_per_extra_hour',
                                        label: 'Extra Hours',
                                        desc: 'Points for extra hour logged',
                                        icon: Clock,
                                        color: 'bg-blue-50 text-blue-600'
                                    }
                                ].map((item) => (
                                    <div key={item.key} className="flex flex-col gap-4 p-5 sm:p-6 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2.5 sm:p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110", item.color)}>
                                                <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-xs sm:text-sm lg:text-base text-gray-900 leading-tight">{item.label}</p>
                                                <p className="text-[10px] sm:text-xs lg:text-[13px] text-gray-500 font-medium truncate mt-0.5">{item.desc}</p>
                                            </div>
                                        </div>
                                        <div className="relative mt-1">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                                <span className="text-[10px] lg:text-[11px] font-black text-gray-400 uppercase tracking-tighter">Pts</span>
                                            </div>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={settings[item.key as keyof OrganizationSettings] || ''}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                className={cn(inputClassName, "h-11 sm:h-12 text-center font-black text-brand-600 text-base sm:text-lg lg:text-xl tabular-nums border-none bg-gray-50 group-hover:bg-white transition-colors")}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status Management Section */}
                    <Card className={cardClassName}>
                        <CardHeader className={cn(headerClassName, "px-4 md:px-6 lg:px-8 py-4 md:py-5 lg:py-6 text-center sm:text-left")}>
                            <CardTitle className="text-md md:text-lg lg:text-xl font-bold text-gray-900 flex items-center justify-start sm:justify-start gap-2">
                                <Tag className="w-5 h-5 text-brand-600" />
                                Task Status Management
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-left">Create and manage custom task statuses for your organization.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 lg:p-8 space-y-8">
                            {/* Add New Status */}
                            <div className="space-y-6 p-6 sm:p-7 bg-brand-50/20 rounded-2xl sm:rounded-3xl border border-brand-100 shadow-none group">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-3">
                                        <Plus className="w-5 h-5 text-brand-600" />
                                        Add New Status
                                    </h3>
                                    <p className="text-xs md:text-[10px] lg:text-sm text-gray-400 font-bold tracking-widest bg-white px-4 md:px-3 lg:px-4 py-1.5 rounded-full border border-gray-100 shadow-sm">
                                        Configuration
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                                    <div className="sm:col-span-2 xl:col-span-2 space-y-1.5">
                                        <Label className="text-xs sm:text-sm font-bold text-gray-700 ml-1">Status Name</Label>
                                        <Input
                                            value={newStatusName}
                                            onChange={(e) => setNewStatusName(e.target.value)}
                                            placeholder="e.g., In Review"
                                            className={cn(inputClassName, "h-11 md:h-11 lg:h-12 text-sm bg-white")}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleCreateStatus()
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs sm:text-sm font-bold text-gray-700 ml-1">Color</Label>
                                        <div className="flex gap-2">
                                            <div className="relative shrink-0">
                                                <Input
                                                    type="color"
                                                    value={newStatusColor}
                                                    onChange={(e) => setNewStatusColor(e.target.value)}
                                                    className="h-11 md:h-11 lg:h-12 w-16 sm:w-20 cursor-pointer p-1 rounded-xl border-gray-100 shadow-sm bg-white"
                                                />
                                            </div>
                                            <Input
                                                type="text"
                                                value={newStatusColor}
                                                onChange={(e) => setNewStatusColor(e.target.value)}
                                                placeholder="#6b7280"
                                                className={cn(inputClassName, "h-11 md:h-11 lg:h-12 flex-1 font-mono uppercase text-sm bg-white border-gray-100")}
                                                pattern="^#[0-9A-Fa-f]{6}$"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            onClick={handleCreateStatus}
                                            disabled={!newStatusName.trim()}
                                            className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 border border-brand-500/20 shadow-xl shadow-brand-500/20 h-11 md:h-11 lg:h-12 px-8 font-extrabold tracking-widest text-white uppercase text-[10px] md:text-[11px] lg:text-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand-500/40 active:scale-95 flex items-center justify-center gap-2 group"
                                        >
                                            <Plus className="w-4 h-4 transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110" />
                                            <span>Create Status</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Status List */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-md md:text-base lg:text-lg font-bold text-gray-900 tracking-tight">Active Workflow Pipeline</h3>
                                    <Badge variant="outline" className="rounded-full border-gray-200 text-gray-400 font-bold px-3 py-1">
                                        {statuses.length} Statuses
                                    </Badge>
                                </div>
                                {isLoadingStatuses ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-100 border-t-brand-500" />
                                        <p className="font-bold text-xs uppercase tracking-[0.2em]">Synchronizing...</p>
                                    </div>
                                ) : statuses.length === 0 ? (
                                    <div className="text-center py-20 bg-gray-50/30 rounded-[3rem] border-2 border-dashed border-gray-100">
                                        <p className="font-bold text-gray-400 text-sm uppercase tracking-widest">No active statuses defined.</p>
                                    </div>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={statuses.map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3 md:space-y-3 lg:space-y-4">
                                                {statuses.map((status) => (
                                                    <SortableStatusItem key={status.id} status={status} />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete Status Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden">
                    <div className="p-8">
                        <DialogHeader className="space-y-4">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-700 ring-8 ring-red-50/50">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <div className="space-y-1 text-center">
                                <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">Delete Status</DialogTitle>
                                <DialogDescription className="text-gray-500 text-sm">
                                    Are you sure you want to delete <span className="font-semibold text-gray-900">"{statusToDelete?.name}"</span>?
                                    <br />
                                    This action cannot be undone and may affect existing tasks.
                                </DialogDescription>
                            </div>
                        </DialogHeader>
                    </div>
                    <DialogFooter className="flex-row gap-3 p-6 bg-gray-50 border-t border-gray-100 sm:justify-center">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="flex-1 rounded-xl h-12 border-gray-200 hover:bg-white hover:border-gray-300 font-semibold text-gray-700 transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="flex-1 rounded-xl h-12 bg-red-700 hover:bg-red-800 transition-all font-semibold flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            <span>{isDeleting ? 'Deleting...' : 'Delete Status'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default OrganizationSettingsPage;

import React, { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUIStore, useAuthStore } from '@/stores'
import { taskTemplatesApi } from '@/api/taskTemplates'
import { projectsApi, mapBackendProjectToFrontend } from '@/api/projects'
import { priorityConfig } from '@/mock'
import { Project } from '@/types'
import { useToast } from '@/components/ui/use-toast'
import { RichTextEditor } from '@/components/ui'
import {
    Button,
    Label,
    Input,
    Textarea,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogPortal,
    ModalSkeleton,
} from '@/components/ui'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn, getRandomIcon, getRandomColor } from '@/lib/utils'
import {
    BottomSheet,
    BottomSheetContent,
    BottomSheetHeader,
    BottomSheetTitle,
} from '@/components/ui/bottom-sheet'
import { FolderKanban, Flag, Clock, X, ChevronRight } from 'lucide-react'

const templateSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    estimated_hours: z.string().optional(),
    project_id: z.string().optional(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface FieldRowProps {
    icon: React.ReactNode
    label: string
    required?: boolean
    value?: string
    placeholder?: string
    onClick?: () => void
    error?: string
}

function FieldRow({ icon, label, required, value, placeholder, onClick, error }: FieldRowProps) {
    return (
        <div className="w-full">
            <button
                type="button"
                onClick={onClick}
                className="w-full flex items-center gap-3 py-2 sm:py-3 px-2 sm:px-4 text-left hover:bg-gray-50 transition-colors rounded-lg"
            >
                <div className="flex-shrink-0 text-gray-500">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-0.5">
                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </div>
                    <div className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400'} truncate`}>
                        {value || placeholder}
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
            </button>
            {error && <p className="text-xs text-red-600 mt-1 ml-4">{error}</p>}
        </div>
    )
}

function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(false)
    useEffect(() => {
        const media = window.matchMedia(query)
        setMatches(media.matches)
        const listener = () => setMatches(media.matches)
        media.addEventListener('change', listener)
        return () => media.removeEventListener('change', listener)
    }, [query])
    return matches
}

const CustomDialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                'fixed left-[50%] top-[50%] z-50 grid w-full max-w-[96%] sm:max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-xl sm:rounded-lg max-h-[90vh] overflow-y-auto',
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
    </DialogPortal>
))
CustomDialogContent.displayName = 'CustomDialogContent'


export function CreateTaskTemplateModal() {
    const { user: currentUser } = useAuthStore()
    const { activeModal, closeModal, modalData } = useUIStore()
    const { toast } = useToast()
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [projectSheetOpen, setProjectSheetOpen] = useState(false)
    const [projectSearchQuery, setProjectSearchQuery] = useState('')
    const [isDescriptionEditorActive, setIsDescriptionEditorActive] = useState(false)

    const filteredProjects = projects.filter(project => {
        if (!projectSearchQuery) return true
        return (project.name || '').toLowerCase().includes(projectSearchQuery.toLowerCase())
    })

    const [prioritySheetOpen, setPrioritySheetOpen] = useState(false)
    const [hoursSheetOpen, setHoursSheetOpen] = useState(false)
    const [hoursInput, setHoursInput] = useState('')
    const [minutesInput, setMinutesInput] = useState('')

    const hoursInputRef = React.useRef<HTMLInputElement>(null)
    const minutesInputRef = React.useRef<HTMLInputElement>(null)
    const didFocusHoursOnOpenRef = React.useRef(false)

    const isDesktop = useMediaQuery('(min-width: 768px)')
    const isEditMode = activeModal === 'editTaskTemplate'
    const isAnySelectionOpen = projectSheetOpen || prioritySheetOpen || hoursSheetOpen



    const {
        register,
        handleSubmit,
        control,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<TemplateFormValues>({
        resolver: zodResolver(templateSchema),
        defaultValues: {
            title: '',
            description: '',
            priority: undefined,
            estimated_hours: '',
            project_id: '',
        },
    })

    useEffect(() => {
        const fetchData = async () => {
            if (activeModal === 'createTaskTemplate' || activeModal === 'editTaskTemplate') {
                setIsLoadingData(true)
                try {
                    const projectsRes = await projectsApi.getAll({ assignee_id: currentUser?.id })
                    let fetchedProjects: Project[] = []
                    if (projectsRes?.data) {
                        const rawData = Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data.data || []
                        fetchedProjects = rawData.map(mapBackendProjectToFrontend)
                    } else if (Array.isArray(projectsRes)) {
                        fetchedProjects = projectsRes.map(mapBackendProjectToFrontend)
                    }
                    setProjects(fetchedProjects)

                    if (activeModal === 'editTaskTemplate' && modalData?.templateId) {
                        try {
                            const res = await taskTemplatesApi.getById(modalData.templateId as string)
                            if (res.success && res.data) {
                                const t = res.data
                                reset({
                                    title: t.title,
                                    description: t.description ?? '',
                                    priority: (t.priority as TemplateFormValues['priority']) ?? undefined,
                                    estimated_hours: t.estimated_hours != null ? String(t.estimated_hours) : '',
                                    project_id: t.project_id ?? '',
                                })
                                if (t.estimated_hours != null) {
                                    const n = typeof t.estimated_hours === 'string' ? parseFloat(t.estimated_hours) : t.estimated_hours
                                    setHoursInput(String(Math.floor(n)))
                                    setMinutesInput(String(Math.round((n % 1) * 60)))
                                } else {
                                    setHoursInput('')
                                    setMinutesInput('')
                                }
                            }
                        } catch (e) {
                            console.error('Failed to load template', e)
                        }
                    } else {
                        // Default values for new template
                        reset({
                            title: '',
                            description: '',
                            priority: undefined,
                            estimated_hours: '',
                            project_id: '',
                        })
                        setHoursInput('')
                        setMinutesInput('')
                    }
                } catch (e) {
                    console.error('Failed to fetch modal data', e)
                } finally {
                    setIsLoadingData(false)
                }
            }
        }
        fetchData()
    }, [activeModal, modalData, reset])

    const onSave = async (data: TemplateFormValues) => {
        try {
            const payload = {
                title: data.title.trim(),
                description: data.description?.trim() || undefined,
                priority: data.priority || undefined,
                estimated_hours: data.estimated_hours ? parseFloat(data.estimated_hours) : undefined,
                project_id: data.project_id || undefined,
            }
            if (isEditMode && modalData?.templateId) {
                const response = await taskTemplatesApi.update(modalData.templateId as string, payload)
                toast({
                    title: 'Success',
                    description: response.message || 'Template updated successfully',
                    variant: 'success'
                })
                window.dispatchEvent(new CustomEvent('task-template-updated'))
            } else {
                const response = await taskTemplatesApi.create(payload)
                toast({
                    title: 'Success',
                    description: response.message || 'Template created successfully',
                    variant: 'success'
                })
                window.dispatchEvent(new CustomEvent('task-template-created'))
            }
            closeModal()
        } catch (e: any) {
            console.error('Save template failed', e)

            let errorMessage = 'Failed to save template'

            if (e?.response?.data?.errors) {
                // Extract first validation error
                const errors = e.response.data.errors
                const firstKey = Object.keys(errors)[0]
                if (firstKey && Array.isArray(errors[firstKey]) && errors[firstKey].length > 0) {
                    errorMessage = errors[firstKey][0]
                }
            } else if (e?.response?.data?.message) {
                errorMessage = e.response.data.message
            } else if (e?.message && !e.message.includes('Request failed with status code')) {
                errorMessage = e.message
            }

            toast({ title: 'Error', description: errorMessage, variant: 'destructive' })
        }
    }

    const projectId = watch('project_id')
    const priority = watch('priority')
    const selectedProjectName = projects.find((p) => p.id === projectId)?.name
    const selectedPriorityLabel = priority ? priorityConfig[priority]?.label : ''
    const selectedPriorityColor = priority ? priorityConfig[priority]?.color : '#6B7280'

    useEffect(() => {
        if (hoursSheetOpen && !didFocusHoursOnOpenRef.current) {
            didFocusHoursOnOpenRef.current = true
            // Delay to ensure content is mounted before focusing
            requestAnimationFrame(() => hoursInputRef.current?.focus())
        }
        if (!hoursSheetOpen) {
            didFocusHoursOnOpenRef.current = false
        }
    }, [hoursSheetOpen])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey || e.metaKey) &&
                e.key === 'Enter' &&
                (activeModal === 'createTaskTemplate' || activeModal === 'editTaskTemplate')
            ) {
                handleSubmit(onSave)()
            }
            if (e.key === 'Escape' && (activeModal === 'createTaskTemplate' || activeModal === 'editTaskTemplate')) {
                closeModal()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeModal])

    const SelectionWrapper = isDesktop ? Dialog : BottomSheet
    const SelectionContent = isDesktop ? CustomDialogContent : BottomSheetContent
    const SelectionHeader = isDesktop ? DialogHeader : BottomSheetHeader
    const SelectionTitle = isDesktop ? DialogTitle : BottomSheetTitle

    const formContent = (
        <>
            <style>
                {`
                    .tiptap p.is-editor-empty:first-child::before {
                        color: #9ca3af;
                        content: attr(data-placeholder);
                        float: left;
                        height: 0;
                        pointer-events: none;
                    }

                    #template-hours, #template-minutes {
                        -moz-appearance: textfield;
                        border: 1px solid #e5e7eb;
                        border-radius: 4px;
                        padding: 8px;
                    }
                    #template-hours::-webkit-outer-spin-button,
                    #template-hours::-webkit-inner-spin-button,
                    #template-minutes::-webkit-outer-spin-button,
                    #template-minutes::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                    #template-hours:focus, #template-minutes:focus {
                        outline: none;
                        border-color: #6366f1;
                        ring: 2px;
                        ring-color: #6366f1;
                    }
                `}
            </style>
            <form onSubmit={handleSubmit(onSave)} className="space-y-0">
                {/* Title */}
                <div className="px-2 sm:px-4 py-2 sm:py-3 border-b border-gray-100">
                    <Textarea
                        id="template-title"
                        autoFocus
                        placeholder="Template Name"
                        {...register('title')}
                        className="w-full border-none px-0 py-0 min-h-0 resize-none text-base md:text-lg font-semibold leading-snug shadow-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-gray-400 bg-transparent overflow-hidden"
                        rows={1}
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
                <div className="border-b border-gray-100 px-2 sm:px-4 py-2 sm:py-3">
                    <Label htmlFor="template-description" className="text-xs text-gray-500 mb-2 block px-1">
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

                {/* Priority */}
                <div className="border-b border-gray-100">
                    <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                            <>
                                <FieldRow
                                    icon={
                                        <Flag
                                            className="w-5 h-5"
                                            fill={selectedPriorityColor}
                                            stroke={selectedPriorityColor}
                                        />
                                    }
                                    label="Priority"
                                    value={selectedPriorityLabel}
                                    placeholder="Optional"
                                    onClick={() => setPrioritySheetOpen(true)}
                                />
                                <SelectionWrapper open={prioritySheetOpen} onOpenChange={setPrioritySheetOpen}>
                                    <SelectionContent className={isDesktop ? 'max-w-md' : ''}>
                                        <SelectionHeader
                                            {...(isDesktop ? {} : { showBackButton: true, onBack: () => setPrioritySheetOpen(false) })}
                                        >
                                            <SelectionTitle>Select Priority</SelectionTitle>
                                        </SelectionHeader>
                                        <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-2 ${isDesktop ? '' : 'pb-6'}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    field.onChange(undefined)
                                                    setPrioritySheetOpen(false)
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${!field.value
                                                    ? 'bg-indigo-50 border-2 border-indigo-500'
                                                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                    }`}
                                            >
                                                <span className="font-semibold text-sm text-gray-700">None</span>
                                                {!field.value && <span className="text-indigo-600 text-lg">✓</span>}
                                            </button>
                                            {Object.entries(priorityConfig).map(([key, config]: [string, { label: string; color: string }]) => (
                                                <button
                                                    type="button"
                                                    key={key}
                                                    onClick={() => {
                                                        field.onChange(key as TemplateFormValues['priority'])
                                                        setPrioritySheetOpen(false)
                                                    }}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 ${field.value === key
                                                        ? 'bg-indigo-50 border-2 border-indigo-500'
                                                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div
                                                            className="w-3.5 h-3.5 rounded-full shadow-sm border-2 border-white"
                                                            style={{ backgroundColor: config.color }}
                                                        />
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
                                    value={
                                        field.value
                                            ? (() => {
                                                const decimal = parseFloat(field.value)
                                                const hours = Math.floor(decimal)
                                                const minutes = Math.round((decimal % 1) * 60)
                                                return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                                            })()
                                            : ''
                                    }
                                    placeholder="Optional"
                                    onClick={() => {
                                        if (field.value) {
                                            const decimal = parseFloat(field.value)
                                            setHoursInput(String(Math.floor(decimal)))
                                            setMinutesInput(String(Math.round((decimal % 1) * 60)))
                                        } else {
                                            setHoursInput('')
                                            setMinutesInput('')
                                        }
                                        setHoursSheetOpen(true)
                                    }}
                                />
                                <SelectionWrapper open={hoursSheetOpen} onOpenChange={setHoursSheetOpen}>
                                    <SelectionContent className={isDesktop ? 'max-w-sm' : ''}>
                                        <SelectionHeader
                                            {...(isDesktop ? {} : { showBackButton: true, onBack: () => setHoursSheetOpen(false) })}
                                        >
                                            <SelectionTitle>Estimated Hours</SelectionTitle>
                                        </SelectionHeader>
                                        <div className={`${isDesktop ? 'mt-2' : 'mt-4'} space-y-3 ${isDesktop ? '' : 'pb-6'}`}>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label htmlFor="template-hours" className="text-sm font-semibold text-gray-700 mb-2 block">
                                                        Hours
                                                    </Label>
                                                    <Input
                                                        id="template-hours"
                                                        type="number"
                                                        min={0}
                                                        placeholder="0"
                                                        value={hoursInput}
                                                        onChange={(e) => setHoursInput(e.target.value)}
                                                        className="h-10 text-sm"
                                                        ref={hoursInputRef}
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="template-minutes" className="text-sm font-semibold text-gray-700 mb-2 block">
                                                        Minutes
                                                    </Label>
                                                    <Input
                                                        id="template-minutes"
                                                        type="number"
                                                        min={0}
                                                        max={59}
                                                        placeholder="0"
                                                        value={minutesInput}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 59)) {
                                                                setMinutesInput(val)
                                                            }
                                                        }}
                                                        className="h-10 text-sm"
                                                        ref={minutesInputRef}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        field.onChange('')
                                                        setHoursInput('')
                                                        setMinutesInput('')
                                                        setHoursSheetOpen(false)
                                                    }}
                                                    className="flex-1 h-9"
                                                >
                                                    Clear
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        const hours = parseFloat(hoursInput) || 0
                                                        const minutes = parseFloat(minutesInput) || 0
                                                        const total = hours + minutes / 60
                                                        field.onChange(total > 0 ? String(total) : '')
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

                {/* Project */}
                <div className="border-b border-gray-100">
                    <Controller
                        name="project_id"
                        control={control}
                        render={({ field }) => (
                            <>
                                <FieldRow
                                    icon={
                                        projectId ? (
                                            <div className={cn(
                                                "w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0",
                                                projects.find(p => p.id === projectId)?.icon ? 'bg-gray-100' : getRandomColor(projectId)
                                            )}>
                                                {projects.find(p => p.id === projectId)?.icon ? (
                                                    <img src={projects.find(p => p.id === projectId)?.icon} alt={selectedProjectName} className="w-full h-full object-cover" />
                                                ) : (
                                                    (() => {
                                                        const Icon = getRandomIcon(projectId)
                                                        return <Icon className="w-5 h-5" />
                                                    })()
                                                )}
                                            </div>
                                        ) : (
                                            <FolderKanban className="w-5 h-5" />
                                        )
                                    }
                                    label="Project"
                                    value={selectedProjectName}
                                    placeholder={isLoadingData ? 'Loading…' : 'Select project'}
                                    onClick={() => setProjectSheetOpen(true)}
                                />
                                <SelectionWrapper open={projectSheetOpen} onOpenChange={setProjectSheetOpen}>
                                    <SelectionContent className={isDesktop ? 'max-w-md' : 'max-h-[85vh]'}>
                                        <SelectionHeader
                                            {...(isDesktop ? {} : { showBackButton: true, onBack: () => setProjectSheetOpen(false) })}
                                        >
                                            <SelectionTitle>Select Project</SelectionTitle>
                                        </SelectionHeader>
                                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10 mt-2">
                                            <Input
                                                placeholder="Search projects..."
                                                value={projectSearchQuery}
                                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div
                                            className={`space-y-2 ${isDesktop ? 'max-h-[50vh] overflow-y-auto mt-2' : 'pb-6 mt-4'}`}
                                        >
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
                                            {filteredProjects.map((project) => {
                                                return (
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
                                                )
                                            })}
                                        </div>
                                    </SelectionContent>
                                </SelectionWrapper>
                            </>
                        )}
                    />
                </div>

                <div className="flex gap-3 p-2 sm:p-4 mt-2 sm:mt-0">
                    <Button type="button" variant="outline" onClick={closeModal} className="flex-1 h-10 text-sm font-medium" disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1 h-10 text-sm font-medium bg-brand-500 hover:bg-brand-600">
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            <span>{isEditMode ? 'Update' : 'Create'}</span>
                        )}
                    </Button>
                </div>
            </form>
        </>
    )

    const isOpen = activeModal === 'createTaskTemplate' || activeModal === 'editTaskTemplate'
    if (!isOpen) return null

    if (isDesktop) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className={cn('max-w-3xl p-0 gap-0', isAnySelectionOpen && 'blur-sm')}>
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100">
                        <DialogTitle className="text-lg font-semibold text-gray-900">
                            {isEditMode ? 'Edit Template' : 'New Template'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-4 pb-4">
                        {isLoadingData ? <ModalSkeleton rows={4} /> : formContent}
                    </div>

                </DialogContent>
            </Dialog>
        )
    }

    return (
        <BottomSheet open={isOpen} onOpenChange={(open) => !open && closeModal()}>
            <BottomSheetContent showCloseButton={false} className="max-h-[92vh] overflow-y-auto">
                <BottomSheetHeader onBack={closeModal}>
                    <BottomSheetTitle className="text-lg font-semibold">
                        {isEditMode ? 'Edit Template' : 'New Template'}
                    </BottomSheetTitle>
                </BottomSheetHeader>
                <div className="mt-2 pb-2">
                    {isLoadingData ? (
                        <div className="px-4">
                            <ModalSkeleton rows={4} />
                        </div>
                    ) : formContent}
                </div>

            </BottomSheetContent>
        </BottomSheet>
    )
}

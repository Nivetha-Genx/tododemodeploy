import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectsApi } from '@/api/projects'
import { useEffect, useState, useRef } from 'react'
import { useUIStore } from '@/stores'
import { Upload, X as CloseIcon } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Label,
    Input,
    Textarea,
} from '@/components/ui'
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

import { useToast } from '@/components/ui/use-toast'
import { formatDateToLocalString, getErrorMessage } from '@/lib/utils'

// Helper to get today's date at midnight
const getTodayDate = (): Date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

const createProjectSchema = z.object({
    name: z.string().min(1, 'Project name is required').max(50, 'Project name is too long'),
    shortCode: z.string().min(2, 'Code must be at least 2 chars').max(10, 'Code is too long'),
    description: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    image: z.any().optional(),
})

type CreateProjectValues = z.infer<typeof createProjectSchema>

export function CreateProjectModal() {
    const { activeModal, closeModal, modalData } = useUIStore()

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        control,
        formState: { errors, isSubmitting },
    } = useForm<CreateProjectValues>({
        resolver: zodResolver(createProjectSchema),
        defaultValues: {
            name: '',
            shortCode: '',
            description: '',
            start_date: '',
            end_date: '',
            image: undefined,
        },
    })

    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const projectName = watch('name')
    const shortCode = watch('shortCode')
    const startDate = watch('start_date')

    // Auto-generate shortCode from name if shortCode is empty or just matches previous auto-gen
    useEffect(() => {
        if (projectName && (!shortCode || shortCode.length <= 1)) {
            const suggestedCode = projectName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')
            setValue('shortCode', suggestedCode, { shouldValidate: true })
        }
    }, [projectName, setValue])

    const { toast } = useToast()

    const onProjectSubmit = async (data: CreateProjectValues) => {
        try {
            await projectsApi.create({
                name: data.name,
                shortCode: data.shortCode,
                description: data.description,
                start_date: data.start_date || undefined,
                end_date: data.end_date || undefined,
                image: data.image,
            })
            toast({
                title: 'Success',
                description: 'Project created successfully',
                variant: 'success',
            })
            reset()
            // Call onSuccess callback before closing modal to ensure state updates
            if (modalData?.onSuccess && typeof modalData.onSuccess === 'function') {
                await modalData.onSuccess()
            }
            closeModal()
            // Also dispatch a custom event as a fallback
            window.dispatchEvent(new CustomEvent('project-created'))
        } catch (error: any) {
            console.error('Failed to create project:', error)
            const errorMessage = getErrorMessage(error)
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            })
        }
    }

    return (
        <Dialog open={activeModal === 'createProject'} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onProjectSubmit)}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Website Redesign"
                                {...register('name')}
                            />
                            {errors.name && (
                                <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shortCode">Project Code (for Task IDs)</Label>
                            <Input
                                id="shortCode"
                                placeholder="WEB"
                                maxLength={10}
                                {...register('shortCode')}
                                onChange={(e) => setValue('shortCode', e.target.value.toUpperCase())}
                            />
                            <p className="text-[10px] text-gray-500">This code will be used as a prefix for all tasks in this project (e.g., {shortCode || 'WEB'}-0001)</p>
                            {errors.shortCode && (
                                <p className="text-xs text-red-600 mt-1">{errors.shortCode.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the project goals..."
                                {...register('description')}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Project Icon</Label>
                            <div className="flex items-start gap-4">
                                <div
                                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 overflow-hidden relative group cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Upload className="w-5 h-5 text-white" />
                                            </div>
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setImagePreview(null);
                                                    setValue('image', undefined);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                            >
                                                <CloseIcon className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-brand-600">
                                            <Upload className="w-5 h-5" />
                                            <span className="text-[10px] font-medium">Upload</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-xs text-gray-500">
                                        Upload a project icon to make it easily recognizable.
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        Recommended: Square image, max 5MB (JPG, PNG).
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Select Image
                                    </Button>
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setValue('image', file);
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setImagePreview(reader.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Controller
                                    name="start_date"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="relative">
                                            <ReactDatePicker
                                                selected={field.value ? new Date(field.value + 'T00:00:00') : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        const formatted = formatDateToLocalString(date)
                                                        field.onChange(formatted)
                                                    } else {
                                                        field.onChange('')
                                                    }
                                                }}
                                                dateFormat="MMM d, yyyy"
                                                placeholderText="Select start date"
                                                minDate={getTodayDate()}
                                                className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                isClearable
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Controller
                                    name="end_date"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="relative">
                                            <ReactDatePicker
                                                selected={field.value ? new Date(field.value + 'T00:00:00') : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        const formatted = formatDateToLocalString(date)
                                                        field.onChange(formatted)
                                                    } else {
                                                        field.onChange('')
                                                    }
                                                }}
                                                dateFormat="MMM d, yyyy"
                                                placeholderText="Select end date"
                                                minDate={startDate ? new Date(Math.max(new Date(startDate + 'T00:00:00').getTime(), getTodayDate().getTime())) : getTodayDate()}
                                                className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                isClearable
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

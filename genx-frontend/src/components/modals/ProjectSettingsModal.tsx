import { useUIStore } from '@/stores'
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
    DialogDescription,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    ModalSkeleton,
} from '@/components/ui'
import { Upload, X as CloseIcon } from 'lucide-react'

import { projectsApi, mapBackendProjectToFrontend, ProjectWithStats } from '@/api/projects'
import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { UserAvatar } from '@/components/UserAvatar'
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { formatDateToLocalString, getErrorMessage } from '@/lib/utils'

// Helper to get today's date at midnight
const getTodayDate = (): Date => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

export function ProjectSettingsModal() {
    const { activeModal, modalData, closeModal, openModal } = useUIStore()
    const { toast } = useToast()
    const projectId = modalData?.projectId as string

    const [project, setProject] = useState<ProjectWithStats | null>(null)
    const [name, setName] = useState('')
    const [shortCode, setShortCode] = useState('')
    const [description, setDescription] = useState('')
    const [startDate, setStartDate] = useState<Date | null>(null)
    const [endDate, setEndDate] = useState<Date | null>(null)
    const [image, setImage] = useState<File | undefined>(undefined)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [isRemovingMemberId, setIsRemovingMemberId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'details' | 'members'>('details')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) {
                setIsFetching(false)
                return
            }
            try {
                setIsFetching(true)
                const response = await projectsApi.getById(projectId)
                if (response.data) {
                    const mappedProject = mapBackendProjectToFrontend(response.data)
                    setProject(mappedProject)
                    setName(mappedProject.name)
                    setShortCode(mappedProject.shortCode || '')
                    setDescription(mappedProject.description || '')
                    setStartDate(mappedProject.startDate ? new Date(mappedProject.startDate + 'T00:00:00') : null)
                    setEndDate(mappedProject.endDate ? new Date(mappedProject.endDate + 'T00:00:00') : null)
                    setImagePreview(mappedProject.icon || null)
                }
            } catch (error) {
                console.error('Failed to fetch project:', error)
                toast({
                    title: 'Error',
                    description: 'Failed to load project details',
                    variant: 'destructive',
                })
            } finally {
                setIsFetching(false)
            }
        }
        fetchProject()
    }, [projectId, toast])

    const handleSubmit = async () => {
        if (!projectId) return
        try {
            setIsLoading(true)
            await projectsApi.update(projectId, {
                name,
                shortCode,
                description,
                start_date: startDate ? formatDateToLocalString(startDate) : null,
                end_date: endDate ? formatDateToLocalString(endDate) : null,
                image: image,
            })
            toast({
                title: 'Success',
                description: 'Project updated successfully',
                variant: 'success',
            })
            closeModal()
            // Refresh the page to show updated data
            window.dispatchEvent(new CustomEvent('project-updated'))
        } catch (error: any) {
            console.error('Failed to update project:', error)
            const errorMessage = getErrorMessage(error)
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!projectId) return
        try {
            setIsRemovingMemberId(userId)
            await projectsApi.removeMember(projectId, userId)
            toast({
                title: 'Member removed',
                description: 'The member has been removed from this project.',
                variant: 'success',
            })
            // Update local state
            setProject(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    projectMembers: prev.projectMembers?.filter(m => m.userId !== userId) || [],
                    memberIds: prev.memberIds.filter(id => id !== userId),
                }
            })
            window.dispatchEvent(new CustomEvent('project-updated'))
        } catch (error) {
            console.error('Failed to remove member:', error)
            toast({
                title: 'Error',
                description: 'Failed to remove member. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsRemovingMemberId(null)
        }
    }

    const handleDeleteProject = async (cascade: boolean = false) => {
        if (!projectId) return
        try {
            setIsDeleting(true)
            await projectsApi.delete(projectId, cascade)
            toast({
                title: cascade ? 'Project and All Data Deleted' : 'Project Deleted',
                description: cascade
                    ? 'The project and all its associated tasks, logs, and records have been deleted.'
                    : 'The project has been deleted successfully.',
                variant: 'success',
            })
            closeModal()
            window.dispatchEvent(new CustomEvent('project-deleted', { detail: { projectId } }))
            window.location.href = '/projects'
        } catch (error: any) {
            console.error('Failed to delete project:', error)
            const errorMessage = getErrorMessage(error)
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            })
        } finally {
            setIsDeleting(false)
        }
    }

    if (isFetching) {
        return (
            <Dialog open={activeModal === 'projectSettings'} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="px-4 py-6 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Project Settings</DialogTitle>
                        <DialogDescription>
                            Loading project details...
                        </DialogDescription>
                    </DialogHeader>
                    <ModalSkeleton rows={3} />
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={activeModal === 'projectSettings'} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent className="px-4 py-6 sm:p-6">
                <DialogHeader>
                    <DialogTitle>Project Settings</DialogTitle>
                    <DialogDescription>
                        Manage project details and configuration.
                    </DialogDescription>
                </DialogHeader>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'members')} className="w-full">
                    <TabsList className="bg-gray-100/50 p-1 rounded-xl sm:rounded-full border border-gray-200/50 flex flex-row sm:flex-row h-auto gap-1 shadow-sm w-full sm:w-max mb-6 overflow-x-auto no-scrollbar justify-start sm:justify-center">
                        <TabsTrigger
                            value="details"
                            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg sm:rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black whitespace-nowrap"
                        >
                            Project Details
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg sm:rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black whitespace-nowrap"
                        >
                            Manage Members
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shortCode">Project Code (for Task IDs)</Label>
                            <Input
                                id="shortCode"
                                value={shortCode}
                                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                                maxLength={10}
                            />
                            <p className="text-[10px] text-black">This code is used as a prefix for all tasks in this project (e.g., {shortCode || 'PRJ'}-0001)</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
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
                                                    setImage(undefined);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                            >
                                                <CloseIcon className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-gray-700 group-hover:text-brand-600">
                                            <Upload className="w-5 h-5" />
                                            <span className="text-[10px] font-medium">Upload</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-xs text-black">
                                        Upload a project icon to make it easily recognizable.
                                    </p>
                                    <p className="text-[10px] text-gray-700">
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
                                        id="image-update"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setImage(file);
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
                                <div className="relative">
                                    <ReactDatePicker
                                        selected={startDate}
                                        onChange={(date: Date | null) => setStartDate(date)}
                                        dateFormat="MMM d, yyyy"
                                        placeholderText="Select start date"
                                        minDate={getTodayDate()}
                                        className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        isClearable
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <div className="relative">
                                    <ReactDatePicker
                                        selected={endDate}
                                        onChange={(date: Date | null) => setEndDate(date)}
                                        dateFormat="MMM d, yyyy"
                                        placeholderText="Select end date"
                                        minDate={startDate ? new Date(Math.max(startDate.getTime(), getTodayDate().getTime())) : getTodayDate()}
                                        className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        isClearable
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-medium text-red-700 mb-2">Danger Zone</h4>
                            {!showDeleteConfirm ? (
                                <Button
                                    className='bg-red-600 hover:bg-red-700 text-white'
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Delete Project
                                </Button>
                            ) : (
                                <div className="space-y-3 bg-red-50 border border-red-100 rounded-md p-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
                                            Warning: Irreversible Action
                                        </p>
                                        <p className="text-[11px] text-red-600">
                                            Please choose how you would like to delete this project.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className='bg-red-600 hover:bg-red-700 text-white w-full text-xs font-medium'
                                            size="sm"
                                            onClick={() => handleDeleteProject(false)}
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? 'Deleting...' : 'Delete Project Only'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="w-full text-xs font-medium bg-red-600 hover:bg-red-700 text-white"
                                            onClick={() => handleDeleteProject(true)}
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? 'Deleting...' : 'Delete Project & All Project Data'}
                                        </Button>
                                        <p className="text-[10px] text-gray-700 italic mt-1">
                                            Cascading delete removes all tasks, logs, and attachments.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-xs mt-1"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            disabled={isDeleting}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="members" className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">Project Members</h4>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => projectId && openModal('inviteMember', { projectId })}
                            >
                                Invite Member
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {project?.projectMembers && project.projectMembers.length > 0 ? (
                                project.projectMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between gap-3 py-2">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={member.user} className="h-8 w-8" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {member.user?.name || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-black capitalize">
                                                    {member.role}
                                                </p>
                                            </div>
                                        </div>
                                        {member.role !== 'owner' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
                                                disabled={isRemovingMemberId === member.userId}
                                                onClick={() => handleRemoveMember(member.userId)}
                                            >
                                                {isRemovingMemberId === member.userId ? 'Removing...' : 'Remove'}
                                            </Button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-black">No members yet.</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter className="flex flex-row justify-end gap-2">
                    <Button variant="outline" onClick={closeModal} disabled={isLoading}>Cancel</Button>
                    {activeTab === 'details' && (
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

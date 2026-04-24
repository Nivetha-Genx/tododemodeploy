import { useEffect, useState, useCallback } from 'react'
import { useUIStore } from '@/stores'
import { taskTemplatesApi } from '@/api/taskTemplates'
import type { TaskTemplate } from '@/types'
import {
    Card,
    CardContent,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Plus, FileStack, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui'
import { TaskTemplateRowCard } from '@/components/task-templates/TaskTemplateRowCard'

export function TaskTemplatesPage() {
    const { openModal } = useUIStore()
    const { toast } = useToast()
    const [templates, setTemplates] = useState<TaskTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState({ last_page: 1, total: 0 })
    const perPage = 10

    const fetchTemplates = useCallback(async (page = 1, search?: string) => {
        try {
            setIsLoading(true)
            const res = await taskTemplatesApi.getAll({
                search,
                page,
                per_page: perPage
            })

            if (res.data) {
                const payload = res.data
                const list = Array.isArray(payload) ? payload : (payload.data || [])
                setTemplates(list)

                // Robust pagination check for both Resource and Paginator structures
                const meta = payload.meta || res.meta || (payload.last_page ? payload : null) || (res.last_page ? res : null)
                if (meta) {
                    setPagination({
                        last_page: meta.last_page || 1,
                        total: meta.total || (Array.isArray(payload) ? list.length : (payload.total || list.length))
                    })
                }
            }
        } catch (e) {
            console.error('Failed to fetch templates', e)
            toast({ title: 'Error', description: 'Failed to load templates', variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial fetch and dependency on currentPage, searchQuery
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchTemplates(currentPage, searchQuery)
        }, 300)

        return () => clearTimeout(delaySearch)
    }, [currentPage, searchQuery, fetchTemplates])

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    useEffect(() => {
        const handleRefresh = () => fetchTemplates(currentPage, searchQuery)
        window.addEventListener('task-template-created', handleRefresh)
        window.addEventListener('task-template-updated', handleRefresh)
        return () => {
            window.removeEventListener('task-template-created', handleRefresh)
            window.removeEventListener('task-template-updated', handleRefresh)
        }
    }, [fetchTemplates, currentPage, searchQuery])

    const handleDelete = async (id: string) => {
        try {
            await taskTemplatesApi.delete(id)
            toast({ title: 'Success', description: 'Template deleted successfully', variant: 'success' })
            setDeleteConfirmId(null)
            fetchTemplates(currentPage, searchQuery)
        } catch (e) {
            console.error('Delete template failed', e)
            toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' })
        }
    }

    const useTemplate = (t: TaskTemplate) => {
        openModal('createTask', {
            template: {
                title: t.title,
                description: t.description ?? undefined,
                priority: (t.priority as 'low' | 'medium' | 'high' | 'critical') ?? undefined,
                estimated_hours: t.estimated_hours != null ? String(t.estimated_hours) : undefined,
                project_id: t.project_id ?? undefined,
            },
            projectId: t.project_id ?? undefined,
        })
    }

    return (
        <div className="space-y-6 h-full flex flex-col min-h-0">
            <div className="flex flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 shrink-0">
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                        <FileStack className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600 shrink-0" />
                        Task Templates
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 mt-1">
                        Create templates for repeated tasks and use them to prefill the task form
                    </p>
                </div>
                <Button onClick={() => openModal('createTaskTemplate')} className="shrink-0 mt-1 sm:mt-0">
                    <Plus className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                    <span className="hidden sm:inline">Add template</span>
                    <span className="sm:hidden">Add</span>
                </Button>
            </div>

            <div className="px-1 mb-4 shrink-0">
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl bg-white border-gray-200 shadow-sm"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-4">
                {isLoading ? (
                    <PageSkeleton />
                ) : templates.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">
                            <FileStack className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No templates yet</p>
                            <p className="text-sm mt-1">Add a template to quickly create tasks with prefilled fields.</p>
                            {/* <Button className="mt-4" variant="outline" onClick={() => openModal('createTaskTemplate')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add template
                            </Button> */}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-6 w-full pb-4">
                        <div className="flex flex-col gap-3">
                            {templates.map((t) => (
                                <TaskTemplateRowCard
                                    key={t.id}
                                    template={t}
                                    onUseTemplate={() => useTemplate(t)}
                                    onEdit={() => openModal('editTaskTemplate', { templateId: t.id })}
                                    onDelete={() => setDeleteConfirmId(t.id)}
                                />
                            ))}
                        </div>

                        {/* Unified Scrolling Pagination - Matches TodayPage.tsx style, only visible if more than one page exists */}
                        {pagination.last_page > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 mt-6 border-t border-gray-100">
                                <p className="text-sm text-gray-500 order-3 sm:order-1 text-center sm:text-left">
                                    Showing page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{pagination.last_page}</span> ({pagination.total} total)
                                </p>
                                <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                                    <div className="flex items-center justify-center gap-1 flex-wrap w-full sm:w-auto">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="h-9 px-3"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1" />
                                            <span className="hidden xs:inline">Previous</span>
                                        </Button>

                                        <div className="flex items-center gap-1 mx-1">
                                            {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                                                let pageNum: number
                                                if (pagination.last_page <= 5) {
                                                    pageNum = i + 1
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1
                                                } else if (currentPage >= pagination.last_page - 2) {
                                                    pageNum = pagination.last_page - 4 + i
                                                } else {
                                                    pageNum = currentPage - 2 + i
                                                }
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className="w-8 h-8 p-0 shrink-0"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                )
                                            })}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                                            disabled={currentPage === pagination.last_page}
                                            className="h-9 px-3"
                                        >
                                            <span className="hidden xs:inline">Next</span>
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete template?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">This cannot be undone.</p>
                     <DialogFooter className="flex flex-row justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmId(null)}
                        >
                            Cancel
                        </Button>

                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() =>
                                deleteConfirmId && handleDelete(deleteConfirmId)
                            }
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

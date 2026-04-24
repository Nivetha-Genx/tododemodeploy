import { create } from 'zustand'
import { taskStatusesApi, TaskStatus } from '@/api/taskStatuses'

interface StatusState {
    statuses: TaskStatus[]
    isLoading: boolean
    error: string | null
    fetchStatuses: () => Promise<void>
    getStatusStyles: (slug: string) => { label: string; color: string; bgColor: string }
}

export const useStatusStore = create<StatusState>((set, get) => ({
    statuses: [],
    isLoading: false,
    error: null,

    fetchStatuses: async () => {
        set({ isLoading: true, error: null })
        try {
            const response = await taskStatusesApi.getAll()
            if (response.success && response.data) {
                set({ statuses: response.data, isLoading: false })
            } else {
                set({ error: 'Failed to fetch statuses', isLoading: false })
            }
        } catch (err: any) {
            set({ error: err.message || 'An error occurred', isLoading: false })
        }
    },

    getStatusStyles: (slug: string) => {
        const { statuses } = get()
        const status = statuses.find((s) => s.slug === slug)

        if (status) {
            return {
                label: status.name.charAt(0).toUpperCase() + status.name.slice(1),
                color: status.color || '#1e40af',
                // Generate a light background color from the status color if not provided
                // For now, using a simple mapping or default
                bgColor: `${status.color}15` || '#dbeafe',
            }
        }

        // Fallback or static configuration for common slugs if store is empty or slug not found
        const staticConfig: Record<string, { label: string; color: string; bgColor: string }> = {
            new: { label: 'New', color: '#1E40AF', bgColor: '#DBEAFE' },
            in_progress: { label: 'In Progress', color: '#B45309', bgColor: '#FEF3C7' },
            blocked: { label: 'Blocked', color: '#B91C1C', bgColor: '#FEE2E2' },
            completed: { label: 'Completed', color: '#15803D', bgColor: '#DCFCE7' },
            archived: { label: 'Archived', color: '#374151', bgColor: '#F3F4F6' },
        }

        if (staticConfig[slug]) {
            return staticConfig[slug]
        }

        // Default fallback for unknown statuses
        return {
            label: slug.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            color: '#6B7280',
            bgColor: '#F3F4F6',
        }
    },
}))

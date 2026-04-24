import apiClient from '@/lib/axios'
import type { TaskTemplate } from '@/types'

export interface TaskTemplatePayload {
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high' | 'critical'
    estimated_hours?: number
    project_id?: string
}

export const taskTemplatesApi = {
    getAll: async (params?: { limit?: number; search?: string; page?: number; per_page?: number }): Promise<any> => {
        const queryParams = new URLSearchParams()
        if (params?.limit) queryParams.append('limit', params.limit.toString())
        if (params?.search) queryParams.append('search', params.search)
        if (params?.page) queryParams.append('page', params.page.toString())
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString())

        const queryString = queryParams.toString()
        const url = queryString ? `/task-templates?${queryString}` : '/task-templates'

        const response = await apiClient.get(url)
        return response.data
    },

    getById: async (id: string): Promise<{ success: boolean; data: TaskTemplate }> => {
        const response = await apiClient.get(`/task-templates/${id}`)
        return response.data
    },

    create: async (payload: TaskTemplatePayload): Promise<{ success: boolean; data: TaskTemplate; message?: string }> => {
        const response = await apiClient.post('/task-templates', payload)
        return response.data
    },

    update: async (id: string, payload: Partial<TaskTemplatePayload>): Promise<{ success: boolean; data: TaskTemplate; message?: string }> => {
        const response = await apiClient.put(`/task-templates/${id}`, payload)
        return response.data
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/task-templates/${id}`)
    },
}

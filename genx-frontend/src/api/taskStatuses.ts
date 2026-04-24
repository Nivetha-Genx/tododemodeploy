import apiClient from '@/lib/axios';

export interface TaskStatus {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    order: number;
    is_system: boolean;
}

export const taskStatusesApi = {
    getAll: async () => {
        const response = await apiClient.get('/task-statuses');
        return response.data;
    },

    create: async (data: { name: string; color?: string; order?: number }) => {
        const response = await apiClient.post('/task-statuses', data);
        return response.data;
    },

    update: async (id: string, data: { name?: string; color?: string; order?: number }) => {
        const response = await apiClient.put(`/task-statuses/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/task-statuses/${id}`);
        return response.data;
    },

    reorder: async (statuses: Array<{ id: string; order: number }>) => {
        const response = await apiClient.post('/task-statuses/reorder', { statuses });
        return response.data;
    },
};

import apiClient from '@/lib/axios';

export interface SprintPayload {
    name: string;
    start_date: string;
    end_date: string;
}

export interface BurndownPoint {
    date: string;
    remaining: number;
    ideal: number;
}

export interface VelocityPoint {
    sprint_id: string;
    sprint: string;
    committed: number;
    completed: number;
}

export const sprintsApi = {
    getAll: async (params?: { filter?: 'current' | 'upcoming' | 'past' | 'all'; per_page?: number; page?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.filter) searchParams.set('filter', params.filter);
        if (params?.per_page != null) searchParams.set('per_page', String(params.per_page));
        if (params?.page != null) searchParams.set('page', String(params.page));
        const qs = searchParams.toString();
        const url = qs ? `/sprints?${qs}` : '/sprints';
        const response = await apiClient.get(url);
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/sprints/${id}`);
        return response.data;
    },

    create: async (data: SprintPayload) => {
        const response = await apiClient.post('/sprints', data);
        return response.data;
    },

    update: async (id: string, data: Partial<SprintPayload>) => {
        const response = await apiClient.put(`/sprints/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/sprints/${id}`);
        return response.data;
    },

    getBurndown: async (sprintId: string): Promise<{ success: boolean; data: BurndownPoint[] }> => {
        const response = await apiClient.get(`/sprints/${sprintId}/burndown`);
        return response.data;
    },

    getVelocity: async (): Promise<{ success: boolean; data: VelocityPoint[] }> => {
        const response = await apiClient.get('/sprints/velocity');
        return response.data;
    },

    start: async (sprintId: string) => {
        const response = await apiClient.post(`/sprints/${sprintId}/start`);
        return response.data;
    },

    close: async (
        sprintId: string,
        payload: { unclosed_action: 'backlog' | 'rollover'; target_sprint_id?: string }
    ) => {
        const response = await apiClient.post(`/sprints/${sprintId}/close`, payload);
        return response.data;
    },

    reopen: async (sprintId: string) => {
        const response = await apiClient.post(`/sprints/${sprintId}/reopen`);
        return response.data;
    },
};

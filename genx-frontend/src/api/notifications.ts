import apiClient from '@/lib/axios';

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    read_at: string | null;
    created_at: string;
}

export interface PaginatedNotifications {
    data: Notification[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

export const notificationsApi = {
    getAll: async (params?: { page?: number; per_page?: number; unread_only?: boolean; read_only?: boolean }) => {
        const response = await apiClient.get('/notifications', { params });
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await apiClient.get('/notifications/unread-count');
        return response.data;
    },

    markAsRead: async (id: string) => {
        const response = await apiClient.put(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await apiClient.put('/notifications/read-all');
        return response.data;
    },

    clearAll: async () => {
        const response = await apiClient.delete('/notifications/clear-all');
        return response.data;
    }
};

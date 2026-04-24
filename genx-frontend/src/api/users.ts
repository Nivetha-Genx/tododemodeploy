import apiClient from '@/lib/axios';

export interface UsersResponse {
    success: boolean;
    data: {
        current_page: number;
        data: any[]; // Raw users from backend
        last_page: number;
        total: number;
    };
}

export const usersApi = {
    getUsers: async (params?: { search?: string; role?: string; organization_id?: string; page?: number }) => {
        const response = await apiClient.get<UsersResponse>('/super-admin/users', { params });
        return response.data;
    },

    resetPassword: async (userId: string, data?: { password?: string }) => {
        const response = await apiClient.post(`/super-admin/users/${userId}/reset-password`, data);
        return response.data;
    }
};

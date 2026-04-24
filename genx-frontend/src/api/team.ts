import apiClient from '@/lib/axios';
import { UserRole } from '@/types';

export const teamApi = {
    getMembers: async () => {
        const response = await apiClient.get('/organization/members');
        return response.data;
    },
    getMembersPaginated: async (params: { page: number; per_page: number; search?: string }) => {
        const response = await apiClient.get('/organization/members/list-all', { params });
        return response.data;
    },
    inviteMember: async (data: { email?: string; mobile?: string; role: UserRole; name?: string }) => {
        const response = await apiClient.post('/organization/invite', data);
        return response.data;
    },
    removeMember: async (userId: string) => {
        const response = await apiClient.delete(`/organization/members/${userId}`);
        return response.data;
    },
    updateMemberRole: async (userId: string, role: UserRole) => {
        const response = await apiClient.put(`/organization/members/${userId}/role`, { role });
        return response.data;
    },
    resetPassword: async (userId: string, password?: string) => {
        const response = await apiClient.post(`/organization/members/${userId}/reset-password`, { password });
        return response.data;
    },
    updateMember: async (userId: string, data: { name?: string; email?: string; role?: UserRole }) => {
        const response = await apiClient.put(`/organization/members/${userId}`, data);
        return response.data;
    }
};

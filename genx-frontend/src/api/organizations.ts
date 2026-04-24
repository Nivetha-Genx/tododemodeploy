import apiClient from '@/lib/axios';

export const organizationsApi = {
    getAll: async () => {
        const response = await apiClient.get('/super-admin/organizations');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await apiClient.get(`/super-admin/organizations/${id}`);
        return response.data;
    },
    create: async (data: {
        name: string;
        expected_hours_per_day: number;
        timezone?: string;
        working_days?: string[];
        status?: string;
        admin_name?: string;
        admin_email?: string;
        admin_password?: string;
    }) => {
        const response = await apiClient.post('/super-admin/organizations', data);
        return response.data;
    },
    update: async (id: string, data: {
        name?: string;
        expected_hours_per_day?: number;
        timezone?: string;
        working_days?: string[];
        status?: string;
    }) => {
        const response = await apiClient.put(`/super-admin/organizations/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await apiClient.delete(`/super-admin/organizations/${id}`);
        return response.data;
    },
    getMembers: async () => {
        const response = await apiClient.get('/organization/members');
        return response.data;
    },
    getSettings: async () => {
        const response = await apiClient.get('/organization/settings');
        return response.data;
    },
    updateSettings: async (data: any) => {
        const response = await apiClient.put('/organization/settings', data);
        return response.data;
    },
    switchOrganization: async (orgId: string) => {
        const response = await apiClient.post('/super-admin/switch-organization', { organization_id: orgId });
        return response.data;
    },
    exitOrganization: async () => {
        const response = await apiClient.post('/super-admin/exit-organization');
        return response.data;
    },
    // Detailed Organization Management
    getAdmins: async (id: string) => {
        const response = await apiClient.get(`/super-admin/organizations/${id}/admins`);
        return response.data;
    },
    getAuditLogs: async (id: string) => {
        const response = await apiClient.get(`/super-admin/organizations/${id}/audit-logs`);
        return response.data;
    },
    createAdmin: async (id: string, data: { name: string; email: string; password?: string }) => {
        const response = await apiClient.post(`/super-admin/organizations/${id}/admins`, data);
        return response.data;
    },
    removeAdmin: async (orgId: string, adminId: string) => {
        const response = await apiClient.delete(`/super-admin/organizations/${orgId}/admins/${adminId}`);
        return response.data;
    },
    resetAdminPassword: async (orgId: string, adminId: string, data?: { password?: string }) => {
        const response = await apiClient.post(`/super-admin/organizations/${orgId}/admins/${adminId}/reset-password`, data);
        return response.data;
    },
};

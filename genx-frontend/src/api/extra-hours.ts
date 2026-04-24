import apiClient from '@/lib/axios';

export const extraHoursApi = {
    approve: async (timelog: string) => {
        const response = await apiClient.post(`/admin/time-logs/${timelog}/approve`);
        return response.data;
    },
    reject: async (timelog: string) => {
        const response = await apiClient.post(`/admin/time-logs/${timelog}/reject`);
        return response.data;
    },
    getPending: async () => {
        const response = await apiClient.get('/admin/time-logs/pending');
        return response.data;
    }

};

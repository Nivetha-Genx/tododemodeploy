import apiClient from '@/lib/axios';

type ProductivityParams = {
    start_date?: string;
    end_date?: string;
    assignee_id?: string | null;
    period?: string;
};

/**
 * Always sends all 4 fields in the query string.
 * Axios skips null/undefined by default — this helper prevents that.
 */
const buildQuery = (p: ProductivityParams): string =>
    [
        ['start_date', p.start_date ?? ''],
        ['end_date',   p.end_date   ?? ''],
        ['period',     p.period     ?? ''],
        ['assignee_id', p.assignee_id ?? ''],
    ]
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');

export const reportsApi = {
    getProductivity: async (params?: ProductivityParams) => {
        const response = await apiClient.get(`/admin/reports/productivity?${buildQuery(params ?? {})}`);
        return response.data;
    },
    exportProductivity: async (mode: 'individual' | 'team', params?: ProductivityParams) => {
        const endpoint = mode === 'individual'
            ? '/admin/reports/performance/individual/export'
            : '/admin/reports/performance/team/export';
        const response = await apiClient.get(`${endpoint}?${buildQuery(params ?? {})}`, {
            responseType: 'blob'
        });
        return response;
    },
    getUtilization: async (params?: { start_date?: string; end_date?: string }) => {
        const response = await apiClient.get('/admin/reports/utilization', { params });
        return response.data;
    },
    getBurndown: async (projectId: string) => {
        const response = await apiClient.get(`/admin/reports/projects/${projectId}/burndown`);
        return response.data;
    },
    getSprintBurndown: async (sprintId: string) => {
        const response = await apiClient.get(`/sprints/${sprintId}/burndown`);
        return response.data;
    },
    getVelocity: async (teamId?: string) => {
        const response = await apiClient.get('/admin/reports/velocity', { params: { team_id: teamId } });
        return response.data;
    },
    getAdminReports: async (period: string = 'month') => {
        const response = await apiClient.get('/admin/reports', { params: { period } });
        return response.data;
    },
    getUserProgress: async (period: string = 'month') => {
        const response = await apiClient.get('/admin/users/progress', { params: { period } });
        return response.data;
    }
};

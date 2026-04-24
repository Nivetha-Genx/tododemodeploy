import apiClient from '@/lib/axios';
import { Project } from '@/types';

export interface ProjectStats {
    totalTasks: number;
    completedTasks: number;
    totalHours: number;
    progress: number;
}

export interface ProjectWithStats extends Project {
    stats: ProjectStats;
    recentActivities?: any[];
}

export const projectsApi = {
    getAll: async (params?: { assignee_id?: string }) => {
        const response = await apiClient.get('/projects/list-all', { params });
        return response.data;
    },
    getPaginated: async (params?: { assignee_id?: string; per_page?: number; page?: number; search?: string }) => {
        const response = await apiClient.get('/projects', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await apiClient.get(`/projects/${id}`);
        return response.data;
    },
    getActivities: async (projectId: string, params?: { per_page?: number; page?: number; assignee_name?: string }) => {
        const response = await apiClient.get(`/projects/${projectId}/activities`, { params });
        return response.data;
    },
    create: async (data: any) => {
        const formData = new FormData();
        formData.append('title', data.name);
        formData.append('description', data.description || '');
        formData.append('short_code', data.shortCode || data.key || '');

        if (data.start_date) formData.append('start_date', data.start_date);
        if (data.end_date) formData.append('end_date', data.end_date);
        if (data.image) formData.append('image', data.image);

        const response = await apiClient.post('/projects', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    update: async (id: string, data: any) => {
        const formData = new FormData();
        if (data.name) formData.append('title', data.name);
        if (data.description !== undefined) formData.append('description', data.description);
        if (data.shortCode) formData.append('short_code', data.shortCode);
        if (data.start_date !== undefined) formData.append('start_date', data.start_date);
        if (data.end_date !== undefined) formData.append('end_date', data.end_date || '');
        if (data.image) formData.append('image', data.image);

        // Laravel requires _method=PUT to handle multipart/form-data via POST for updates
        formData.append('_method', 'PUT');

        const response = await apiClient.post(`/projects/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    delete: async (id: string, withTasks: boolean = false) => {
        const response = await apiClient.delete(`/projects/${id}${withTasks ? '?with_tasks=1' : ''}`);
        return response.data;
    },
    removeMember: async (projectId: string, userId: string) => {
        const response = await apiClient.delete(`/projects/${projectId}/members/${userId}`);
        return response.data;
    },
    inviteMember: async (projectId: string, data: { members: Array<{ assign_id: string }> }) => {
        const response = await apiClient.post(`/projects/${projectId}/invite`, data);
        return response.data;
    }
};

export const mapBackendProjectToFrontend = (p: any): ProjectWithStats => {
    if (!p) return {} as ProjectWithStats;

    return {
        id: String(p.id || ''),
        name: p.title || p.name || 'Untitled Project',
        description: p.description || '',
        organizationId: p.organization_id ? String(p.organization_id) : '',
        shortCode: p.short_code || (p.title ? p.title.substring(0, 3).toUpperCase() : 'PRJ'),
        key: p.short_code || (p.title ? p.title.substring(0, 3).toUpperCase() : 'PRJ'),
        leadId: p.owner_id ? String(p.owner_id) : undefined,
        memberIds: (p.project_members || p.members)?.map((m: any) => String(m.user_id || m.id || '')) || [],
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        status: p.status || 'active',
        icon: p.image_url || undefined,
        startDate: p.start_date || undefined,
        endDate: p.end_date || undefined,
        owner: p.owner ? {
            id: String(p.owner.id || ''),
            name: p.owner.name || 'Unknown',
            email: p.owner.email || '',
            role: p.owner.role || '',
            organizationId: String(p.owner.organization_id || ''),
            createdAt: p.owner.created_at || '',
            avatar: p.owner.avatar_url,
        } : undefined,
        projectMembers: (p.project_members && p.project_members.length > 0)
            ? p.project_members.map((pm: any) => ({
                id: String(pm.id || ''),
                projectId: String(pm.project_id || ''),
                userId: String(pm.user_id || ''),
                role: pm.role,
                acceptedAt: pm.accepted_at,
                user: pm.user ? {
                    id: String(pm.user.id || ''),
                    name: pm.user.name || '',
                    email: pm.user.email || '',
                    role: pm.user.role || '',
                    organizationId: String(pm.user.organization_id || ''),
                    createdAt: pm.user.created_at || '',
                    avatar: pm.user.avatar_url,
                } : undefined
            }))
            : (p.members && p.members.length > 0)
                ? p.members.map((m: any, index: number) => ({
                    id: `member-${m.id || index}`,
                    projectId: String(p.id || ''),
                    userId: String(m.id || ''),
                    role: m.pivot?.role || 'contributor',
                    acceptedAt: m.pivot?.accepted_at,
                    user: {
                        id: String(m.id || ''),
                        name: m.name || '',
                        email: m.email || '',
                        role: m.role || '',
                        organizationId: String(m.organization_id || ''),
                        createdAt: m.created_at || '',
                        avatar: m.avatar_url,
                    }
                }))
                : [],
        stats: {
            totalTasks: Number(p.tasks_count) || 0,
            completedTasks: Number(p.completed_tasks_count) || 0,
            progress: Number(p.completion_percentage) || 0,
            totalHours: Number(p.total_logged_hours) || 0
        },
        recentActivities: Array.isArray(p.recent_activities) ? p.recent_activities : [],
    } as ProjectWithStats;
};

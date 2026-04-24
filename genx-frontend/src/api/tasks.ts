import apiClient from '@/lib/axios';
import { Task, StatusType, Priority } from '@/types';

// Define the response structure for paginated tasks if needed, 
// for now we'll assumes apiClient response.data is the payload.

export const tasksApi = {
    getAll: async (filters?: Record<string, any>) => {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            });
        }
        const response = await apiClient.get(`/tasks?${params.toString()}`);
        return response.data;
    },

    getAllListAll: async (filters?: Record<string, any>) => {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            });
        }
        const response = await apiClient.get(`/tasks/list-all?${params.toString()}`);
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/tasks/${id}`);
        return response.data;
    },

    getFull: async (id: string) => {
        const response = await apiClient.get(`/tasks/${id}/full`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await apiClient.post('/tasks', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/tasks/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/tasks/${id}`);
        return response.data;
    },

    updateStatus: async (id: string, status: StatusType) => {
        const response = await apiClient.put(`/tasks/${id}/status`, { status });
        return response.data;
    },
    getComments: async (taskId: string) => {
        const response = await apiClient.get(`/tasks/${taskId}/comments`);
        return response.data;
    },
    addComment: async (taskId: string, content: string) => {
        const response = await apiClient.post(`/tasks/${taskId}/comments`, { content });
        return response.data;
    },
    getHistory: async (taskId: string) => {
        const response = await apiClient.get(`/tasks/${taskId}/history`);
        return response.data;
    },
    submitDueDateRequest: async (taskId: string, data: { reason: string; proposed_due_date: string }) => {
        const response = await apiClient.post(`/tasks/${taskId}/due-date-request`, data);
        return response.data;
    },
    getPendingRequests: async () => {
        const response = await apiClient.get('/task-due-date-requests/pending');
        return response.data;
    },
    approveDueDateRequest: async (requestId: string) => {
        const response = await apiClient.post(`/task-due-date-requests/${requestId}/approve`);
        return response.data;
    },
    rejectDueDateRequest: async (requestId: string) => {
        const response = await apiClient.post(`/task-due-date-requests/${requestId}/reject`);
        return response.data;
    },
    getTimeLogs: async (taskId: string) => {
        const response = await apiClient.get(`/tasks/${taskId}/time-logs`);
        return response.data;
    },
    addTimeLog: async (taskId: string, data: { start_time: string; end_time: string; notes?: string }) => {
        const response = await apiClient.post(`/tasks/${taskId}/time-logs`, data);
        return response.data;
    },
    updateTimeLog: async (taskId: string, timeLogId: string, data: { start_time: string; end_time: string; notes?: string }) => {
        const response = await apiClient.put(`/tasks/${taskId}/time-logs/${timeLogId}`, data);
        return response.data;
    },
    deleteTimeLog: async (taskId: string, timeLogId: string) => {
        const response = await apiClient.delete(`/tasks/${taskId}/time-logs/${timeLogId}`);
        return response.data;
    }
};

export const mapBackendTaskToFrontend = (t: any): Task => {
    return {
        id: String(t.id),
        taskId: t.task_id || (t.id ? `TASK-${String(t.id).substring(0, 4)}` : 'TASK-UNKN'), // Fallback if task_id not present
        boardId: 'board-1', // Default or map from backend if available
        projectId: String(t.project_id || ''),
        projectName: t.project?.title || t.project?.name || '',
        projectIcon: t.project?.icon,
        sprintId: t.sprint_id ? String(t.sprint_id) : undefined,
        storyPoints: t.story_points != null ? Number(t.story_points) : undefined,
        sprint: t.sprint ? {
            id: String(t.sprint.id),
            name: t.sprint.name,
            start_date: t.sprint.start_date,
            end_date: t.sprint.end_date,
            organization_id: String(t.sprint.organization_id || ''),
            created_at: t.sprint.created_at,
            updated_at: t.sprint.updated_at
        } : undefined,
        title: t.title || 'Untitled Task',
        description: t.description || '',
        status: (t.status as StatusType) || 'new',
        priority: (t.priority as Priority) || 'medium',
        assigneeId: t.assignee_id ? String(t.assignee_id) : undefined,
        assigneeName: t.assignee?.name,
        assigneeAvatar: t.assignee?.avatar_url,
        startDate: t.task_date || '',
        dueDate: t.deadline || t.task_date || '',
        estimatedHours: Number(t.estimated_hours) || 0,
        loggedHours: t.actual_hours || 0,
        subtasks: t.subtasks?.map((st: any) => {
            // If subtask has assignee object, use it; otherwise try to match with main task's assignee
            const subtaskAssignee = st.assignee || (st.assignee_id && String(st.assignee_id) === String(t.assignee_id) ? t.assignee : null)

            return {
                id: String(st.id),
                parentTaskId: String(st.parent_task_id || t.id),
                taskId: st.task_id || (st.id ? `TASK-${String(st.id).substring(0, 4)}` : 'SUB-UNKN'),
                title: st.title || 'Untitled Subtask',
                status: (st.status as StatusType) || 'new',
                assigneeId: st.assignee_id ? String(st.assignee_id) : undefined,
                assigneeName: subtaskAssignee?.name || (st.assignee_id && String(st.assignee_id) === String(t.assignee_id) ? t.assignee?.name : undefined),
                estimatedHours: Number(st.estimated_hours) || 0,
                loggedHours: st.actual_hours || 0,
                dueDate: st.deadline || st.task_date || '',
                createdAt: st.created_at
            }
        }) || [],
        timeLogs: [], // Not loaded by default
        comments: t.comments?.map((c: any) => ({
            id: c.id,
            taskId: c.task_id,
            userId: c.user_id,
            userName: c.user?.name || 'Unknown',
            userAvatar: c.user?.avatar_url,
            content: c.content,
            createdAt: c.created_at
        })) || [],
        attachments: t.attachments?.map((a: any) => ({
            id: a.id,
            taskId: a.task_id || t.id,
            filename: a.filename,
            sizeBytes: a.size_bytes,
            formattedSize: a.formatted_size,
            downloadUrl: a.download_url,
            uploadedBy: a.uploaded_by ? {
                id: a.uploaded_by.id,
                name: a.uploaded_by.name,
                email: a.uploaded_by.email,
                avatar: a.uploaded_by.avatar_url,
                role: '',
                access_level: 'user' as const,
                organizationId: '',
                expectedHoursPerDay: 8,
                createdAt: '',
            } : undefined,
            createdAt: a.created_at
        })) || [],
        auditHistory: [], // Not loaded by default
        breadcrumbs: t.breadcrumbs?.map((b: any) => ({
            id: b.id,
            taskId: b.task_id,
            title: b.title
        })) || [],
        parentId: t.parent_id,
        parentTaskId: t.parent?.task_id,
        parent_task_id: t.parent_task_id,
        createdAt: t.created_at,
        createdBy: t.created_by || ''
    };
};

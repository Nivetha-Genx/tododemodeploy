import { useEffect } from 'react';
import { useAuthStore, useUIStore } from '@/stores';
import { useNotificationHubStore } from '@/stores/notificationHubStore';
import echo from '@/lib/echo';

export function useWebSockets(taskId?: string | null, projectId?: string | null) {
    const { token, user } = useAuthStore();

    useEffect(() => {
        if (!token || !user) return;

        // Configure auth header dynamically
        // @ts-ignore
        if (echo.connector.options.auth) {
            // @ts-ignore
            echo.connector.options.auth.headers.Authorization = `Bearer ${token}`;
        } else {
            // @ts-ignore
            echo.connector.options.auth = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };
        }

        // 1. Subscribe to user's private channel (Global) - Only if not a specific task/project hook
        const userChannel = (!taskId && !projectId) ? echo.private(`user.${user.id}`) : null;

        if (userChannel) {
            userChannel.listen('.task.updated', (data: any) => {
                window.dispatchEvent(new CustomEvent('task-updated', { detail: data }));
            });

            userChannel.listen('.task.created', (data: any) => {
                window.dispatchEvent(new CustomEvent('task-created', { detail: data }));
            });

            userChannel.listen('.reminder.due', (data: any) => {
                window.dispatchEvent(new CustomEvent('notification-received', { detail: data }));
            });

            userChannel.listen('.sidebar.counts_updated', (data: any) => {
                const { counts } = data || {};

                // 1. Update notification count in its specific store
                if (counts?.unread_notifications_count !== undefined) {
                    useNotificationHubStore.setState({ unreadCount: counts.unread_notifications_count });
                }

                // 2. Update general sidebar counts in UI store
                if (counts) {
                    useUIStore.setState((state) => ({
                        sidebarCounts: {
                            ...state.sidebarCounts,
                            ...counts
                        }
                    }));
                }

                // 3. Fetch latest notifications to keep the dropdown/dialog updated
                useNotificationHubStore.getState().fetchNotifications();

                // 4. Dispatch a custom event for other components to react to if needed
                window.dispatchEvent(new CustomEvent('sidebar-counts-updated', { detail: data }));
            });
        }

        // 2. Subscribe to specific task channel if provided (e.g., in Task Detail Drawer)
        let taskChannel: any = null;
        if (taskId) {
            taskChannel = echo.private(`task.${taskId}`);
            taskChannel.listen('.comment.added', (data: any) => {
                window.dispatchEvent(new CustomEvent('comment-added', { detail: data }));
            });
            taskChannel.listen('.task.updated', (data: any) => {
                window.dispatchEvent(new CustomEvent('task-updated', { detail: data }));
            });
        }

        // 3. Subscribe to specific project channel if provided
        let projectChannel: any = null;
        if (projectId) {
            projectChannel = echo.private(`project.${projectId}`);
            projectChannel.listen('.project.updated', (data: any) => {
                window.dispatchEvent(new CustomEvent('project-updated', { detail: data }));
            });
            projectChannel.listen('.task.updated', (data: any) => {
                window.dispatchEvent(new CustomEvent('task-updated', { detail: data }));
            });
        }

        // 4. Subscribe to organization channel (Global) - Only if not a specific task/project hook
        let orgChannel: any = null;
        if (user.organizationId && !taskId && !projectId) {
            orgChannel = echo.private(`organization.${user.organizationId}`);
            orgChannel.listen('.task.updated', (data: any) => {
                window.dispatchEvent(new CustomEvent('task-updated', { detail: data }));
            });
            orgChannel.listen('.task.created', (data: any) => {
                window.dispatchEvent(new CustomEvent('task-created', { detail: data }));
            });
            orgChannel.listen('.project.updated', (data: any) => {
                window.dispatchEvent(new CustomEvent('project-updated', { detail: data }));
            });
        }

        return () => {
            if (!taskId && !projectId) {
                echo.leave(`user.${user.id}`);
                if (user.organizationId) echo.leave(`organization.${user.organizationId}`);
            }
            if (taskId) echo.leave(`task.${taskId}`);
            if (projectId) echo.leave(`project.${projectId}`);
        };
    }, [token, user, taskId, projectId]);

    return echo;
}

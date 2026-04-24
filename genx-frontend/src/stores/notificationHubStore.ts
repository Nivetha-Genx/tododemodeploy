import { create } from 'zustand';
import { Notification, notificationsApi } from '@/api/notifications';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    totalNotifications: number;
    loading: boolean;
    loadingCount: number;
    pagination: {
        total: number;
        last_page: number;
        current_page: number;
        per_page: number;
    };

    fetchNotifications: (page?: number, perPage?: number, filter?: 'unread' | 'read' | 'all') => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearAll: () => Promise<void>;
    addNotification: (notification: Notification) => void;
}

export const useNotificationHubStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    totalNotifications: 0,
    loading: true,
    loadingCount: 0,
    pagination: {
        total: 0,
        last_page: 1,
        current_page: 1,
        per_page: 20,
    },

    fetchNotifications: async (page = 1, perPage = 20, filter: 'unread' | 'read' | 'all' = 'all') => {
        set((state) => ({ loading: true, loadingCount: state.loadingCount + 1 }));
        try {
            const response = await notificationsApi.getAll({
                page,
                per_page: perPage,
                unread_only: filter === 'unread',
                read_only: filter === 'read'
            });
            if (response.success) {
                const newState: any = {
                    notifications: response.data.data,
                    pagination: {
                        total: response.data.total,
                        last_page: response.data.last_page,
                        current_page: response.data.current_page,
                        per_page: response.data.per_page,
                    }
                };

                // Update specific counts based on filter
                if (filter === 'unread') {
                    newState.unreadCount = response.data.total;
                } else if (filter === 'all') {
                    newState.totalNotifications = response.data.total;
                }

                set(newState);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            set((state) => {
                const newCount = Math.max(0, state.loadingCount - 1);
                return { loadingCount: newCount, loading: newCount > 0 };
            });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const response = await notificationsApi.getUnreadCount();
            if (response.success) {
                set({ unreadCount: response.data.count });
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    },

    markAsRead: async (id: string) => {
        try {
            await notificationsApi.markAsRead(id);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, read_at: new Date().toISOString() } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }));
            // Sync with backend count
            const countRes = await notificationsApi.getUnreadCount();
            if (countRes.success) {
                set({ unreadCount: countRes.data.count });
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    },

    markAllAsRead: async () => {
        try {
            await notificationsApi.markAllAsRead();
            set((state) => ({
                notifications: state.notifications.map((n) => ({
                    ...n,
                    read_at: new Date().toISOString()
                })),
                unreadCount: 0
            }));
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    },

    clearAll: async () => {
        try {
            await notificationsApi.clearAll();
            set({ notifications: [], unreadCount: 0, totalNotifications: 0 });
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    },

    addNotification: (notification: Notification) => {
        set((state) => {
            // Check if notification already exists
            const exists = state.notifications.some(n => n.id === notification.id);
            if (exists) return state;

            return {
                notifications: [notification, ...state.notifications].slice(0, state.pagination.per_page),
                unreadCount: state.unreadCount + 1,
                totalNotifications: state.totalNotifications + 1,
                pagination: {
                    ...state.pagination,
                    total: state.pagination.total + 1
                }
            };
        });
    },
}));

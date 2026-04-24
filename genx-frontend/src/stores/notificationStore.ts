import { create } from "zustand"

export type NotificationType = "success" | "error" | "warning" | "info"

interface Notification {
    id: string
    type: NotificationType
    title?: string
    message: string
    progress?: number
    duration?: number
}

interface NotificationState {
    notifications: Notification[]
    show: (n: Omit<Notification, "id">) => void
    dismiss: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],

    show: (notification) =>
        set((state) => ({
            notifications: [
                ...state.notifications,
                { id: crypto.randomUUID(), ...notification },
            ],
        })),

    dismiss: (id) =>
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        })),
}))

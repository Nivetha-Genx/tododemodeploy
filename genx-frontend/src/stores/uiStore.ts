import { create } from 'zustand'
import { sidebarApi, SidebarCounts } from '@/api/sidebar'

type ModalType =
    | 'createTask'
    | 'editTask'
    | 'createTaskTemplate'
    | 'editTaskTemplate'
    | 'createBoard'
    | 'createProject'
    | 'projectSettings'
    | 'dueDateRequest'
    | 'logHours'
    | 'inviteMember'
    | 'inviteTeamMember'
    | 'editTeamMember'
    | 'resetPassword'
    | 'approvalQueue'
    | null

interface UIState {
    // Sidebar
    sidebarCollapsed: boolean
    toggleSidebar: () => void
    setSidebarCollapsed: (collapsed: boolean) => void

    // Modals
    activeModal: ModalType
    modalData: Record<string, unknown> | null
    openModal: (modal: ModalType, data?: Record<string, unknown>) => void
    closeModal: () => void

    // Drawers
    taskDrawerOpen: boolean
    taskDrawerId: string | null
    openTaskDrawer: (taskId: string) => void
    closeTaskDrawer: () => void

    // Task drawer loading state
    isOpeningTask: boolean
    setIsOpeningTask: (value: boolean) => void

    // Theme
    theme: 'light' | 'dark'
    toggleTheme: () => void

    // Sidebar Counts
    sidebarCounts: SidebarCounts
    fetchSidebarCounts: () => Promise<void>
}

export const useUIStore = create<UIState>((set) => ({
    // Sidebar
    sidebarCollapsed: false,
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    // Modals
    activeModal: null,
    modalData: null,
    openModal: (modal, data) => set({ activeModal: modal, modalData: data || null }),
    closeModal: () => set({ activeModal: null, modalData: null }),

    // Drawers
    taskDrawerOpen: false,
    taskDrawerId: null,
    openTaskDrawer: (taskId) => set({ taskDrawerOpen: true, taskDrawerId: taskId }),
    closeTaskDrawer: () => set({ taskDrawerOpen: false, taskDrawerId: null, isOpeningTask: false }),

    // Task drawer loading state
    isOpeningTask: false,
    setIsOpeningTask: (value) => set({ isOpeningTask: value }),

    // Theme
    theme: 'light',
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
    })),

    // Sidebar Counts
    sidebarCounts: {
        today_task_count: 0,
        pending_approval_count: 0,
        leaderboard_rank: null,
        leaderboard_points: 0,
    },
    fetchSidebarCounts: async () => {
        try {
            const response = await sidebarApi.getCounts()
            if (response.success) {
                set({ sidebarCounts: response.data })
            }
        } catch (error) {
            console.error('Failed to fetch sidebar counts:', error)
        }
    },
}))

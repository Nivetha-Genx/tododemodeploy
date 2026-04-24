import { create } from 'zustand'

interface TaskUIState {
    selectedTaskId: string | null
    viewMode: 'list' | 'kanban' | 'calendar'

    selectTask: (id: string | null) => void
    setViewMode: (mode: TaskUIState['viewMode']) => void
}

export const useTaskUIStore = create<TaskUIState>((set) => ({
    selectedTaskId: null,
    viewMode: 'list',

    selectTask: (id) => set({ selectedTaskId: id }),
    setViewMode: (mode) => set({ viewMode: mode }),
}))

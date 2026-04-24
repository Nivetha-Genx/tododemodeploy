import { create } from 'zustand'

type ViewMode = 'kanban' | 'list'

interface BoardUIState {
    // View mode
    viewMode: ViewMode
    setViewMode: (mode: ViewMode) => void

    // Selected board
    selectedBoardId: string | null
    setSelectedBoard: (boardId: string | null) => void

    // Filters
    filterAssignee: string | null
    filterPriority: string | null
    filterStatus: string | null
    searchQuery: string

    setFilterAssignee: (assigneeId: string | null) => void
    setFilterPriority: (priority: string | null) => void
    setFilterStatus: (status: string | null) => void
    setSearchQuery: (query: string) => void
    clearFilters: () => void
}

export const useBoardUIStore = create<BoardUIState>((set) => ({
    // View mode
    viewMode: 'kanban',
    setViewMode: (mode) => set({ viewMode: mode }),

    // Selected board
    selectedBoardId: null,
    setSelectedBoard: (boardId) => set({ selectedBoardId: boardId }),

    // Filters
    filterAssignee: null,
    filterPriority: null,
    filterStatus: null,
    searchQuery: '',

    setFilterAssignee: (assigneeId) => set({ filterAssignee: assigneeId }),
    setFilterPriority: (priority) => set({ filterPriority: priority }),
    setFilterStatus: (status) => set({ filterStatus: status }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    clearFilters: () => set({
        filterAssignee: null,
        filterPriority: null,
        filterStatus: null,
        searchQuery: '',
    }),
}))

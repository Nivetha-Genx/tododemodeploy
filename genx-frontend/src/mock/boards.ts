import type { Board, BoardColumn } from '@/types'

export const defaultColumns: BoardColumn[] = [
    { id: 'col-1', name: 'New', status: 'new', order: 0, color: '#3B82F6' },
    { id: 'col-2', name: 'In Progress', status: 'in_progress', order: 1, color: '#F59E0B' },
    { id: 'col-3', name: 'Blocked', status: 'blocked', order: 2, color: '#EF4444' },
    { id: 'col-4', name: 'Completed', status: 'completed', order: 3, color: '#22C55E' },
    { id: 'col-5', name: 'Archived', status: 'archived', order: 4, color: '#6B7280' },
]

export const mockBoards: Board[] = [
    {
        id: 'board-1',
        name: 'Product Development',
        description: 'Main product development board for Q1 2024',
        organizationId: 'org-1',
        projectId: 'proj-1',
        columns: defaultColumns,
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1',
    },
    {
        id: 'board-2',
        name: 'Marketing Campaigns',
        description: 'Marketing team tasks and campaigns',
        organizationId: 'org-1',
        projectId: 'proj-2',
        columns: defaultColumns,
        createdAt: '2024-01-05T00:00:00Z',
        createdBy: 'user-1',
    },
    {
        id: 'board-3',
        name: 'Infrastructure',
        description: 'DevOps and infrastructure tasks',
        organizationId: 'org-1',
        projectId: 'proj-3',
        columns: defaultColumns,
        createdAt: '2024-01-10T00:00:00Z',
        createdBy: 'user-1',
    },
]

export const getBoardById = (id: string): Board | undefined => {
    return mockBoards.find(board => board.id === id)
}

export const getColumnsByBoardId = (boardId: string): BoardColumn[] => {
    const board = getBoardById(boardId)
    return board ? board.columns : []
}


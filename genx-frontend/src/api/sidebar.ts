import apiClient from '@/lib/axios'

export interface SidebarCounts {
    today_task_count: number
    pending_approval_count: number
    leaderboard_rank: number | null
    leaderboard_points: number
}

export const sidebarApi = {
    getCounts: async () => {
        const response = await apiClient.get('/sidebar/counts')
        return response.data
    },
}

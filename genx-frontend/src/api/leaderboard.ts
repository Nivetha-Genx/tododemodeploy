import apiClient from '@/lib/axios'

export interface LeaderboardUser {
    rank: number
    user_id: string
    name: string
    email?: string
    avatar_url: string | null
    points: number
}

export interface LeaderboardResponse {
    success: boolean
    data: {
        users: LeaderboardUser[]
        year: number
        month: number
    }
}

export const leaderboardApi = {
    get: async (year?: number, month?: number): Promise<LeaderboardResponse> => {
        const params = new URLSearchParams()
        if (year !== undefined) params.set('year', String(year))
        if (month !== undefined) params.set('month', String(month))
        const query = params.toString()
        const response = await apiClient.get<LeaderboardResponse>(`/leaderboard${query ? `?${query}` : ''}`)
        return response.data
    },
}

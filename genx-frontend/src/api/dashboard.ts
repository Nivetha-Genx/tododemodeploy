import apiClient from '@/lib/axios'
import { ExtraHourApproval } from '@/types'

export interface DashboardResponse {
    success: boolean
    data: {
        user_tasks: {
            today: any[]
            overdue: any[]
        }
        personal_stats: {
            task_stats: {
                total: number
                open: number
                in_progress: number
                completed: number
                overdue: number
                created_in_period: number
                completed_in_period: number
                relevant_tasks_count: number
            }
            total_time_logged_hours: number
        }
        org_stats?: {
            task_stats: {
                total: number
                open: number
                in_progress: number
                completed: number
                overdue: number
                created_in_period: number
                completed_in_period: number
                relevant_tasks_count: number
            }
            user_stats: {
                total: number
                admins: number
                active_in_period: number
            }
            project_stats: {
                total: number
                created_in_period: number
            }
            top_performers: any[]
            total_time_logged_hours: number
        }
        task_trend?: any[]
        completion_trend?: any[]
        team_performance?: any[]
        pending_requests?: any[]
        pending_extra_hours?: ExtraHourApproval[]
        task_templates?: any[]


        top_leaderboard?: Array<{ rank: number; user_id: string; name: string; avatar_url?: string | null; points: number }>
        period: string
        start_date: string
    }
}

export const dashboardApi = {
    /**
     * Get unified dashboard data
     * @param period Time period for statistics
     * @returns Complete dashboard data in single response
     */
    get: async (period: 'day' | 'week' | 'month' = 'day'): Promise<DashboardResponse> => {
        const response = await apiClient.get(`/dashboard?period=${period}`)
        return response.data
    }
}

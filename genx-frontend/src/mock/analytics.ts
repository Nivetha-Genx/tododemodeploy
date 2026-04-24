import type { DailyProductivityData, BurndownData, VelocityData, TeamMemberStats } from '@/types'

export const mockDailyProductivity: DailyProductivityData[] = [
    { date: '2024-01-15', logged: 7.5, expected: 8 },
    { date: '2024-01-16', logged: 8, expected: 8 },
    { date: '2024-01-17', logged: 6.5, expected: 8 },
    { date: '2024-01-18', logged: 9, expected: 8 },
    { date: '2024-01-19', logged: 8, expected: 8 },
    { date: '2024-01-20', logged: 0, expected: 0 }, // Weekend
    { date: '2024-01-21', logged: 0, expected: 0 }, // Weekend
    { date: '2024-01-22', logged: 7, expected: 8 },
    { date: '2024-01-23', logged: 8.5, expected: 8 },
    { date: '2024-01-24', logged: 8, expected: 8 },
]

export const mockBurndownData: BurndownData[] = [
    { date: '2024-01-15', remaining: 100, ideal: 100 },
    { date: '2024-01-16', remaining: 92, ideal: 90 },
    { date: '2024-01-17', remaining: 85, ideal: 80 },
    { date: '2024-01-18', remaining: 78, ideal: 70 },
    { date: '2024-01-19', remaining: 65, ideal: 60 },
    { date: '2024-01-22', remaining: 55, ideal: 50 },
    { date: '2024-01-23', remaining: 42, ideal: 40 },
    { date: '2024-01-24', remaining: 35, ideal: 30 },
    { date: '2024-01-25', remaining: 25, ideal: 20 },
    { date: '2024-01-26', remaining: 15, ideal: 10 },
]

export const mockVelocityData: VelocityData[] = [
    { sprint: 'Sprint 1', completed: 45, committed: 50 },
    { sprint: 'Sprint 2', completed: 52, committed: 55 },
    { sprint: 'Sprint 3', completed: 48, committed: 50 },
    { sprint: 'Sprint 4', completed: 55, committed: 55 },
    { sprint: 'Sprint 5', completed: 60, committed: 58 },
    { sprint: 'Sprint 6', completed: 58, committed: 60 },
]

export const mockTeamStats: TeamMemberStats[] = [
    {
        userId: 'user-3',
        userName: 'Amit Patel',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amit',
        loggedHours: 38,
        expectedHours: 40,
        tasksCompleted: 5,
        tasksTotal: 8,
        productivityPercentage: 95,
    },
    {
        userId: 'user-4',
        userName: 'Sneha Gupta',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha',
        loggedHours: 42,
        expectedHours: 40,
        tasksCompleted: 6,
        tasksTotal: 7,
        productivityPercentage: 105,
    },
    {
        userId: 'user-5',
        userName: 'Vikram Singh',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vikram',
        loggedHours: 32,
        expectedHours: 40,
        tasksCompleted: 3,
        tasksTotal: 6,
        productivityPercentage: 80,
    },
]

export const getDashboardStats = () => ({
    totalTasks: 7,
    completedTasks: 1,
    inProgressTasks: 2,
    blockedTasks: 1,
    overdueCount: 0,
    todayLoggedHours: 6.5,
    weekLoggedHours: 38,
    pendingApprovals: 1,
})

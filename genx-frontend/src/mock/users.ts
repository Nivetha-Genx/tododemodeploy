import type { User } from '@/types'

export const mockUsers: User[] = [
    {
        id: 'user-1',
        name: 'Rajesh Kumar',
        email: 'rajesh@genx.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh',
        role: 'admin',
        organizationId: 'org-1',
        expectedHoursPerDay: 8,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'user-2',
        name: 'Priya Sharma',
        email: 'priya@genx.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
        role: 'team_lead',
        organizationId: 'org-1',
        teamId: 'team-1',
        expectedHoursPerDay: 8,
        createdAt: '2024-01-05T00:00:00Z',
    },
    {
        id: 'user-3',
        name: 'Amit Patel',
        email: 'amit@genx.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amit',
        role: 'member',
        organizationId: 'org-1',
        teamId: 'team-1',
        expectedHoursPerDay: 8,
        createdAt: '2024-01-10T00:00:00Z',
    },
    {
        id: 'user-4',
        name: 'Sneha Gupta',
        email: 'sneha@genx.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha',
        role: 'member',
        organizationId: 'org-1',
        teamId: 'team-1',
        expectedHoursPerDay: 8,
        createdAt: '2024-01-12T00:00:00Z',
    },
    {
        id: 'user-5',
        name: 'Vikram Singh',
        email: 'vikram@genx.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vikram',
        role: 'member',
        organizationId: 'org-1',
        teamId: 'team-2',
        expectedHoursPerDay: 8,
        createdAt: '2024-01-15T00:00:00Z',
    },
    {
        id: 'user-0',
        name: 'Super Admin',
        email: 'superadmin@genx.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin',
        role: 'super_admin',
        organizationId: 'org-0',
        expectedHoursPerDay: 8,
        createdAt: '2024-01-01T00:00:00Z',
    },
]

export const getUserById = (id: string): User | undefined => {
    return mockUsers.find(user => user.id === id)
}

export const getUsersByRole = (role: User['role']): User[] => {
    return mockUsers.filter(user => user.role === role)
}

export const getUsersByTeam = (teamId: string): User[] => {
    return mockUsers.filter(user => user.teamId === teamId)
}

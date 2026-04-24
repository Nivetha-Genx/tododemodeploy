import type { Project } from '@/types'

export const mockProjects: Project[] = [
    {
        id: 'proj-1',
        name: 'Website Redesign',
        description: 'Overhaul of the corporate website with new branding and improved UX.',
        organizationId: 'org-1',
        key: 'WEB',
        leadId: 'user-3',
        memberIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-05T00:00:00Z',
    },
    {
        id: 'proj-2',
        name: 'Mobile App V2',
        description: 'Next generation of our mobile application with offline support.',
        organizationId: 'org-1',
        key: 'MOB',
        leadId: 'user-4',
        memberIds: ['user-1', 'user-4', 'user-5'],
        status: 'active',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-12T00:00:00Z',
    },
    {
        id: 'proj-3',
        name: 'Internal Tools',
        description: 'Maintenance and improvements for internal admin tools.',
        organizationId: 'org-1',
        key: 'INT',
        leadId: 'user-2',
        memberIds: ['user-2', 'user-3'],
        status: 'active',
        createdAt: '2023-12-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
    },
]

export const getProjectById = (id: string): Project | undefined => {
    return mockProjects.find(p => p.id === id)
}

export const getProjectsByOrgId = (orgId: string): Project[] => {
    return mockProjects.filter(p => p.organizationId === orgId)
}



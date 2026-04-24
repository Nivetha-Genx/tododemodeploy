import type { Organization } from '@/types'

export const mockOrganizations: Organization[] = [
    {
        id: 'org-1',
        name: 'GenX Corp',
        logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=GenX',
        expectedHoursPerDay: 8,
        createdAt: '2023-01-01T00:00:00Z',
    },
    {
        id: 'org-2',
        name: 'Acme Inc',
        logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Acme',
        expectedHoursPerDay: 8,
        createdAt: '2023-06-15T00:00:00Z',
    },
    {
        id: 'org-3',
        name: 'StartupHub',
        logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Startup',
        expectedHoursPerDay: 7,
        createdAt: '2024-01-01T00:00:00Z',
    },
]

export const getOrganizationById = (id: string): Organization | undefined => {
    return mockOrganizations.find(org => org.id === id)
}

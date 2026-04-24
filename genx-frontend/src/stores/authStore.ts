import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole, AccessLevel } from '@/types'

interface AuthState {
    token: string | null
    user: User | null
    isAuthenticated: boolean
    activeOrganizationId: string | null
    activeOrganizationName: string | null
    mustChangePassword: boolean

    // Actions
    login: (user: User, token: string) => void
    logout: () => void
    updateUser: (user: Partial<User>) => void
    setToken: (token: string) => void
    setOrgContext: (orgId: string | null, orgName: string | null) => void
    setMustChangePassword: (mustChange: boolean) => void

    _hasHydrated: boolean
    setHasHydrated: (state: boolean) => void
    can: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            isAuthenticated: false,
            activeOrganizationId: null,
            activeOrganizationName: null,
            mustChangePassword: false,

            login: (user, token) => {
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    activeOrganizationId: null,
                    activeOrganizationName: null,
                    mustChangePassword: user.mustChangePassword || false
                })
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    activeOrganizationId: null,
                    activeOrganizationName: null,
                    mustChangePassword: false
                })
            },

            updateUser: (updates) => {
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null,
                }))
            },

            setToken: (token) => {
                set({ token })
            },

            setOrgContext: (orgId, orgName) => {
                set({ activeOrganizationId: orgId, activeOrganizationName: orgName })
            },

            setMustChangePassword: (mustChange) => {
                set((state) => ({
                    mustChangePassword: mustChange,
                    user: state.user ? { ...state.user, mustChangePassword: mustChange } : null
                }))
            },

            _hasHydrated: false,
            setHasHydrated: (state) => {
                set({ _hasHydrated: state })
            },

            can: (permission: string): boolean => {
                const state = get()
                const user = state.user
                if (!user) return false
                // Super Admin has all permissions in global context
                // Use access_level for base access checks, fallback to role for backward compat
                const accessLevel = user.access_level || user.role
                if (accessLevel === 'super_admin' && !state.activeOrganizationId) return true
                return user.permissions?.includes(permission) || false
            }
        }),
        {
            name: 'pm-todo-auth',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                activeOrganizationId: state.activeOrganizationId,
                activeOrganizationName: state.activeOrganizationName,
                mustChangePassword: state.mustChangePassword
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            },
        }
    )
)

// Role check helpers - use access_level for base access checks
// These check the base access level (super_admin/admin/member/team_lead)
// NOT the display role name (which can be custom like "Project Manager")
export const isSuperAdmin = (accessLevel?: AccessLevel | UserRole) => accessLevel === 'super_admin'
export const isAdmin = (accessLevel?: AccessLevel | UserRole) => accessLevel === 'admin'
export const isTeamLead = (accessLevel?: AccessLevel | UserRole) => accessLevel === 'team_lead'
// "Staff" in the UI corresponds to backend/member role
export const isStaff = (accessLevel?: AccessLevel | UserRole) => accessLevel === 'member'
export const canApproveRequests = (accessLevel?: AccessLevel | UserRole) => accessLevel === 'admin' || accessLevel === 'team_lead'
export const canManageBoards = (accessLevel?: AccessLevel | UserRole) => accessLevel === 'admin'
export const canManageTeam = (accessLevel?: AccessLevel | UserRole) => accessLevel === 'admin'

// Helper to get access level from user (with fallback)
export const getAccessLevel = (user?: User | null): AccessLevel | undefined => {
    if (!user) return undefined
    return (user.access_level || user.role) as AccessLevel
}

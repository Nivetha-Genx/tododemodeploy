import { create } from 'zustand'
import { organizationsApi } from '@/api/organizations'
import { useAuthStore } from './authStore'

interface OrgSwitchState {
    isSwitching: boolean
    switchOrg: (orgId: string, orgName: string) => Promise<void>
    exitOrg: () => Promise<void>
}

export const useOrgSwitchStore = create<OrgSwitchState>((set) => ({
    isSwitching: false,

    switchOrg: async (orgId, orgName) => {
        set({ isSwitching: true })
        try {
            const response = await organizationsApi.switchOrganization(orgId)
            const { access_token } = response.data

            // Update auth store
            useAuthStore.getState().setToken(access_token)
            useAuthStore.getState().setOrgContext(orgId, orgName)

            // Redirect to dashboard to reset app state and clear any in-memory cache
            window.location.href = '/dashboard'
        } catch (error) {
            console.error('Failed to switch organization context:', error)
        } finally {
            set({ isSwitching: false })
        }
    },

    exitOrg: async () => {
        set({ isSwitching: true })
        try {
            // Handle in frontend itself as no backend route is available
            useAuthStore.getState().setOrgContext(null, null)
            
            // Redirect to organizations management
            window.location.href = '/organizations'
        } catch (error) {
            console.error('Error during frontend exit:', error)
            useAuthStore.getState().setOrgContext(null, null)
            window.location.href = '/organizations'
        } finally {
            set({ isSwitching: false })
        }
    }
}))

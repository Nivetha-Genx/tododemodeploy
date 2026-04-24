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

            // Redirect or reload to reset app state and clear any in-memory cache
            window.location.reload()
        } finally {
            set({ isSwitching: false })
        }
    },

    exitOrg: async () => {
        set({ isSwitching: true })
        try {
            const response = await organizationsApi.exitOrganization()
            const { access_token } = response.data

            // Update auth store
            useAuthStore.getState().setToken(access_token)
            useAuthStore.getState().setOrgContext(null, null)

            window.location.reload()
        } finally {
            set({ isSwitching: false })
        }
    }
}))

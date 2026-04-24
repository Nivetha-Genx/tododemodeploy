import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { authApi } from '@/api/auth'

/**
 * Hook to handle automatic token refresh.
 * It decodes the JWT to find the expiration time and schedules a refresh call
 * before the token expires.
 */
function forceLogoutAndRedirect() {
    useUIStore.getState().closeModal()
    useUIStore.getState().closeTaskDrawer()
    useAuthStore.getState().logout()
    if (window.location.pathname !== '/login') {
        window.location.replace('/login')
    }
}

export function useAuthRefresh() {
    const { token, setToken, isAuthenticated } = useAuthStore()
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const scheduleRefresh = (jwtToken: string) => {
        try {
            // Clear existing timer
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current)
                refreshTimerRef.current = null
            }

            // Decode JWT to get expiration
            const parts = jwtToken.split('.')
            if (parts.length !== 3) return

            const payload = JSON.parse(atob(parts[1]))
            const exp = payload.exp * 1000 // Convert to milliseconds
            const now = Date.now()

            if (exp <= now) {
                console.warn('[AuthRefresh] Token already expired')
                forceLogoutAndRedirect()
                return
            }

            // Refresh 5 minutes before expiration
            // If the token is already very close to expiring, refresh in 10 seconds
            const buffer = 5 * 60 * 1000 // 5 minutes
            const refreshIn = Math.max(10000, exp - now - buffer)

            // If refreshIn is too large for setTimeout (more than 24.8 days), 
            // but our tokens shouldn't be that long.

            refreshTimerRef.current = setTimeout(async () => {
                try {
                    console.log('[AuthRefresh] Refreshing token...')
                    const response = await authApi.refresh()
                    if (response.success) {
                        setToken(response.data.access_token)
                        console.log('[AuthRefresh] Token refreshed successfully')
                    } else {
                        console.error('[AuthRefresh] Token refresh failed:', response.message)
                        forceLogoutAndRedirect()
                    }
                } catch (error) {
                    console.error('[AuthRefresh] Error refreshing token:', error)
                    // If it's a 401, axios interceptor will handle the redirect
                }
            }, refreshIn)
        } catch (error) {
            console.error('[AuthRefresh] Error scheduling token refresh:', error)
        }
    }

    useEffect(() => {
        if (isAuthenticated && token) {
            scheduleRefresh(token)
        } else {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current)
                refreshTimerRef.current = null
            }
        }

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current)
                refreshTimerRef.current = null
            }
        }
    }, [token, isAuthenticated])
}

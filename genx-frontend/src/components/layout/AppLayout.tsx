import { useEffect } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { OrgContextBanner } from '@/components/OrgContextBanner'
import { ModalManager } from '@/components/modals'
import { useUIStore } from '@/stores'
import { Button } from '@/components/ui'
import { Plus } from 'lucide-react'

export function AppLayout() {
    const { theme, openTaskDrawer } = useUIStore()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()

    // Pages where FAB should be visible
    const showFabPaths = [
        '/dashboard',
        '/team-board',
        '/tasks',
        '/projects',
        '/task-templates',
        '/boards',
        '/today',
        '/upcoming',
        '/calendar',
        '/completed',
    ]

    const showCreateTaskFab = showFabPaths.some(path => location.pathname.startsWith(path))

    // Deep link: open TaskDetailDrawer when ?taskId= is present in URL
    useEffect(() => {
        const taskId = searchParams.get('taskId')
        if (taskId) {
            openTaskDrawer(taskId)
            // Remove the param from the URL so it doesn't persist
            const next = new URLSearchParams(searchParams)
            next.delete('taskId')
            setSearchParams(next, { replace: true })
        }
    }, [location.search])

    // Apply theme to document element
    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(theme)
    }, [theme])

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Sidebar - Hidden on mobile */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                <OrgContextBanner />
                <Header />

                <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
                    <Outlet />
                </main>
            </div>

            {/* Mobile FAB - Create Task */}
            {showCreateTaskFab && (
                <div className="md:hidden fixed bottom-20 right-4 z-40">
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-lg bg-brand-600 hover:bg-brand-700 text-white"
                        onClick={() => useUIStore.getState().openModal('createTask')}
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            )}

            {/* Mobile Navigation - Visible only on mobile */}
            <MobileNav />

            {/* Global Modals */}
            <ModalManager />
        </div>
    )
}

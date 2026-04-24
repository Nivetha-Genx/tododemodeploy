import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useOrgSwitchStore } from '@/stores/orgSwitchStore'

export function OrgContextBanner() {
    const { activeOrganizationId, activeOrganizationName } = useAuthStore()
    const { exitOrg, isSwitching } = useOrgSwitchStore()

    if (!activeOrganizationId) return null

    return (
        <div className="bg-brand-600 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-[60] shadow-md animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded-full">
                    <AlertCircle className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium">
                    Viewing as <span className="font-bold border-b border-white/40">{activeOrganizationName}</span> (Organization Context)
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={exitOrg}
                    disabled={isSwitching}
                    className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 px-4 text-xs flex items-center gap-2 border border-white/30"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {isSwitching ? 'Exiting...' : 'Exit Context'}
                </Button>
            </div>
        </div>
    )
}

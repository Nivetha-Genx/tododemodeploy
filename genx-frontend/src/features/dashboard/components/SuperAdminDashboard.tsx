import { useState, useEffect } from 'react'
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Avatar,
    AvatarFallback,
    Badge,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui'
import { CircularProgress } from '@/components/ui/circular-progress'
import {
    Building2,
    Users,
    Plus,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    TrendingUp,
    LayoutDashboard,
    Kanban,
    FileStack
} from 'lucide-react'
import { CreateOrganizationModal } from '@/features/super-admin/components/CreateOrganizationModal'
import { organizationsApi } from '@/api/organizations'
import { formatDate, cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notificationStore'
import { Link } from 'react-router-dom'
import { Organization } from '@/types'

interface OrgStats {
    total: number
    active: number
    inactive: number
}

export function SuperAdminDashboard() {
    const { show } = useNotificationStore()
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
    const [stats, setStats] = useState<OrgStats>({
        total: 0,
        active: 0,
        inactive: 0,
    })

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true)
            const response = await organizationsApi.getAll()
            if (response.success && response.data) {
                const orgs = response.data.map((org: any) => ({
                    ...org,
                    createdAt: org.created_at
                }))
                setOrganizations(orgs)

                const active = orgs.filter((o: any) => o.is_active).length
                const inactive = orgs.length - active

                setStats({
                    total: orgs.length,
                    active,
                    inactive,
                })

                if (orgs.length > 0 && !selectedOrgId) {
                    setSelectedOrgId(orgs[0].id)
                }
            }
        } catch (error) {
            console.error('Failed to fetch super admin dashboard data:', error)
            show({ type: 'error', title: 'Fetch Error', message: 'Failed to load organization data.' })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const activePercentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0
    const inactivePercentage = stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0

    const selectedOrg = organizations.find(o => o.id === selectedOrgId)

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 px-4 lg:px-0 pb-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-brand-50 rounded-xl sm:rounded-2xl shrink-0">
                            <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6 text-brand-600" />
                        </div>
                        <span className="truncate">Super Admin Dashboard</span>
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">
                        Global overview of all organizations and system performance.
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-4 py-2.5 md:py-3 h-auto font-bold shadow-lg shadow-brand-100 w-full md:w-auto transition-all duration-200 active:scale-95 shrink-0"
                >
                    <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                    <span className="text-sm md:text-base whitespace-nowrap">New Tenant</span>
                </Button>
            </div>

            {/* Circular Progress Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {/* Total Organizations */}
                <Card className="bg-white border-slate-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 group">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4 relative z-10">Total Organizations</p>
                    <div className="flex items-center gap-4 relative z-10">
                        <CircularProgress
                            value={100}
                            size={80}
                            strokeWidth={8}
                            color="#4f46e5"
                        >
                            <Building2 className="w-6 h-6 text-indigo-600" />
                        </CircularProgress>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{stats.total}</p>
                            <p className="text-xs font-bold text-slate-400 mt-1">Platform Tenants</p>
                        </div>
                    </div>
                </Card>

                {/* Active Organizations */}
                <Card className="bg-white border-slate-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 group">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-4 relative z-10">Active Status</p>
                    <div className="flex items-center gap-4 relative z-10">
                        <CircularProgress
                            value={activePercentage}
                            size={80}
                            strokeWidth={8}
                            color="#10b981"
                        >
                            <span className="text-sm font-bold text-emerald-600">{activePercentage}%</span>
                        </CircularProgress>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{stats.active}</p>
                            <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Online Now
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Inactive Organizations */}
                <Card className="bg-white border-slate-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 group">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-4 relative z-10">Suspended / Inactive</p>
                    <div className="flex items-center gap-4 relative z-10">
                        <CircularProgress
                            value={inactivePercentage}
                            size={80}
                            strokeWidth={8}
                            color="#f59e0b"
                        >
                            <span className="text-sm font-bold text-amber-600">{inactivePercentage}%</span>
                        </CircularProgress>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{stats.inactive}</p>
                            <p className="text-xs font-bold text-amber-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Needs Review
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Organization Selector & Insights */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1 min-w-0">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-brand-600 shrink-0" />
                        <span className="truncate">Organization Insights</span>
                    </h2>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                        Metrics for the selected entity
                    </p>
                </div>
                <div className="w-full md:w-72 shrink-0">
                    <Select value={selectedOrgId || ''} onValueChange={setSelectedOrgId}>
                        <SelectTrigger className="h-10 md:h-12 rounded-xl md:rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-slate-700 text-xs sm:text-sm">
                            <div className="flex items-center">
                                <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 text-slate-400 shrink-0" />
                                <SelectValue placeholder="Select Organization" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl md:rounded-2xl border-slate-100 shadow-xl">
                            {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id} className="font-bold text-slate-700 py-2 md:py-3 text-xs sm:text-sm">
                                    {org.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Per-Organization Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                <Card className="bg-white border-slate-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 group">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-4">Active Users</p>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-50 rounded-2xl group-hover:bg-brand-100 transition-colors">
                            <Users className="w-6 h-6 text-brand-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{(selectedOrg?.users_count || 0).toLocaleString()}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">Assigned to entity</p>
                        </div>
                    </div>
                </Card>

                <Card className="bg-white border-slate-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 group">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-4">Ongoing Projects</p>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                            <Kanban className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{(selectedOrg?.projects_count || 0).toLocaleString()}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">Active workstreams</p>
                        </div>
                    </div>
                </Card>

                <Card className="bg-white border-slate-100 shadow-sm rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 group">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-4">Tasks Processed</p>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition-colors">
                            <FileStack className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{(selectedOrg?.tasks_count || 0).toLocaleString()}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">Historical volume</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Organizations Table / Grid */}
            <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50/50 p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-base md:text-lg lg:text-xl font-bold text-slate-900 whitespace-nowrap">Recent Organizations</CardTitle>
                        <Link to="/organizations">
                            <Button variant="ghost" className="text-brand-600 font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-brand-50 h-auto py-1 px-3 rounded-lg whitespace-nowrap">
                                View All
                            </Button>
                        </Link>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">Management Overview</p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-50 text-[10px] sm:text-[11px] lg:text-[12px] font-bold uppercase tracking-widest text-slate-400">
                                    <th className="px-4 lg:px-6 py-4">Organization</th>
                                    <th className="px-4 lg:px-6 py-4">Users</th>
                                    <th className="px-4 lg:px-6 py-4">Projects</th>
                                    <th className="px-4 lg:px-6 py-4 text-center">Status</th>
                                    <th className="px-4 lg:px-6 py-4">Created</th>
                                    <th className="px-4 lg:px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {organizations.slice(0, 5).map((org) => (
                                    <tr key={org.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 lg:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-slate-100 bg-white">
                                                    <AvatarFallback className="font-bold text-slate-400 bg-slate-50 text-[10px] sm:text-xs">
                                                        {org.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">{org.name}</p>
                                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate max-w-[100px] lg:max-w-[120px]">{org.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-[9px] sm:text-[10px] lg:text-xs whitespace-nowrap">
                                                {org.users_count} Users
                                            </Badge>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4">
                                            <p className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">{org.projects_count} Projects</p>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-center">
                                            <Badge className={cn(
                                                "rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest px-2.5 sm:px-3 whitespace-nowrap",
                                                org.is_active
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                            )}>
                                                {org.is_active ? 'Active' : 'Suspended'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4">
                                            <p className="text-xs sm:text-sm font-bold text-slate-500 whitespace-nowrap">{formatDate(org.createdAt)}</p>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 text-right">
                                            <Link to={`/organizations`}>
                                                <Button size="sm" variant="ghost" className="rounded-full h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-brand-50 hover:text-brand-600">
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {organizations.length === 0 && !isLoading && (
                        <div className="px-6 py-12 text-center border-t border-slate-50">
                            <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No organizations registered yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tenant Creation Modal */}
            <CreateOrganizationModal
                isOpen={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={fetchDashboardData}
            />
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Building2,
    Settings,
    History,
    ArrowLeft,
    Plus,
    Activity,
    Shield,
    Calendar,
    Briefcase
} from 'lucide-react'
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Badge,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Separator,
    Label
} from '@/components/ui'
import { formatDate, cn } from '@/lib/utils'
import { organizationsApi } from '@/api/organizations'
import { useNotificationStore } from '@/stores/notificationStore'
import { useOrgSwitchStore } from '@/stores/orgSwitchStore'
import { PageSkeleton } from '@/components/ui/modal-skeleton'

export function OrganizationDetailPage() {
    const { orgId } = useParams<{ orgId: string }>()
    const navigate = useNavigate()
    const { show } = useNotificationStore()
    const { switchOrg, isSwitching } = useOrgSwitchStore()

    const [org, setOrg] = useState<any>(null)
    const [admins, setAdmins] = useState<any[]>([])
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')

    useEffect(() => {
        if (orgId) {
            fetchData()
        }
    }, [orgId])

    const fetchData = async () => {
        try {
            setIsLoading(true)
            const [orgRes, adminsRes, logsRes] = await Promise.all([
                organizationsApi.getById(orgId!),
                organizationsApi.getAdmins(orgId!),
                organizationsApi.getAuditLogs(orgId!)
            ])
            setOrg(orgRes.data)
            setAdmins(adminsRes.data)
            setAuditLogs(logsRes.data.data) // Pagination data structure
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Load Failed',
                message: 'Failed to fetch organization details.'
            })
            navigate('/organizations')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSwitch = async () => {
        if (!org) return
        try {
            await switchOrg(org.id, org.name)
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Switch Failed',
                message: error.response?.data?.message || 'Failed to switch context.'
            })
        }
    }

    if (isLoading) {
        return <PageSkeleton />
    }

    if (!org) return null

    return (
        <div className="container py-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/organizations')} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Avatar className="w-16 h-16 border rounded-xl bg-white">
                        <AvatarImage src={org.logo} />
                        <AvatarFallback className="rounded-xl"><Building2 className="w-8 h-8 text-gray-400" /></AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={org.is_active ? 'secondary' : 'destructive'} className={cn(org.is_active ? "bg-emerald-50 text-emerald-700" : "")}>
                                {org.is_active ? 'Active' : 'Suspended'}
                            </Badge>
                            <span className="text-xs text-gray-500">ID: {org.id}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleSwitch}
                        disabled={isSwitching}
                        className="bg-brand-600 hover:bg-brand-700 text-white rounded-full px-6"
                    >
                        {isSwitching ? 'Switching...' : 'Switch to Organization'}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-gray-100/50 p-1 rounded-xl w-full md:w-auto h-auto grid grid-cols-2 md:inline-flex">
                    <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
                        <Activity className="w-4 h-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="admins" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
                        <Shield className="w-4 h-4 mr-2" />
                        Admins
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium">
                        <History className="w-4 h-4 mr-2" />
                        Audit Logs
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="col-span-1 md:col-span-2 shadow-sm border-gray-100 transition-all hover:shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">About Organization</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Slug</p>
                                            <p className="font-medium">{org.slug}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Created Date</p>
                                            <p className="font-medium">{formatDate(org.created_at)}</p>
                                        </div>
                                    </div>
                                    <Separator className="bg-gray-50" />
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Description</p>
                                        <p className="text-gray-700 leading-relaxed text-sm">
                                            {org.description || 'No description provided for this organization.'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-gray-100 transition-all hover:shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">Live Statistics</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 text-sm">Total Users</span>
                                        <Badge variant="outline" className="font-bold">{org.users_count || 0}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 text-sm">Total Projects</span>
                                        <Badge variant="outline" className="font-bold">{org.projects_count || 0}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 text-sm">Total Tasks</span>
                                        <Badge variant="outline" className="font-bold">{org.tasks_count || 0}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="admins">
                        <Card className="shadow-sm border-gray-100">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold">Administrator Accounts</CardTitle>
                                    <CardDescription>Primary users with full control over this tenant.</CardDescription>
                                </div>
                                <Button size="sm" className="bg-brand-600 hover:bg-brand-700 rounded-full h-9 flex items-center">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Admin
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {admins.map((admin) => (
                                        <div key={admin.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/30 group hover:border-brand-200 hover:bg-white transition-all">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-white shadow-sm">
                                                    <AvatarFallback className="bg-brand-50 text-brand-700 font-bold uppercase">{admin.name.substring(0, 2)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{admin.name}</p>
                                                    <p className="text-xs text-gray-500">{admin.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-full">
                                                    Reset Password
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full">
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {admins.length === 0 && (
                                        <div className="text-center py-8">
                                            <Shield className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                            <p className="text-gray-500">No administrators found.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card className="shadow-sm border-gray-100">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold">Organization Configuration</CardTitle>
                                <CardDescription>Policy and regional settings for this organization.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <Briefcase className="w-4 h-4 text-brand-600" />
                                            Working Hours Policy
                                        </Label>
                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                            <p className="text-xl font-bold text-gray-900">{org.settings_relation?.expected_hours_per_day || 0} hrs/day</p>
                                            <p className="text-xs text-gray-500 mt-1">Expected work duration for all members</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <Calendar className="w-4 h-4 text-brand-600" />
                                            Active Work Days
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {(org.settings_relation?.working_days || []).map((day: string) => (
                                                <Badge key={day} variant="secondary" className="px-3 py-1 bg-white border shadow-sm">
                                                    {day}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="audit">
                        <Card className="shadow-sm border-gray-100">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold">Activity Timeline</CardTitle>
                                <CardDescription>System-level audit trail for this organization.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                                    {auditLogs.map((log) => (
                                        <div key={log.id} className="relative pl-12">
                                            <div className="absolute left-4 top-1 w-4 h-4 rounded-full border-2 border-white bg-brand-500 shadow-sm z-10" />
                                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight bg-gray-100 text-gray-600">
                                                        {log.event_type.replace(/_/g, ' ')}
                                                    </Badge>
                                                    <span className="text-[10px] text-gray-400">{formatDate(log.created_at)}</span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    Performed by <span className="text-brand-600 underline underline-offset-4 decoration-brand-200">{log.user?.name || 'System'}</span>
                                                </p>
                                                {log.payload && (
                                                    <pre className="mt-2 p-2 rounded-lg bg-gray-50 text-[10px] text-gray-500 font-mono overflow-auto max-h-24">
                                                        {JSON.stringify(log.payload, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500">No activity logs found.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}

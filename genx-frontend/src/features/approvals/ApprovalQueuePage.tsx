import { useState, useEffect } from 'react'
import { tasksApi } from '@/api/tasks'
import { organizationsApi } from '@/api/organizations'
import { extraHoursApi } from '@/api/extra-hours'
import { useTaskUIStore, useAuthStore, useUIStore } from '@/stores'
import {
    Card,
    CardContent,
    Button,
    Badge,
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/components/ui'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, formatHoursMinutes } from '@/lib/utils'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { Clock, CheckCircle, XCircle, Calendar, Loader2, History } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { UserAvatar } from '@/components/UserAvatar'

interface DueDateRequest {
    id: string
    task_id: string
    requester_id: string
    status: 'pending' | 'approved' | 'rejected'
    current_due_date: string
    proposed_due_date: string
    reason: string
    created_at: string
    task: {
        title: string
        task_id: string
        assignee_avatar?: string
        assignee_avatar_url?: string
    }
    requester: {
        name: string
        id: string
        avatar?: string
        avatar_url?: string
    }
}

interface ExtraHourRequest {
    id: string
    task_id: string
    user_id: string
    start_time: string
    end_time: string
    duration_seconds: number
    notes: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    user: {
        name: string
        id: string
        avatar_url?: string
    }
    task: {
        title: string
        id: string
    }
}

export function ApprovalQueuePage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState<'due-dates' | 'extra-hours'>((searchParams.get('tab') as any) || 'due-dates')
    const [requests, setRequests] = useState<DueDateRequest[]>([])
    const [extraHours, setExtraHours] = useState<ExtraHourRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [canAct, setCanAct] = useState(false)
    const [slaHours, setSlaHours] = useState<number | null>(null)
    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer } = useUIStore()
    const { user } = useAuthStore()
    const { toast } = useToast()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [currentAction, setCurrentAction] = useState<'approving' | 'rejecting' | null>(null)

    const fetchRequests = async () => {
        try {
            const data = await tasksApi.getPendingRequests()
            setRequests(data.data)
        } catch (error) {
            console.error('Failed to fetch requests', error)
        }
    }

    const fetchExtraHours = async () => {
        try {
            const response = await extraHoursApi.getPending()
            setExtraHours(response.data)
        } catch (error) {
            console.error('Failed to fetch extra hours', error)
        }
    }

    const loadAll = async () => {
        setLoading(true)
        await Promise.all([fetchRequests(), fetchExtraHours()])
        setLoading(false)
    }

    useEffect(() => {
        loadAll()
    }, [])

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab === 'extra-hours' || tab === 'due-dates') {
            setActiveTab(tab)
        }
    }, [searchParams])

    const handleTabChange = (value: string) => {
        setActiveTab(value as any)
        setSearchParams({ tab: value })
    }

    // Refresh when a task is updated
    useEffect(() => {
        const handleTaskUpdated = () => loadAll()
        window.addEventListener('task-updated', handleTaskUpdated)
        return () => window.removeEventListener('task-updated', handleTaskUpdated)
    }, [])

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await organizationsApi.getSettings()
                const payload = res?.data ?? res
                const settings = payload?.data ?? payload
                if (settings) {
                    const approverSetting: string = settings.due_date_approvers ?? 'admin'
                    const role = user?.role
                    const isSuperAdmin = role === 'super_admin'
                    const isAdmin = role === 'admin'
                    const isLead = role === 'team_lead'

                    let allowed = false
                    if (isSuperAdmin) {
                        allowed = true
                    } else if (approverSetting === 'admin') {
                        allowed = isAdmin
                    } else if (approverSetting === 'lead') {
                        allowed = isLead
                    } else if (approverSetting === 'both') {
                        allowed = isAdmin || isLead
                    }
                    setCanAct(!!allowed)

                    const rawSla = settings.sla_duration_hours ?? settings.slaDurationHours
                    if (rawSla !== undefined && rawSla !== null) {
                        const n = typeof rawSla === 'number' ? rawSla : parseInt(String(rawSla), 10)
                        if (!Number.isNaN(n) && n > 0) {
                            setSlaHours(n)
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load organization settings for approvals', e)
            }
        }
        if (user) {
            loadSettings()
        }
    }, [user])

    const handleApprove = async (id: string, type: 'due-date' | 'extra-hour') => {
        setProcessingId(id)
        setCurrentAction('approving')
        try {
            if (type === 'due-date') {
                const response = await tasksApi.approveDueDateRequest(id)
                toast({ title: 'Request Approved', description: response.message, variant: 'success' })
                await fetchRequests()
            } else {
                const response = await extraHoursApi.approve(id)
                toast({ title: 'Extra Hours Approved', description: response.message || 'The request has been approved.', variant: 'success' })
                await fetchExtraHours()
            }
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Action failed.'
            toast({ title: 'Action Failed', description: errorMessage, variant: 'destructive' })
        } finally {
            setProcessingId(null)
            setCurrentAction(null)
        }
    }

    const handleReject = async (id: string, type: 'due-date' | 'extra-hour') => {
        setProcessingId(id)
        setCurrentAction('rejecting')
        try {
            if (type === 'due-date') {
                const response = await tasksApi.rejectDueDateRequest(id)
                toast({ title: 'Request Rejected', description: response.message, variant: 'success' })
                await fetchRequests()
            } else {
                const response = await extraHoursApi.reject(id)
                toast({ title: 'Extra Hours Rejected', description: response.message || 'The request has been rejected.', variant: 'success' })
                await fetchExtraHours()
            }
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Action failed.'
            toast({ title: 'Action Failed', description: errorMessage, variant: 'destructive' })
        } finally {
            setProcessingId(null)
            setCurrentAction(null)
        }
    }

    if (loading) {
        return <PageSkeleton />
    }

    const currentRequests = activeTab === 'due-dates' ? requests : extraHours

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-brand-600" />
                        Approval Queue
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Manage and review pending requests
                    </p>
                </div>
                {currentRequests.length > 0 && (
                    <Badge variant="outline" className="bg-white/80 backdrop-blur-sm bg-amber-100 text-amber-700 border-amber-300 py-1.5 px-3 rounded-full font-bold uppercase tracking-wider text-[10px] shadow-sm">
                        {currentRequests.length} Pending
                    </Badge>
                )}
            </div>

            <div className="flex justify-start mt-3 mb-1">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
                    <TabsList className="bg-gray-100/80 backdrop-blur-sm h-9 p-1 rounded-full border border-gray-200/50 shadow-sm">
                        <TabsTrigger
                            value="due-dates"
                            className="text-xs uppercase font-bold tracking-wider rounded-full px-5 py-2 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                        >
                            Due Dates ({requests.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="extra-hours"
                            className="text-xs uppercase font-bold tracking-wider rounded-full px-5 py-2 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                        >
                            Extra Hours ({extraHours.length})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="mt-2">
                <div className="min-w-0">
                    {currentRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300 ring-8 ring-gray-50/50">
                                {activeTab === 'due-dates' ? <CheckCircle className="w-10 h-10" /> : <History className="w-10 h-10" />}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Queue Cleared</h3>
                            <p className="text-gray-500 mt-2 font-medium">
                                Everything is up to date! There are no {activeTab === 'due-dates' ? 'due date change' : 'extra log hours'} requests waiting for approval.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 pb-10">
                            {activeTab === 'due-dates' ? (
                                (requests as DueDateRequest[]).map((request) => (
                                    <Card key={request.id} className="glass-card border-none overflow-hidden shadow-sm hover:shadow-xl hover:shadow-brand-100/30 transition-all duration-500 group rounded-3xl border border-gray-100/50 bg-white/70 backdrop-blur-md">
                                        <CardContent className="p-0">
                                            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                                                <div className="flex-1 p-4 sm:p-5.5 space-y-3.5 sm:space-y-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-300 font-bold text-[10px] uppercase px-3 py-1 rounded-md">
                                                                Due Date Extension
                                                            </Badge>
                                                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                Requested {formatDate(request.created_at)}
                                                            </div>
                                                        </div>
                                                        {slaHours !== null && (
                                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-100 uppercase tracking-tight">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                SLA: {slaHours}h
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2.5">
                                                        <h3
                                                            className="font-bold text-xl text-gray-900 cursor-pointer hover:text-brand-600 transition-colors leading-tight"
                                                            onClick={() => {
                                                                selectTask(request.task_id)
                                                                openTaskDrawer(request.task_id)
                                                            }}
                                                        >
                                                            {request.task.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2.5">
                                                            <UserAvatar
                                                                user={{
                                                                    id: request.requester.id,
                                                                    name: request.requester.name,
                                                                    avatar: request.requester.avatar,
                                                                    avatar_url: request.requester.avatar_url
                                                                }}
                                                                className="h-5 w-5 ring-2 ring-white shadow-sm"
                                                            />
                                                            <p className="text-sm text-black font-bold">
                                                                {request.requester.name} <span className="text-gray-500 font-normal ml-0.5 whitespace-nowrap">requested extension</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="p-3 bg-slate-50/50 rounded-2xl border border-gray-100 transition-all group-hover:bg-white group-hover:shadow-md">
                                                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1 flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3" />
                                                                Current Date
                                                            </p>
                                                            <div className="flex items-center gap-2 text-sm text-gray-700 font-bold">
                                                                {request.current_due_date ? formatDate(request.current_due_date) : 'No date set'}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-brand-50/30 rounded-2xl border border-brand-100 transition-all group-hover:bg-white group-hover:shadow-md">
                                                            <p className="text-[9px] text-brand-600 uppercase font-black tracking-widest mb-1 flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3" />
                                                                Proposed Date
                                                            </p>
                                                            <div className="flex items-center gap-2 text-sm text-brand-700 font-black">
                                                                {formatDate(request.proposed_due_date)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 relative">
                                                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest ml-1">Extension Reason</p>
                                                        <div className="p-3.5 border border-gray-100 rounded-2xl bg-white/60 text-xs sm:text-sm text-gray-600 italic leading-snug shadow-sm relative overflow-hidden">
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
                                                            &ldquo;{request.reason}&rdquo;
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full lg:w-72 p-4 sm:p-5 lg:p-6 bg-gray-50/30 flex flex-col justify-center gap-3 shrink-0 transition-colors group-hover:bg-brand-50/20">
                                                    {canAct ? (
                                                        <div className="flex flex-col gap-2.5">
                                                            <Button
                                                                onClick={() => handleApprove(request.id, 'due-date')}
                                                                disabled={processingId === request.id}
                                                                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black h-10 rounded-2xl shadow-lg shadow-brand-100 transition-all active:scale-[0.98] gap-3 uppercase tracking-wider text-xs"
                                                            >
                                                                {processingId === request.id && currentAction === 'approving' ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="w-5 h-5" />
                                                                )}
                                                                {processingId === request.id && currentAction === 'approving' ? 'Approving...' : 'Approve Extension'}
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleReject(request.id, 'due-date')}
                                                                disabled={processingId === request.id}
                                                                variant="outline"
                                                                className="w-full border-red-200 text-red-600 hover:bg-red-50 font-black h-10 rounded-2xl transition-all active:scale-[0.98] gap-3 uppercase tracking-wider text-xs bg-white shadow-sm"
                                                            >
                                                                {processingId === request.id && currentAction === 'rejecting' ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <XCircle className="w-5 h-5" />
                                                                )}
                                                                {processingId === request.id && currentAction === 'rejecting' ? 'Rejecting...' : 'Reject Extension'}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 shadow-sm">
                                                            <p className="text-[11px] text-amber-700 font-bold leading-normal">
                                                                Administrative permissions required
                                                            </p>
                                                        </div>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        className="w-full border-brand-100 bg-white text-brand-600 hover:bg-brand-50 hover:text-brand-700 font-black text-[9px] uppercase tracking-widest h-10 transition-all rounded-2xl shadow-sm hover:shadow-md"
                                                        onClick={() => {
                                                            selectTask(request.task_id)
                                                            openTaskDrawer(request.task_id)
                                                        }}
                                                    >
                                                        View Task Context
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                (extraHours as ExtraHourRequest[]).map((request) => (
                                    <Card key={request.id} className="glass-card border-none overflow-hidden shadow-sm hover:shadow-xl hover:shadow-brand-100/30 transition-all duration-500 group rounded-3xl border border-gray-100/50 bg-white/70 backdrop-blur-md">
                                        <CardContent className="p-0">
                                            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                                                <div className="flex-1 p-4 sm:p-5.5 space-y-3.5 sm:space-y-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-bold text-[10px] uppercase px-3 py-1 rounded-md">
                                                                Extra Log Hours
                                                            </Badge>
                                                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Requested {formatDate(request.created_at)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2.5">
                                                        <h3
                                                            className="font-bold text-xl text-gray-900 cursor-pointer hover:text-brand-600 transition-colors leading-tight"
                                                            onClick={() => {
                                                                selectTask(request.task_id)
                                                                openTaskDrawer(request.task_id)
                                                            }}
                                                        >
                                                            {request.task.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2.5">
                                                            <UserAvatar
                                                                user={{
                                                                    id: request.user_id,
                                                                    name: request.user.name,
                                                                    avatar_url: request.user.avatar_url
                                                                }}
                                                                className="h-5 w-5 ring-2 ring-white shadow-sm"
                                                            />
                                                            <p className="text-sm text-black font-bold">
                                                                {request.user.name} <span className="text-gray-500 font-normal ml-0.5 whitespace-nowrap">requested extra hours</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="p-3 bg-slate-50/50 rounded-2xl border border-gray-100 transition-all group-hover:bg-white group-hover:shadow-md">
                                                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1 flex items-center gap-1.5">
                                                                <History className="w-3 h-3" />
                                                                Work Period
                                                            </p>
                                                            <div className="flex items-center gap-2 text-sm text-gray-700 font-bold">
                                                                {formatDate(request.start_time)} - {formatDate(request.end_time)}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-brand-50/30 rounded-2xl border border-brand-100 transition-all group-hover:bg-white group-hover:shadow-md">
                                                            <p className="text-[9px] text-brand-600 uppercase font-black tracking-widest mb-1 flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3" />
                                                                Duration
                                                            </p>
                                                            <div className="flex items-center gap-2 text-sm text-brand-700 font-black">
                                                                {formatHoursMinutes(request.duration_seconds / 3600)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 relative">
                                                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest ml-1">Notes</p>
                                                        <div className="p-3.5 border border-gray-100 rounded-2xl bg-white/60 text-xs sm:text-sm text-gray-600 italic leading-snug shadow-sm relative overflow-hidden">
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
                                                            &ldquo;{request.notes || 'No notes provided'}&rdquo;
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full lg:w-72 p-4 sm:p-5 lg:p-6 bg-gray-50/30 flex flex-col justify-center gap-3 shrink-0 transition-colors group-hover:bg-brand-50/20">
                                                    {canAct ? (
                                                        <div className="flex flex-col gap-2.5">
                                                            <Button
                                                                onClick={() => handleApprove(request.id, 'extra-hour')}
                                                                disabled={processingId === request.id}
                                                                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black h-10 rounded-2xl shadow-lg shadow-brand-100 transition-all active:scale-[0.98] gap-3 uppercase tracking-wider text-xs"
                                                            >
                                                                {processingId === request.id && currentAction === 'approving' ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="w-5 h-5" />
                                                                )}
                                                                {processingId === request.id && currentAction === 'approving' ? 'Approving...' : 'Approve Hours'}
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleReject(request.id, 'extra-hour')}
                                                                disabled={processingId === request.id}
                                                                variant="outline"
                                                                className="w-full border-red-200 text-red-600 hover:bg-red-50 font-black h-10 rounded-2xl transition-all active:scale-[0.98] gap-3 uppercase tracking-wider text-xs bg-white shadow-sm"
                                                            >
                                                                {processingId === request.id && currentAction === 'rejecting' ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <XCircle className="w-5 h-5" />
                                                                )}
                                                                {processingId === request.id && currentAction === 'rejecting' ? 'Rejecting...' : 'Reject Hours'}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 shadow-sm">
                                                            <p className="text-[11px] text-amber-700 font-bold leading-normal">
                                                                Administrative permissions required
                                                            </p>
                                                        </div>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        className="w-full border-brand-100 bg-white text-brand-600 hover:bg-brand-50 hover:text-brand-700 font-black text-[9px] uppercase tracking-widest h-10 transition-all rounded-2xl shadow-sm hover:shadow-md"
                                                        onClick={() => {
                                                            selectTask(request.task_id)
                                                            openTaskDrawer(request.task_id)
                                                        }}
                                                    >
                                                        View Task Context
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    )
}


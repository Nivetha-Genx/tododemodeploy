import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSockets } from '@/hooks/useWebSockets'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { projectsApi, mapBackendProjectToFrontend } from '@/api/projects'
import { ProjectWithStats } from '@/api/projects'
import { Task } from '@/types'
import {
    Card,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui'
import { UserAvatar } from '@/components/UserAvatar'
import {
    Settings,
    BarChart3,
    ListTodo,
    UserPlus,
    Users,
    LayoutDashboard,
    Kanban,
    Activity,
    Plus,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react'
import { TaskRowCard } from '@/components/tasks/TaskRowCard'
import { BoardView } from './components/BoardView'
import { AnalyticsView } from './components/AnalyticsView'
import { getInitials, formatDate, getRandomColor, getRandomIcon } from '@/lib/utils'
import { useUIStore, useAuthStore, getAccessLevel, isAdmin, isTeamLead } from '@/stores'
import { ProjectDetailSkeleton, ListSkeleton, ActivitySkeleton } from '@/components/ui/modal-skeleton'


export function ProjectDetailPage() {
    const { projectId } = useParams()
    const { openModal, openTaskDrawer } = useUIStore()
    const { user, can } = useAuthStore()
    const [project, setProject] = useState<ProjectWithStats | undefined>(undefined)
    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingTasks, setIsLoadingTasks] = useState(false)
    const [tasksCurrentPage, setTasksCurrentPage] = useState(1)
    const [tasksPagination, setTasksPagination] = useState({ last_page: 1, total: 0 })
    const tasksPerPage = 10

    const [activitiesDialogOpen, setActivitiesDialogOpen] = useState(false)
    const [activities, setActivities] = useState<any[]>([])
    const [isLoadingActivities, setIsLoadingActivities] = useState(false)
    const [activitiesCurrentPage, setActivitiesCurrentPage] = useState(1)
    const [activitiesLastPage, setActivitiesLastPage] = useState(1)
    const [activitiesTotal, setActivitiesTotal] = useState(0)
    const [activitiesAssigneeName, setActivitiesAssigneeName] = useState('')
    const activitiesPerPage = 20

    const activitiesFilterMembers = (project?.projectMembers || [])
        .map((pm) => pm?.user)
        .filter(Boolean)

    const formatActivityText = (activity: any) => {
        const actorName = activity?.user?.name || 'Someone'
        const type = activity?.type
        const entityType = activity?.entity_type
        const payload = activity?.payload || {}

        const getTaskInfo = () => {
            const fromTaskObj = activity?.task || payload?.task || payload?.new || payload?.old
            const title = fromTaskObj?.title
            return { title: title || 'a task' }
        }

        const { title } = getTaskInfo()

        const Actor = <span className="font-semibold text-gray-900 whitespace-nowrap">{actorName}</span>
        const TaskLink = <span className="text-gray-900 hover:text-gray-700 cursor-pointer transition-colors tracking-tight text-[13px] font-bold">{title}</span>
        const Connector = ({ children }: { children: string }) => <span className="text-black font-normal lowercase text-[13px] tracking-wide">{children}</span>

        if ((type === 'created' || type === 'task_created') && entityType === 'task') {
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <Connector>created task</Connector> {TaskLink}
                </div>
            )
        }

        if (type === 'updated' && entityType === 'task') {
            const oldTitle = payload?.old?.title
            const newTitle = payload?.new?.title

            if (oldTitle && newTitle && oldTitle !== newTitle) {
                return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {Actor} <Connector>renamed task from</Connector> <span className="text-black font-medium italic">"{oldTitle}"</span> <Connector>to</Connector> <span className="font-semibold text-gray-900">"{newTitle}"</span>
                    </div>
                )
            }

            if (payload?.new && payload?.old) {
                const changes = []
                if (payload.new.status_id !== payload.old.status_id) changes.push('status')
                if (payload.new.priority !== payload.old.priority) changes.push('priority')
                if (payload.new.estimated_hours !== payload.old.estimated_hours) changes.push('estimated hours')

                if (changes.length > 0) {
                    return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {Actor} <Connector>updated</Connector>
                            <span className="bg-gray-100/80 text-black px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-200 uppercase tracking-widest">
                                {changes.join(', ')}
                            </span>
                            <Connector>of task</Connector> {TaskLink}
                        </div>
                    )
                }
            }

            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <Connector>updated task</Connector> {TaskLink}
                </div>
            )
        }

        if (type === 'attachment_uploaded' || type === 'attachment_created') {
            const filename = payload?.filename || 'a file'
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <Connector>uploaded</Connector>
                    <span className=" text-black py-0.5 text-[12px] font-bold italic">
                        {filename}
                    </span>
                    <Connector>to task</Connector> {TaskLink}
                </div>
            )
        }

        if (type === 'attachment_deleted') {
            const filename = payload?.filename || 'a file'
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <Connector>deleted attachment</Connector>
                    <span className=" text-black py-0.5 text-[12px] font-bold italic">
                        {filename}
                    </span>
                    <Connector>from task</Connector> {TaskLink}
                </div>
            )
        }

        if (type === 'time_logged') {
            const seconds = payload?.duration_seconds || 0
            const hours = Math.round(seconds / 3600 * 10) / 10
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <Connector>logged</Connector>
                    <span className="bg-gray-100 text-black font-bold px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                        {hours}h
                    </span>
                    <Connector>on task</Connector> {TaskLink}
                </div>
            )
        }

        if (type === 'member_added') {
            const memberName = payload?.member?.name || payload?.added_member?.name || payload?.member_user?.name
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <Connector>added</Connector> <span className="font-semibold text-gray-900">{memberName || 'a member'}</span> <Connector>to the project</Connector>
                </div>
            )
        }

        if (type === 'member_removed') {
            const memberName = payload?.member?.name || payload?.removed_member?.name || payload?.member_user?.name
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <Connector>removed</Connector> <span className="font-semibold text-gray-900">{memberName || 'a member'}</span> <Connector>from the project</Connector>
                </div>
            )
        }

        if (type === 'created' && entityType === 'project') {
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <span className="text-black font-semibold italic text-[13px]">created the project</span>
                </div>
            )
        }

        if (type === 'project_updated' || (type === 'updated' && entityType === 'project')) {
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Actor} <Connector>updated the project</Connector>
                </div>
            )
        }

        return (
            <div className="flex items-center gap-1.5 flex-wrap">
                {Actor} <span className="text-black text-[13px] italic">performed an action</span>
            </div>
        )
    }

    const fetchActivities = async (page = 1, assigneeName?: string) => {
        if (!projectId) return
        try {
            setIsLoadingActivities(true)
            const effectiveAssigneeName = assigneeName ?? activitiesAssigneeName
            const res = await projectsApi.getActivities(projectId, {
                per_page: activitiesPerPage,
                page,
                ...(effectiveAssigneeName ? { assignee_name: effectiveAssigneeName } : {}),
            })

            // Accept both shapes:
            // 1) { success, data: { data: [], meta: {} } }
            // 2) { data: { data: [], meta: {} } }
            const root = (res as any)?.data ? (res as any).data : (res as any)
            const dataContainer = root?.data || root
            const dataArr = Array.isArray(dataContainer?.data) ? dataContainer.data : (Array.isArray(dataContainer) ? dataContainer : [])
            const meta = dataContainer?.meta || root?.meta || {}

            setActivities(dataArr)
            setActivitiesCurrentPage(meta.current_page || page)
            setActivitiesLastPage(meta.last_page || 1)
            setActivitiesTotal(meta.total || dataArr.length)
        } catch (error) {
            console.error('Failed to fetch activities:', error)
        } finally {
            setIsLoadingActivities(false)
        }
    }

    useEffect(() => {
        if (activitiesDialogOpen) {
            setActivitiesCurrentPage(1)
            fetchActivities(1)
        }
    }, [activitiesDialogOpen])

    useEffect(() => {
        if (activitiesDialogOpen) {
            fetchActivities(activitiesCurrentPage)
        }
    }, [activitiesCurrentPage])

    useEffect(() => {
        if (!activitiesDialogOpen) return

        // Reset to first page when filter changes
        if (activitiesCurrentPage !== 1) {
            setActivitiesCurrentPage(1)
            return
        }

        fetchActivities(1)
    }, [activitiesAssigneeName])

    // Check if current user can manage this project (owner, admin, or team_lead)
    const canManageProject = () => {
        if (!user || !project) return false

        // Check if user is the project owner
        if (project.leadId === user.id) return true

        // Check if user is project member with owner role
        const userMembership = project.projectMembers?.find(m => m.userId === user.id)
        if (userMembership?.role === 'owner') return true

        // Check if user has org-level admin/team_lead access or projects.edit permission
        const accessLevel = getAccessLevel(user)
        if (isAdmin(accessLevel) || isTeamLead(accessLevel)) return true
        if (can('projects.edit')) return true

        return false
    }

    const fetchTasks = async (page = 1, isSilent = false) => {
        if (!projectId) return
        try {
            if (!isSilent) setIsLoadingTasks(true)
            const tasksRes = await tasksApi.getAll({
                project_id: projectId,
                page: page,
                per_page: tasksPerPage
            })

            if (tasksRes.data) {
                const payload = tasksRes.data
                const dataArr = Array.isArray(payload) ? payload : (payload.data || [])
                setTasks(dataArr.map(mapBackendTaskToFrontend))

                const meta = payload.meta || tasksRes.meta
                if (meta) {
                    setTasksPagination({
                        last_page: meta.last_page || 1,
                        total: meta.total || dataArr.length
                    })
                }
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error)
        } finally {
            if (!isSilent) setIsLoadingTasks(false)
        }
    }

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return
            try {
                setIsLoading(true)
                const projectRes = await projectsApi.getById(projectId)
                if (projectRes.data) {
                    setProject(mapBackendProjectToFrontend(projectRes.data))
                }
            } catch (error) {
                console.error('Failed to fetch project:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProject()
        fetchTasks(tasksCurrentPage)
    }, [projectId, tasksCurrentPage])

    // Real-time updates via WebSockets
    useWebSockets(null, projectId)

    useEffect(() => {
        const handleRefresh = async () => {
            if (projectId) {
                await fetchTasks(tasksCurrentPage, true)
            }
        }
        const handleProjectUpdated = async () => {
            // Refresh project data when updated
            if (projectId) {
                try {
                    const projectRes = await projectsApi.getById(projectId)
                    if (projectRes.data) {
                        setProject(mapBackendProjectToFrontend(projectRes.data))
                    }
                } catch (error) {
                    console.error('Failed to refresh project:', error)
                }
            }
        }
        window.addEventListener('task-created', handleRefresh)
        window.addEventListener('task-updated', handleRefresh)
        window.addEventListener('project-updated', handleProjectUpdated)
        return () => {
            window.removeEventListener('task-created', handleRefresh)
            window.removeEventListener('task-updated', handleRefresh)
            window.removeEventListener('project-updated', handleProjectUpdated)
        }
    }, [projectId])

    if (isLoading) {
        return <ProjectDetailSkeleton />
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
                <p className="text-black">The project you're looking for doesn't exist.</p>
            </div>
        )
    }

    const colorClass = getRandomColor(project.id)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm overflow-hidden ${project.icon ? 'bg-gray-100' : colorClass}`}>
                        {project.icon ? (
                            <img src={project.icon} alt={project.name} className="w-full h-full object-cover" />
                        ) : (
                            (() => {
                                const Icon = getRandomIcon(project.id)
                                return <Icon className="w-6 h-6" />
                            })()
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                        <p className="text-black flex items-center gap-2 mt-1 text-sm">
                            <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-[10px] font-bold border border-brand-100 uppercase tracking-widest shadow-sm">
                                {project.status}
                            </span>
                            <span>• Created {formatDate(project.createdAt)}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap lg:justify-end ml-0 lg:ml-auto">
                    <div className="flex -space-x-2 shrink-0">
                        {project.projectMembers ? (
                            project.projectMembers.slice(0, 5).map((member) => (
                                <Tooltip key={member.id}>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-default">
                                            <UserAvatar
                                                user={member.user}
                                                className="w-8 h-8 border-2 border-white"
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{member.user?.name || 'Unknown User'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))
                        ) : (
                            project.memberIds.slice(0, 5).map((userId) => (
                                <Tooltip key={userId}>
                                    <TooltipTrigger asChild>
                                        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600 cursor-default">
                                            {getInitials(userId)}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{userId}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))
                        )}
                        {(project.projectMembers?.length || 0) > 5 && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-medium text-gray-500">
                                +{(project.projectMembers?.length || 0) - 5}
                            </div>
                        )}
                        {canManageProject() && (
                            <button
                                onClick={() => openModal('inviteMember', { projectId: project.id })}
                                className="w-8 h-8 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 hover:border-gray-400 transition-colors"
                                title="Invite Member"
                            >
                                <UserPlus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => openModal('createTask', { projectId: project.id })}
                            className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm whitespace-nowrap shrink-0"
                        >
                            <Plus className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                            Create Task
                        </Button>
                        {canManageProject() && (
                            <Button variant="outline" className='bg-white text-gray-600 hover:bg-brand-50 hover:text-brand-600 border-brand-100 hover:border-brand-300 shrink-0 whitespace-nowrap' onClick={() => openModal('projectSettings', { projectId: project.id })}>
                                <Settings className="w-4 h-4 md:mr-2 shrink-0" />
                                <span className="hidden md:inline">Settings</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <div className="w-full overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
                    <TabsList className="bg-white/50 p-1 rounded-2xl sm:rounded-full border border-gray-200/50 inline-flex flex-nowrap h-auto gap-1 sm:gap-1 shadow-sm w-max sm:w-auto">
                        <TabsTrigger
                            value="overview"
                            className="px-3 sm:px-4 py-2 rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <LayoutDashboard className="w-4 h-4 hidden sm:block" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger
                            value="tasks"
                            className="px-3 sm:px-4 py-2 rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <ListTodo className="w-4 h-4 hidden sm:block" />
                            Tasks
                        </TabsTrigger>
                        <TabsTrigger
                            value="board"
                            className="px-3 sm:px-4 py-2 rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <Kanban className="w-4 h-4 hidden sm:block" />
                            Board
                        </TabsTrigger>
                        <TabsTrigger
                            value="analytics"
                            className="px-3 sm:px-4 py-2 rounded-full bg-transparent data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <BarChart3 className="w-4 h-4 hidden sm:block" />
                            Analytics
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="p-6">
                                <h3 className="font-semibold text-lg mb-4">Description</h3>
                                <p className="text-black leading-relaxed">
                                    {project.description}
                                </p>
                            </Card>

                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-6 bg-brand-600 rounded-full" />
                                        <h3 className="font-semibold text-lg">Recent Activities</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs font-semibold text-gray-500 border border-brand-200 rounded-full hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                        onClick={() => setActivitiesDialogOpen(true)}
                                    >
                                        View all
                                    </Button>
                                </div>
                                {project.recentActivities && project.recentActivities.length > 0 ? (
                                    <div className="space-y-3">
                                        {project.recentActivities
                                            .slice(0, 4)
                                            .map((activity) => (
                                                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                                                    <UserAvatar
                                                        user={{
                                                            id: String(activity?.user?.id || activity?.id),
                                                            name: activity?.user?.name || 'User',
                                                            avatar: activity?.user?.avatar_url,
                                                        }}
                                                        className="h-10 w-10 shadow-sm transition-transform hover:scale-105"
                                                        fallbackClassName="text-[11px]"
                                                    />
                                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                        <div className="text-sm text-gray-900 leading-normal">{formatActivityText(activity)}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{activity?.created_at ? formatDate(activity.created_at) : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-700 bg-gray-50/50 rounded-lg border border-dashed">
                                        <Activity className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-sm">No recent activity</p>
                                    </div>
                                )}
                            </Card>
                        </div>

                        <div className="space-y-6 ">
                            <Card className="p-6">
                                <h3 className="font-semibold text-lg mb-4">Project Details</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-sm text-black">Team Lead</span>
                                        {project.owner ? (
                                            <div className="flex items-center gap-2">
                                                <UserAvatar user={project.owner} className="h-6 w-6" fallbackClassName="text-[10px]" />
                                                <span className="text-sm font-medium">{project.owner.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-medium text-gray-700">Not assigned</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Start Date</span>
                                        <span className={`text-sm font-medium ${project.startDate ? '' : 'text-gray-700'}`}>
                                            {project.startDate ? formatDate(project.startDate) : 'Not set'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Due Date</span>
                                        <span className={`text-sm font-medium ${project.endDate ? '' : 'text-gray-700'}`}>
                                            {project.endDate ? formatDate(project.endDate) : 'Not set'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">Status</span>
                                        <span className="text-sm font-medium capitalize">{project.status}</span>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">Overall Progress</span>
                                            <span className="text-sm text-black">{project.stats.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all duration-500"
                                                style={{ width: `${project.stats.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h3 className="font-semibold text-lg mb-4">Team Members</h3>
                                <div className="space-y-3">
                                    {project.projectMembers && project.projectMembers.length > 0 ? (
                                        project.projectMembers.map(member => (
                                            <div key={member.id} className="flex items-center gap-3">
                                                <UserAvatar user={member.user} className="h-8 w-8" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{member.user?.name || `User ${member.userId}`}</p>
                                                    <p className="text-xs text-black capitalize">{member.role}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-700 py-2">No members yet</p>
                                    )}
                                    {canManageProject() && (
                                        <Button variant="outline" className="w-full mt-2 bg-white text-gray-600 hover:bg-brand-50 hover:text-brand-600 border-brand-100 hover:border-brand-300" size="sm" onClick={() => openModal('inviteMember', { projectId: project.id })}>
                                            <UserPlus className="w-3 h-3 mr-2" />
                                            Invite Member
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="tasks">
                    {isLoadingTasks ? (
                        <div className="py-2">
                            <ListSkeleton count={6} />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {tasks.length > 0 ? (
                                <>
                                    <div className="flex flex-col gap-3">
                                        {tasks.map(task => (
                                            <TaskRowCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => openTaskDrawer(task.id)}
                                            />
                                        ))}
                                    </div>

                                    {tasksPagination.last_page > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-4">
                                            <p className="text-sm text-black hidden sm:block">
                                                Showing page {tasksCurrentPage} of {tasksPagination.last_page} ({tasksPagination.total} total)
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setTasksCurrentPage((p) => Math.max(1, p - 1))}
                                                    disabled={tasksCurrentPage === 1}
                                                    className="h-8"
                                                >
                                                    Previous
                                                </Button>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: Math.min(4, tasksPagination.last_page) }, (_, i) => {
                                                        let pageNum: number
                                                        if (tasksPagination.last_page <= 4) {
                                                            pageNum = i + 1
                                                        } else if (tasksCurrentPage <= 2) {
                                                            pageNum = i + 1
                                                        } else if (tasksCurrentPage >= tasksPagination.last_page - 1) {
                                                            pageNum = tasksPagination.last_page - 3 + i
                                                        } else {
                                                            pageNum = tasksCurrentPage - 1 + i
                                                        }
                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                variant={tasksCurrentPage === pageNum ? 'default' : 'outline'}
                                                                size="sm"
                                                                onClick={() => setTasksCurrentPage(pageNum)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        )
                                                    })}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setTasksCurrentPage((p) => Math.min(tasksPagination.last_page, p + 1))}
                                                    disabled={tasksCurrentPage === tasksPagination.last_page}
                                                    className="h-8"
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
                                    <p className="text-black mt-1">Get started by creating a new task.</p>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="board" className="h-[calc(100vh-220px)]">
                    {isLoadingTasks ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                        </div>
                    ) : (
                        <BoardView
                            projectId={project.id}
                            tasks={tasks}
                        />
                    )}
                </TabsContent>

                <TabsContent value="analytics">
                    <AnalyticsView projectId={project.id} tasks={tasks} />
                </TabsContent>
            </Tabs>

            <Dialog open={activitiesDialogOpen} onOpenChange={setActivitiesDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-0 sm:mt-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
                            <DialogTitle>Project Activities</DialogTitle>

                            <div className="w-full sm:w-auto sm:mr-6">
                                <Select
                                    value={activitiesAssigneeName || "all"}
                                    onValueChange={(val) => setActivitiesAssigneeName(val === "all" ? "" : val)}
                                    disabled={isLoadingActivities}
                                >
                                    <SelectTrigger className="h-10 w-full sm:w-[240px] border-gray-200 bg-white">
                                        <SelectValue placeholder="All members" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
                                                    <Users className="w-3 h-3" />
                                                </div>
                                                <span className="text-sm">All members</span>
                                            </div>
                                        </SelectItem>
                                        {activitiesFilterMembers.map((m: any) => (
                                            <SelectItem key={String(m.id)} value={m.name}>
                                                <div className="flex items-center gap-2">
                                                    <UserAvatar
                                                        user={m}
                                                        className="h-5 w-5"
                                                        fallbackClassName="text-[8px]"
                                                    />
                                                    <span className="text-sm">{m.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3">
                        {isLoadingActivities ? (
                            <ActivitySkeleton count={5} />
                        ) : activities.length > 0 ? (
                            activities.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                                    <UserAvatar
                                        user={{
                                            id: String(activity?.user?.id || activity?.id),
                                            name: activity?.user?.name || 'User',
                                            avatar: activity?.user?.avatar_url,
                                        }}
                                        className="h-10 w-10 shadow-sm transition-transform hover:scale-105"
                                        fallbackClassName="text-[11px]"
                                    />
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className="text-sm text-gray-900 leading-normal">{formatActivityText(activity)}</div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{activity?.created_at ? formatDate(activity.created_at) : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center text-black">No activities found.</div>
                        )}
                    </div>

                    {activitiesLastPage > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                            <p className="text-sm text-black hidden sm:block">
                                Showing page {activitiesCurrentPage} of {activitiesLastPage} ({activitiesTotal} total)
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActivitiesCurrentPage(1)}
                                    disabled={isLoadingActivities || activitiesCurrentPage === 1}
                                    className="hidden sm:flex"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActivitiesCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={isLoadingActivities || activitiesCurrentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Previous</span>
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(4, activitiesLastPage) }, (_, i) => {
                                        let pageNum: number
                                        if (activitiesLastPage <= 4) {
                                            pageNum = i + 1
                                        } else if (activitiesCurrentPage <= 2) {
                                            pageNum = i + 1
                                        } else if (activitiesCurrentPage >= activitiesLastPage - 1) {
                                            pageNum = activitiesLastPage - 3 + i
                                        } else {
                                            pageNum = activitiesCurrentPage - 1 + i
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={activitiesCurrentPage === pageNum ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setActivitiesCurrentPage(pageNum)}
                                                disabled={isLoadingActivities}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        )
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActivitiesCurrentPage((p) => Math.min(activitiesLastPage, p + 1))}
                                    disabled={isLoadingActivities || activitiesCurrentPage === activitiesLastPage}
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="w-4 h-4 sm:ml-2" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActivitiesCurrentPage(activitiesLastPage)}
                                    disabled={isLoadingActivities || activitiesCurrentPage === activitiesLastPage}
                                    className="hidden sm:flex"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

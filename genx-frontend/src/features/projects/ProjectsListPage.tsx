import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUIStore, useAuthStore, isAdmin, isTeamLead, getAccessLevel } from '@/stores'
import { projectsApi, mapBackendProjectToFrontend, ProjectWithStats } from '@/api/projects'
import { organizationsApi } from '@/api/organizations'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
    Input,
    Progress,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui'
import { ProjectCardSkeleton } from '@/components/ui/modal-skeleton'
import { cn, formatDate, getRandomColor, getRandomIcon } from '@/lib/utils'
import {
    Plus,
    Search,
    Briefcase,
    Users,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    Settings,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    X,
} from 'lucide-react'



export function ProjectsListPage() {
    const navigate = useNavigate()
    const { openModal } = useUIStore()
    const { user, can } = useAuthStore()
    const ALL_MEMBERS_VALUE = 'all'
    const isUserAdmin = isAdmin(getAccessLevel(user))
    const [searchQuery, setSearchQuery] = useState('')
    const [projects, setProjects] = useState<ProjectWithStats[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [total, setTotal] = useState(0)
    const perPage = 9

    // Member filter state
    const [members, setMembers] = useState<any[]>([])
    const [selectedMemberId, setSelectedMemberId] = useState<string>(ALL_MEMBERS_VALUE)
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const [memberPopoverOpen, setMemberPopoverOpen] = useState(false)

    const filteredMembers = members.filter(member => {
        if (!memberSearchQuery) return true
        const name = (member.name || '').toLowerCase()
        const email = (member.email || '').toLowerCase()
        const term = memberSearchQuery.toLowerCase().trim()

        if (!term) return true
        return name.includes(term) || email.includes(term)
    })

    const fetchMembers = useCallback(async () => {
        try {
            if (!isUserAdmin) return
            const orgRes = await organizationsApi.getMembers()
            if (orgRes.success) {
                const membersList = Array.isArray(orgRes.data) ? orgRes.data : (orgRes.data.data || [])
                setMembers(membersList)
            }
        } catch (error) {
            console.error('Failed to fetch members:', error)
        }
    }, [isUserAdmin])

    useEffect(() => {
        fetchMembers()
    }, [fetchMembers])

    const fetchProjects = useCallback(async () => {
        try {
            setIsLoading(true)
            const params: { assignee_id?: string; per_page: number; page: number; search?: string } = {
                per_page: perPage,
                page: currentPage,
            }
            if (isUserAdmin && selectedMemberId !== ALL_MEMBERS_VALUE) {
                params.assignee_id = selectedMemberId
            }
            if (searchQuery.trim()) {
                params.search = searchQuery.trim()
            }
            const response = await projectsApi.getPaginated(params)
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
                // Paginated structure: response.data.data
                const mappedProjects = response.data.data.map(mapBackendProjectToFrontend)
                setProjects(mappedProjects)
                // Extract pagination metadata (don't overwrite currentPage - it's already correct)
                const meta = response.data.meta || {}
                setLastPage(meta.last_page || 1)
                setTotal(meta.total || 0)
            } else if (response.data && Array.isArray(response.data)) {
                // Direct data array: response.data
                const mappedProjects = response.data.map(mapBackendProjectToFrontend)
                setProjects(mappedProjects)
                setLastPage(1)
                setTotal(mappedProjects.length)
            } else if (Array.isArray(response)) {
                // Root is array
                const mappedProjects = response.map(mapBackendProjectToFrontend)
                setProjects(mappedProjects)
                setLastPage(1)
                setTotal(mappedProjects.length)
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error)
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, selectedMemberId, searchQuery, isUserAdmin])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProjects()
        }, 300)
        return () => clearTimeout(timer)
    }, [fetchProjects])

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedMemberId, searchQuery])

    // Listen for project creation events
    useEffect(() => {
        const handleProjectCreated = () => {
            fetchProjects()
        }
        window.addEventListener('project-created', handleProjectCreated)
        return () => {
            window.removeEventListener('project-created', handleProjectCreated)
        }
    }, [fetchProjects])

    const handleClearFilter = () => {
        setSelectedMemberId(ALL_MEMBERS_VALUE)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                        <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                        Projects
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5 sm:mt-1">
                        Manage your organization's projects
                    </p>
                </div>
                {(can('projects.create') || isAdmin(getAccessLevel(user)) || isTeamLead(getAccessLevel(user))) && (
                    <Button 
                        onClick={() => openModal('createProject', { onSuccess: fetchProjects })}
                        className="w-full sm:w-auto h-10 sm:h-auto"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
                <div className="relative w-full sm:w-[350px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm shadow-sm focus-visible:ring-brand-500/20"
                    />
                </div>
                {isUserAdmin && (
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-[250px] bg-white h-10 text-sm justify-between font-normal px-3 rounded-xl border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 truncate">
                                        {selectedMemberId !== ALL_MEMBERS_VALUE ? (
                                            <>
                                                <Avatar className="h-5 w-5 shrink-0">
                                                    <AvatarImage src={members.find(m => String(m.id) === selectedMemberId)?.avatar_url || ''} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {(members.find(m => String(m.id) === selectedMemberId)?.name || members.find(m => String(m.id) === selectedMemberId)?.email || 'U').charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="truncate">{members.find(m => String(m.id) === selectedMemberId)?.name || members.find(m => String(m.id) === selectedMemberId)?.email || 'Member'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span className="truncate">All Members</span>
                                            </>
                                        )}
                                    </div>
                                    <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", memberPopoverOpen && "rotate-180")} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-1 rounded-2xl border-gray-200 shadow-2xl shadow-brand-100/20 bg-white ring-1 ring-black/5" align="start">
                                <div className="p-2 border-b border-gray-100 mb-1">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <Input
                                            placeholder="Search members..."
                                            value={memberSearchQuery}
                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                            className="pl-8 h-8 text-[13px] bg-gray-50/50 border-gray-100 focus-visible:ring-brand-500/20 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto px-1 pb-1">
                                    <button
                                        onClick={() => {
                                            setSelectedMemberId(ALL_MEMBERS_VALUE)
                                            setMemberPopoverOpen(false)
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5",
                                            selectedMemberId === ALL_MEMBERS_VALUE ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-gray-50/80"
                                        )}
                                    >
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span>All Members</span>
                                    </button>
                                    {filteredMembers.map((member) => (
                                        <button
                                            key={member.id}
                                            onClick={() => {
                                                setSelectedMemberId(String(member.id))
                                                setMemberPopoverOpen(false)
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5",
                                                selectedMemberId === String(member.id) ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-gray-50/80"
                                            )}
                                        >
                                            <Avatar className="h-5 w-5 shrink-0">
                                                <AvatarImage src={member.avatar_url || ''} />
                                                <AvatarFallback className="text-[10px]">
                                                    {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="truncate">{member.name || member.email || 'Unnamed'}</span>
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        {selectedMemberId !== ALL_MEMBERS_VALUE && (
                            <Button variant="ghost" size="icon" onClick={handleClearFilter} className="shrink-0">
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <ProjectCardSkeleton key={i} />
                    ))
                ) : projects.map((project) => {
                    const stats = project.stats
                    const colorClass = getRandomColor(project.id)

                    return (
                        <Card
                            key={project.id}
                            className="hover:shadow-md transition-all group flex flex-col cursor-pointer"
                            onClick={() => navigate(`/projects/${project.id}`)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${project.icon ? 'bg-gray-100' : colorClass}`}>
                                            {project.icon ? (
                                                <img src={project.icon} alt={project.name} className="w-full h-full object-cover" />
                                            ) : (
                                                (() => {
                                                    const Icon = getRandomIcon(project.id)
                                                    return <Icon className="w-5 h-5" />
                                                })()
                                            )}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg group-hover:text-brand-600 transition-colors">
                                                {project.name}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Updated {formatDate(project.updatedAt)}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem asChild>
                                                <Link to={`/projects/${project.id}`}>
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    View Project
                                                </Link>
                                            </DropdownMenuItem>
                                            {(can('projects.edit') || isAdmin(getAccessLevel(user)) || isTeamLead(getAccessLevel(user))) && (
                                                <DropdownMenuItem onClick={() => openModal('projectSettings', { projectId: project.id })}>
                                                    <Settings className="w-4 h-4 mr-2" />
                                                    Settings
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-6">
                                <p className="text-sm text-gray-500 line-clamp-2 h-10">
                                    {project.description}
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Overall Progress</span>
                                        <span className="text-gray-900 font-bold">{stats.progress}%</span>
                                    </div>
                                    <Progress value={stats.progress} className="h-2" />
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {stats.completedTasks}/{stats.totalTasks} Tasks
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {stats.totalHours}h Logged
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Users className="w-4 h-4" />
                                        <span>{project.memberIds.length} members</span>
                                    </div>
                                    {/* <div className="flex -space-x-2">
                                        {project.memberIds.length > 3 && (
                                            <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-500">
                                                +{project.memberIds.length - 3}
                                            </div>
                                        )}
                                    </div> */}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {/* Empty State */}
                {!isLoading && projects.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
                        <p className="text-gray-500 mt-2">
                            {searchQuery ? "Try a different search term" : selectedMemberId !== ALL_MEMBERS_VALUE ? "No projects for selected member" : "Create your first project to get started"}
                        </p>
                        {!searchQuery && selectedMemberId === ALL_MEMBERS_VALUE && (can('projects.create') || isAdmin(getAccessLevel(user)) || isTeamLead(getAccessLevel(user))) && (
                            <Button variant="outline" className="mt-4" onClick={() => openModal('createProject')}>
                                Create Project
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Unified Scrolling Pagination */}
            {lastPage > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 mt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 order-3 sm:order-1 text-center sm:text-left">
                        Showing page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{lastPage}</span> ({total} total)
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                        <div className="flex items-center justify-center gap-1 flex-wrap w-full sm:w-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-9 px-3"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                <span className="hidden xs:inline">Previous</span>
                            </Button>

                            <div className="flex items-center gap-1 mx-1">
                                {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                    let pageNum: number
                                    if (lastPage <= 5) {
                                        pageNum = i + 1
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1
                                    } else if (currentPage >= lastPage - 2) {
                                        pageNum = lastPage - 4 + i
                                    } else {
                                        pageNum = currentPage - 2 + i
                                    }
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setCurrentPage(pageNum)}
                                            className="w-8 h-8 p-0 shrink-0"
                                        >
                                            {pageNum}
                                        </Button>
                                    )
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                                disabled={currentPage === lastPage}
                                className="h-9 px-3"
                            >
                                <span className="hidden xs:inline">Next</span>
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

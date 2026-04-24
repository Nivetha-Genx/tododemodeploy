import { useState, useEffect, useCallback } from 'react'
import {
    Users,
    ArrowLeft,
    Timer as TimerIcon,
    Search,
    Play,
    Square,
    CheckCircle2,
    UserSearch,
    Menu,
    X
} from 'lucide-react'
import {
    Button,
    ScrollArea,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Input,
    Badge
} from '@/components/ui'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { BoardView } from '@/features/projects/components/BoardView'
import type { Task, User } from '@/types'
import { cn, getInitials } from '@/lib/utils'
import { useTaskUIStore, useUIStore } from '@/stores'

interface StandupViewProps {
    members: User[]
    sprintId: string | null
    standupTimeMinutes: number
    onExit: () => void
}

export function StandupView({ members, sprintId, standupTimeMinutes, onExit }: StandupViewProps) {
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [timer, setTimer] = useState(standupTimeMinutes * 60)
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [memberSearchQuery, setMemberSearchQuery] = useState('')
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

    const { selectTask } = useTaskUIStore()
    const { openTaskDrawer, openModal } = useUIStore()

    // Timer logic
    useEffect(() => {
        if (!selectedMemberId) {
            setTimer(standupTimeMinutes * 60)
        }
    }, [standupTimeMinutes, selectedMemberId])

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 0) {
                        setIsTimerRunning(false)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isTimerRunning])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const fetchMemberTasks = useCallback(async (memberId: string) => {
        setIsLoading(true)
        try {
            const params: any = {
                date: 'today',
                root_only: true
            }
            if (memberId !== 'unassigned') {
                params.assignee_id = memberId
            } else {
                params.unassigned = true
            }
            if (sprintId) {
                params.sprint_id = sprintId
            }
            const res = await tasksApi.getAllListAll(params)
            const list = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? [])
            setTasks((list || []).map((t: any) => mapBackendTaskToFrontend(t)))
        } catch (error) {
            console.error('Failed to fetch member tasks:', error)
            setTasks([])
        } finally {
            setIsLoading(false)
        }
    }, [sprintId])

    const handleMemberClick = (memberId: string) => {
        if (selectedMemberId === memberId) return
        setSelectedMemberId(memberId)
        setTimer(standupTimeMinutes * 60)
        setIsTimerRunning(true)
        fetchMemberTasks(memberId)
        setIsMobileSidebarOpen(false)
    }

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(memberSearchQuery.toLowerCase().trim())
    )

    const handleTaskClick = (taskId: string) => {
        selectTask(taskId)
        openTaskDrawer(taskId)
    }

    const handleAddTaskClick = (statusId: string) => {
        openModal('createTask', {
            status: statusId,
            sprintId: sprintId,
            assigneeId: selectedMemberId === 'unassigned' ? undefined : selectedMemberId
        })
    }

    return (
        <div className="flex flex-col h-full min-h-0 bg-gray-50/50 -m-6">
            {/* Header / Top Bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100 shadow-sm shrink-0 z-20">
                <div className="flex items-center gap-2 sm:gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        className="lg:hidden text-gray-500 hover:text-gray-900 p-2"
                    >
                        {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onExit}
                        className="text-gray-500 hover:text-gray-900 hidden sm:flex"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                        <TimerIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                        <span className="truncate">Daily Standup</span>
                    </h2>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={onExit}
                        className="gap-1.5 shrink-0 bg-brand-600 hover:bg-brand-700 text-white shadow-sm h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4"
                    >
                        <span className="hidden xs:inline">End Standup</span>
                        <span className="xs:hidden">End standup</span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative min-h-0">
                {/* Backdrop for mobile sidebar */}
                {isMobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    />
                )}

                {/* Sidebar - Members List */}
                <div className={cn(
                    "fixed inset-y-0 left-0 w-80 bg-white border-r border-gray-100 flex flex-col shrink-0 z-40 lg:z-0 lg:static transition-transform duration-300 ease-in-out transform",
                    isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}>
                    <div className="p-5 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Standup</h2>
                            {/* <Settings2 className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" /> */}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className={cn(
                                    "text-4xl font-light tracking-tight font-mono transition-colors",
                                    timer <= 0 ? "text-red-700" : "text-gray-900"
                                )}>
                                    {formatTime(timer)}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                                        className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                    >
                                        <Play className={cn("w-3 h-3 fill-gray-600 text-gray-600", isTimerRunning && "fill-brand-600 text-brand-600")} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsTimerRunning(false)
                                            setTimer(standupTimeMinutes * 60)
                                        }}
                                        className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                    >
                                        <Square className="w-3 h-3 fill-gray-600 text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search assignee..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-4">
                        <div className="space-y-2 pb-4">
                            {filteredMembers.map((member) => (
                                <button
                                    key={member.id}
                                    onClick={() => handleMemberClick(String(member.id))}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                                        selectedMemberId === String(member.id)
                                            ? "border-brand-500 bg-brand-50/50 shadow-sm"
                                            : "border-transparent hover:bg-gray-50"
                                    )}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                            <AvatarImage src={member.avatar_url} />
                                            <AvatarFallback className="text-xs bg-orange-600 text-white font-bold">
                                                {getInitials(member.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {selectedMemberId === String(member.id) && (
                                            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                                <CheckCircle2 className="w-2 h-2 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "font-medium text-sm truncate",
                                        selectedMemberId === String(member.id) ? "text-gray-900" : "text-gray-600"
                                    )}>
                                        {member.name}
                                    </span>
                                </button>
                            ))}

                            <button
                                onClick={() => handleMemberClick('unassigned')}
                                className={cn(
                                    "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                                    selectedMemberId === 'unassigned'
                                        ? "border-brand-500 bg-brand-50/50 shadow-sm"
                                        : "border-transparent hover:bg-gray-50"
                                )}
                            >
                                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                    <UserSearch className="w-5 h-5 text-gray-400" />
                                </div>
                                <span className={cn(
                                    "font-medium text-sm",
                                    selectedMemberId === 'unassigned' ? "text-gray-900" : "text-gray-600"
                                )}>
                                    Unassigned
                                </span>
                            </button>
                        </div>
                    </ScrollArea>
                </div>

                {/* Main Content - Member's Kanban Board */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50 min-h-0">
                    {!selectedMemberId ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center">
                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-sm">
                                <Users className="w-8 h-8 sm:w-12 sm:h-12 text-brand-200" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select a Member</h3>
                            <p className="text-sm sm:text-gray-500 max-w-sm">
                                Click on a team member from the sidebar to view their tasks for today and start their standup timer.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 p-3 sm:p-6 flex flex-col min-h-0">
                            {(() => {
                                const activeTasks = tasks.filter(t => t.status !== 'completed')
                                return (
                                    <>
                                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 sm:mb-6">
                                            <div className="flex items-center gap-3">
                                                {selectedMemberId === 'unassigned' ? (
                                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-brand-200 shadow-sm bg-brand-50 flex items-center justify-center shrink-0">
                                                        <UserSearch className="w-5 h-5 sm:w-6 sm:h-6 text-brand-700" />
                                                    </div>
                                                ) : (
                                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-brand-200 shadow-sm shrink-0">
                                                        <AvatarImage src={members.find(m => String(m.id) === selectedMemberId)?.avatar_url} />
                                                        <AvatarFallback className="bg-brand-50 text-brand-700">
                                                            {getInitials(members.find(m => String(m.id) === selectedMemberId)?.name || '')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div>
                                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
                                                        {members.find(m => String(m.id) === selectedMemberId)?.name || 'Unassigned'}&apos;s Tasks
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge variant="outline" className="text-[10px] bg-white border-green-200 text-green-700">
                                                            Today&apos;s Focus
                                                        </Badge>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500">
                                                            {activeTasks.length} tasks assigned
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 h-full min-h-0 relative">
                                            {isLoading && (
                                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
                                                </div>
                                            )}
                                            <div className="h-full">
                                                <BoardView tasks={activeTasks} projectId="" onTaskClick={handleTaskClick} onAddTaskClick={handleAddTaskClick} />
                                            </div>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate} from 'react-router-dom'
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
    Badge,
} from '@/components/ui'
import { getInitials } from '@/lib/utils'
import { getRoleLabel } from '@/lib/roles'
import {
    Search,
    ChevronDown,
    LogOut,
    User,
    Plus,
    ArrowRight,
    Clock,
    ChevronLeft,
} from 'lucide-react'
import { Task } from '@/types'
import { tasksApi, mapBackendTaskToFrontend } from '@/api/tasks'
import { cn } from '@/lib/utils'
import { useAuthStore, useUIStore, useTaskUIStore, useStatusStore } from '@/stores'
import { useTimerStore } from '@/stores/timerStore'
import { Button } from '@/components/ui'
import { NotificationDropdown } from './NotificationDropdown'

export function Header() {
    const navigate = useNavigate()
    const { user, logout, activeOrganizationId } = useAuthStore()
    const isSuperAdminGlobal = user?.role === 'super_admin' && !activeOrganizationId
    const { openModal, openTaskDrawer } = useUIStore()
    const { selectTask } = useTaskUIStore()
    const { isRunning, seconds, toggleVisibility } = useTimerStore()
    const { getStatusStyles, fetchStatuses, statuses } = useStatusStore()
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Task[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const mobileSearchRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (statuses.length === 0) {
            fetchStatuses()
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
            if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
                setIsMobileSearchVisible(false)
            }
        }
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileSearchVisible(false)
            }
        }
        window.addEventListener('resize', handleResize)
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            window.removeEventListener('resize', handleResize)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        const fetchResults = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([])
                setShowResults(false)
                return
            }

            setIsSearching(true)
            setShowResults(true)
            try {
                const response = await tasksApi.getAll({ search: searchQuery, page: 1, per_page: 10 })
                const tasks = Array.isArray(response.data) ? response.data : response.data?.data || []
                setSearchResults(tasks.map(mapBackendTaskToFrontend))
            } catch (error) {
                console.error('Failed to search tasks:', error)
            } finally {
                setIsSearching(false)
            }
        }

        const timer = setTimeout(fetchResults, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleTaskClick = (taskId: string) => {
        selectTask(taskId)
        openTaskDrawer(taskId)
        setShowResults(false)
        setSearchQuery('')
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const renderSearchResults = (isMobile = false) => (
        <div className={cn(
            "max-h-[480px] overflow-y-auto custom-scrollbar bg-white/95 backdrop-blur-xl",
            isMobile && "max-h-[75vh]"
        )}>
            {isSearching ? (
                <div className="p-8 text-center text-sm text-gray-500">
                    <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="font-medium">Searching for tasks...</p>
                </div>
            ) : searchResults.length > 0 ? (
                <div className="flex flex-col">
                    <div className="px-5 pt-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1 h-4 bg-brand-500 rounded-full" />
                        Tasks Found
                    </div>
                    
                    <div className="px-2 py-2 space-y-0.5">
                        {searchResults.slice(0, 5).map((task) => {
                            const statusStyle = getStatusStyles(task.status)
                            return (
                                <button
                                    key={task.id}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        handleTaskClick(task.id)
                                        if (isMobile) setIsMobileSearchVisible(false)
                                    }}
                                    className="w-full px-3 py-2.5 hover:bg-brand-50/80 flex items-center gap-4 transition-all rounded-2xl group text-left relative"
                                >
                                    <Avatar className="w-10 h-10 shrink-0 shadow-sm border-2 border-white group-hover:scale-105 transition-transform">
                                        <AvatarImage src={task.assigneeAvatar} alt={task.assigneeName} />
                                        <AvatarFallback className="text-xs bg-brand-50 text-brand-600 font-bold">
                                            {getInitials(task.assigneeName || 'U')}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-bold text-gray-900 truncate group-hover:text-brand-700 transition-colors">
                                                {task.title}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-gray-400 shrink-0 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                {task.taskId}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className="text-[9px] px-1.5 py-0 h-4 border-none font-bold uppercase tracking-wider"
                                                style={{ backgroundColor: statusStyle.bgColor, color: statusStyle.color }}
                                            >
                                                {statusStyle.label}
                                            </Badge>
                                            
                                            {task.projectName && (
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
                                                    <span className="text-[11px] text-brand-600 font-bold truncate max-w-[120px]">
                                                        {task.projectName}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-1.5 ml-auto">
                                                <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
                                                <span className="text-[11px] text-gray-500 font-medium">
                                                    {task.assigneeName || 'Unassigned'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    
                    <div className="p-3 bg-gray-50/50 border-t border-gray-100/50 mt-1">
                        <Button
                            className="w-full bg-white hover:bg-brand-600 hover:text-white text-brand-600 text-xs font-bold h-10 rounded-xl flex items-center justify-center gap-2 group/btn transition-all active:scale-[0.98] shadow-sm border border-brand-100/50"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                navigate(`/tasks?search=${encodeURIComponent(searchQuery)}`)
                                setShowResults(false)
                                setSearchQuery('')
                                if (isMobile) setIsMobileSearchVisible(false)
                            }}
                        >
                            Show all results
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            ) : searchQuery.trim().length >= 2 ? (
                <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <Search className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">No tasks found</p>
                    <p className="text-xs text-gray-500 mt-1">We couldn't find anything matching "{searchQuery}"</p>
                </div>
            ) : null}
        </div>
    )


    return (
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-200 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {/* Mobile Search Toggle */}
            {!isSuperAdminGlobal && (
                <div className="flex lg:hidden items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileSearchVisible(true)}
                        className="text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                        <Search className="w-5 h-5" />
                    </Button>
                </div>
            )}

            {/* Mobile Search Overlay */}
            {!isSuperAdminGlobal && isMobileSearchVisible && (
                <div 
                    ref={mobileSearchRef}
                    className="absolute inset-0 z-50 bg-white flex items-center px-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-300 lg:hidden"
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileSearchVisible(false)}
                        className="text-gray-500 hover:text-brand-600 hover:bg-brand-50"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                            className="w-full h-10 pl-10 pr-4 text-base bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        />
                    </div>
                    
                    {showResults && (
                        <div className="absolute top-full left-0 right-0 px-4 mt-3 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl shadow-brand-100/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200">
                            {renderSearchResults(true)}
                        </div>
                    )}
                </div>
            )}

            {/* Desktop Search */}
            {!isSuperAdminGlobal ? (
                <div className="hidden lg:flex items-center flex-1 max-w-md relative" ref={searchRef}>
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks, descriptions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                            className="w-full h-10 pl-10 pr-4 text-base bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {showResults && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl shadow-brand-100/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200 min-w-[440px]">
                            {renderSearchResults(false)}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1" />
            )}

            {/* Right section */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 pr-1 sm:pr-2">
                {!isSuperAdminGlobal && (
                    <>
                        <Button
                            onClick={() => openModal('createTask')}
                            className="hidden md:flex items-center gap-2 px-4 bg-brand-600 hover:bg-brand-700 text-white shadow-sm h-10"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Task</span>
                        </Button>
                        <div className="relative group/timer">
                            {isRunning && (
                                <div className="absolute inset-0 bg-brand-600/20 rounded-lg blur-lg pointer-events-none" />
                            )}
                            <Button
                                onClick={() => toggleVisibility(true)}
                                variant={isRunning ? "secondary" : "outline"}
                                className={cn(
                                    "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 transition-all duration-500 relative z-10 h-9 sm:h-10",
                                    isRunning
                                        ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-brand-700 dark:border-brand-400"
                                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-400 text-slate-600 dark:text-slate-400 shadow-sm"
                                )}
                            >
                                <Clock className={cn("w-4 h-4 text-slate-500 transition-colors duration-500", isRunning && "text-brand-600 dark:text-brand-400")} />
                                <span className={cn("hidden xs:inline sm:inline transition-all duration-500", isRunning && "font-bold text-slate-900 dark:text-white")}>
                                    {isRunning ? (
                                        <span className="font-mono tabular-nums">
                                            {Math.floor(seconds / 3600) > 0 ? `${Math.floor(seconds / 3600)}:` : ''}
                                            {String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:
                                            {String(seconds % 60).padStart(2, '0')}
                                        </span>
                                    ) : "Timer"}
                                </span>
                            </Button>
                        </div>

                        <NotificationDropdown />
                    </>
                )}

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={user?.avatar} alt={user?.name} />
                            <AvatarFallback>{getInitials(user?.name || 'U')}</AvatarFallback>
                        </Avatar>
                        <div className="hidden lg:block text-left">
                            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                            <p className="text-xs text-gray-500">{getRoleLabel(user?.role || 'member')}</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {userMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setUserMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-3 w-64 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl shadow-brand-100/50 z-50 py-3 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200 overflow-hidden">
                                <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50 mb-1">
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="w-10 h-10 border-2 border-white shadow-sm shrink-0">
                                            <AvatarImage src={user?.avatar} alt={user?.name} />
                                            <AvatarFallback className="bg-brand-50 text-brand-600 font-bold">
                                                {getInitials(user?.name || 'U')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex flex-col items-start gap-0.5">
                                            <p className="text-sm font-bold text-gray-900 truncate w-full leading-tight">{user?.name}</p>
                                            <p className="text-[12px] text-gray-500 truncate font-medium w-full leading-tight">{user?.email}</p>
                                            <Badge variant="secondary" className="bg-brand-100/50 text-brand-700 border-none px-2 py-0 h-4 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                                                {getRoleLabel(user?.role || 'member')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-2 space-y-0.5">
                                    <button
                                        onClick={() => {
                                            setUserMenuOpen(false)
                                            navigate('/settings')
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-brand-50 hover:text-brand-700 rounded-2xl transition-all group"
                                    >
                                        <div className="p-1.5 bg-gray-100 group-hover:bg-brand-100 rounded-lg transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        My Profile Settings
                                    </button>
                                </div>
                                <div className="mt-2 px-2 pt-2 border-t border-gray-50">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 w-full px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-2xl transition-all group"
                                    >
                                        <div className="p-1.5 bg-red-50 group-hover:bg-red-100 rounded-lg transition-colors">
                                            <LogOut className="w-4 h-4" />
                                        </div>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}

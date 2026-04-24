import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
    const { user, logout } = useAuthStore()
    const { openModal, openTaskDrawer } = useUIStore()
    const { selectTask } = useTaskUIStore()
    const { isRunning } = useTimerStore()
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
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
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
            "max-h-[400px] overflow-y-auto",
            isMobile && "max-h-[80vh]"
        )}>
            {isSearching ? (
                <div className="p-4 text-center text-sm text-gray-500">
                    <div className="animate-spin h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Searching...
                </div>
            ) : searchResults.length > 0 ? (
                <div className="py-2">
                    <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Tasks
                    </div>
                    {searchResults.slice(0, 5).map((task) => {
                        const statusStyle = getStatusStyles(task.status)
                        return (
                            <button
                                key={task.id}
                                onClick={() => {
                                    handleTaskClick(task.id)
                                    if (isMobile) setIsMobileSearchVisible(false)
                                }}
                                className="w-full px-4 py-3 hover:bg-brand-50/50 flex items-center gap-3 transition-all border-b border-gray-50 last:border-0 text-left group"
                            >
                                <Avatar className="w-9 h-9 shrink-0 shadow-sm border border-gray-100 group-hover:border-brand-200 transition-colors">
                                    <AvatarImage src={task.assigneeAvatar} alt={task.assigneeName} />
                                    <AvatarFallback className="text-[10px] bg-gray-50 text-gray-400 group-hover:bg-brand-100 group-hover:text-brand-600 font-bold transition-colors">
                                        {getInitials(task.assigneeName || 'U')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-base font-semibold text-gray-900 truncate group-hover:text-brand-700 transition-colors">
                                            {task.title}
                                        </span>
                                        <span className="text-xs font-mono font-medium text-gray-400 shrink-0">
                                            {task.taskId}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 py-0 h-4 border-transparent font-semibold uppercase tracking-wider"
                                            style={{ backgroundColor: statusStyle.bgColor, color: statusStyle.color }}
                                        >
                                            {statusStyle.label}
                                        </Badge>
                                        {task.projectName && (
                                            <>
                                                <span className="text-xs text-gray-300">•</span>
                                                <span className="text-xs text-brand-600 font-medium truncate max-w-[150px]">
                                                    {task.projectName}
                                                </span>
                                            </>
                                        )}
                                        <span className="text-xs text-gray-300">•</span>
                                        <span className="text-xs text-gray-400">
                                            {task.assigneeName || 'Unassigned'}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                    {searchResults.length > 5 && (
                        <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
                            <Button
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-medium h-9 rounded-lg flex items-center justify-center gap-2 group/btn transition-all active:scale-[0.98] shadow-none"
                                onClick={() => {
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
                    )}
                </div>
            ) : searchQuery.trim().length >= 2 ? (
                <div className="p-8 text-center">
                    <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                </div>
            ) : null}
        </div>
    )


    return (
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-200 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {/* Mobile Search Toggle */}
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

            {/* Mobile Search Overlay */}
            {isMobileSearchVisible && (
                <div 
                    ref={mobileSearchRef}
                    className="absolute inset-0 z-50 bg-white flex items-center px-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
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
                        
                        {showResults && (
                            <div className="absolute top-full left-[-48px] right-[-16px] mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 min-w-[320px]">
                                {renderSearchResults(true)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Desktop Search */}
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
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {renderSearchResults(false)}
                    </div>
                )}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3 md:gap-4 lg:gap-5 xl:gap-6 pr-2">
                <Button
                    onClick={() => openModal('createTask')}
                    className="hidden md:flex items-center gap-1.5 md:gap-2 px-3 md:px-3 lg:px-4 bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Task
                </Button>

                <div className="relative group/timer">
                    {isRunning && (
                        <div className="absolute inset-0 bg-brand-600/20 rounded-lg blur-lg pointer-events-none" />
                    )}
                    <Button
                        onClick={() => useTimerStore.getState().toggleVisibility(true)}
                        variant={isRunning ? "secondary" : "outline"}
                        className={cn(
                            "hidden md:flex items-center gap-1.5 md:gap-2 px-3 md:px-3 lg:px-4 transition-all duration-500 relative z-10",
                            isRunning
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-brand-700 dark:border-brand-400"
                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-400 text-slate-600 dark:text-slate-400 shadow-sm"
                        )}
                    >
                        <Clock className={cn("w-4 h-4 text-slate-500 transition-colors duration-500", isRunning && "text-brand-600 dark:text-brand-400")} />
                        <span className={cn("transition-all duration-500", isRunning && "font-bold text-slate-900 dark:text-white")}>
                            Timer
                        </span>
                    </Button>
                </div>

                <NotificationDropdown />

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

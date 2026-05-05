import { useState, useEffect } from 'react'
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { Trophy, Calendar } from 'lucide-react'
import { getInitials, cn } from '@/lib/utils'
import { leaderboardApi, LeaderboardUser } from '@/api/leaderboard'

export function LeaderboardPage() {
    const [year, setYear] = useState(() => new Date().getFullYear())
    const [month, setMonth] = useState(() => new Date().getMonth() + 1)
    const [users, setUsers] = useState<LeaderboardUser[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setIsLoading(true)
                const response = await leaderboardApi.get(year, month)
                if (response.success && response.data) {
                    setUsers(response.data.users)
                }
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error)
                setUsers([])
            } finally {
                setIsLoading(false)
            }
        }
        fetchLeaderboard()
    }, [year, month])

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    if (isLoading) {
        return <PageSkeleton />
    }

    return (
        <div className="w-full space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative">
                <div className="space-y-1 relative z-10">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-brand-600" />
                        Leaderboard
                    </h1>
                    <p className="text-gray-500 text-md">
                        Recognizing top performers for their hard work. Points act as a vital metric for performance appraisals.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto bg-white p-2 rounded-2xl shadow-sm border border-gray-100 relative z-10 shrink-0">
                    <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
                        <SelectTrigger className="w-full sm:w-[150px] md:flex-1 md:w-auto lg:flex-none lg:w-[150px] border-none shadow-none bg-gray-50/80 hover:bg-gray-100 focus:ring-0 rounded-xl h-11 text-sm font-semibold transition-colors">
                            <div className="flex items-center gap-2.5">
                                <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
                                <SelectValue placeholder="Month" />
                            </div>
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-2xl border-gray-100 shadow-2xl p-1 bg-white/95 backdrop-blur-xl min-w-[160px]">
                            <div className="px-3 py-2 border-b border-gray-50 mb-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Choose Month</span>
                            </div>
                            {monthNames.map((name, i) => (
                                <SelectItem key={i} value={(i + 1).toString()} className="font-bold text-sm rounded-xl focus:bg-brand-50 focus:text-brand-700 cursor-pointer py-2.5 px-3">
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                        <SelectTrigger className="w-full sm:w-[110px] md:flex-1 md:w-auto lg:flex-none lg:w-[110px] border-none shadow-none bg-gray-50/80 hover:bg-gray-100 focus:ring-0 rounded-xl h-11 text-sm font-semibold transition-colors">
                            <div className="flex items-center gap-2">
                                <SelectValue placeholder="Year" />
                            </div>
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-2xl border-gray-100 shadow-2xl p-1 bg-white/95 backdrop-blur-xl min-w-[120px]">
                            <div className="px-3 py-2 border-b border-gray-50 mb-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Year</span>
                            </div>
                            {years.map((y) => (
                                <SelectItem key={y} value={y.toString()} className="font-bold text-sm rounded-xl focus:bg-brand-50 focus:text-brand-700 cursor-pointer py-2.5 px-3">
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="bg-white/70 backdrop-blur-3xl border border-gray-100 shadow-2xl shadow-gray-200/50 rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-brand-500/5 relative">

                {/* Decorative background gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-50/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                <div className="px-5 py-4 sm:px-6 border-b border-gray-100/80 bg-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                        Rankings for {monthNames[month - 1]} {year}
                    </h2>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-100">
                        Total Members: <span className="text-brand-600">{users.length}</span>
                    </div>
                </div>

                <div className="p-3 sm:p-4 lg:p-6 relative z-10">
                    {users.length > 0 ? (
                        <div className="space-y-3">
                            {users.map((user) => {
                                const isRank1 = user.rank === 1
                                const isRank2 = user.rank === 2
                                const isRank3 = user.rank === 3
                                const isTop3 = isRank1 || isRank2 || isRank3

                                // Dynamic styles based on rank
                                const rankStyles = {
                                    1: {
                                        card: "bg-gradient-to-r from-amber-50 via-white to-amber-50/30 border-2 border-amber-200 hover:border-amber-400 shadow-sm shadow-amber-500/10",
                                        badge: "bg-gradient-to-br from-amber-300 to-amber-500 text-white border-amber-400 shadow-amber-500/40",
                                        avatar: "border-amber-100",
                                        points: "bg-amber-50/80 border-amber-300 text-amber-700 font-bold"
                                    },
                                    2: {
                                        card: "bg-gradient-to-r from-slate-50 via-white to-slate-50/30 border-2 border-slate-200 hover:border-slate-400 shadow-sm shadow-slate-500/10",
                                        badge: "bg-gradient-to-br from-slate-300 to-slate-400 text-white border-slate-300 shadow-slate-500/40",
                                        avatar: "border-slate-100",
                                        points: "bg-slate-50/80 border-slate-300 text-slate-700 font-bold"
                                    },
                                    3: {
                                        card: "bg-gradient-to-r from-orange-50 via-white to-orange-50/30 border-2 border-orange-200 hover:border-orange-400 shadow-sm shadow-orange-500/10",
                                        badge: "bg-gradient-to-br from-orange-300 to-orange-500 text-white border-orange-300 shadow-orange-500/40",
                                        avatar: "border-orange-100",
                                        points: "bg-orange-50/80 border-orange-300 text-orange-700 font-bold"
                                    },
                                    default: {
                                        card: "bg-white border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 shadow-sm",
                                        badge: "bg-gray-50 text-gray-400 border-gray-200 group-hover:bg-brand-100 group-hover:text-brand-700",
                                        avatar: "border-white",
                                        points: "bg-brand-50 border-brand-100 text-brand-700 group-hover:text-brand-600 group-hover:border-brand-300 group-hover:shadow-brand-500/20"
                                    }
                                } as const

                                const currentStyle = (user.rank === 1 || user.rank === 2 || user.rank === 3)
                                    ? rankStyles[user.rank as 1 | 2 | 3]
                                    : rankStyles.default

                                return (
                                    <div
                                        key={user.user_id}
                                        className={cn(
                                            "relative flex flex-row items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-300 group hover:scale-[1.01] hover:shadow-xl cursor-pointer",
                                            currentStyle.card
                                        )}
                                    >
                                        {/* Rank Badge */}
                                        <div className="flex items-center justify-center shrink-0 w-10 h-10 relative">
                                            <div className={cn(
                                                "flex items-center justify-center w-full h-full rounded-xl font-bold text-base relative z-10 shadow-sm border transition-transform duration-300 group-hover:scale-105",
                                                currentStyle.badge
                                            )}>
                                                {isTop3 ? (
                                                    <Trophy className="w-4 h-4 shrink-0 drop-shadow-sm" strokeWidth={2.5} />
                                                ) : (
                                                    `#${user.rank}`
                                                )}
                                            </div>
                                        </div>

                                        {/* Avatar */}
                                        <div className="shrink-0 relative hidden sm:block">
                                            <Avatar className={cn(
                                                "w-10 h-10 sm:w-12 sm:h-12 border-2 shadow-sm transition-transform duration-300 group-hover:scale-105",
                                                currentStyle.avatar
                                            )}>
                                                <AvatarImage src={user.avatar_url ?? undefined} className="object-cover" />
                                                <AvatarFallback className="bg-brand-50 text-brand-700 font-bold text-base">
                                                    {getInitials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>

                                        {/* User Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-900 text-base sm:text-lg truncate group-hover:text-brand-700 transition-colors">
                                                    {user.name}
                                                </p>
                                            </div>
                                            {user.email && (
                                                <p className="text-xs sm:text-sm font-medium text-gray-500 truncate sm:mt-0.5">
                                                    {user.email}
                                                </p>
                                            )}
                                        </div>

                                        {/* Points */}
                                        <div className="shrink-0 flex flex-col items-end gap-1 ml-2">
                                            <div className={cn(
                                                "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border flex items-center gap-1 shadow-inner transition-colors",
                                                currentStyle.points
                                            )}>
                                                <span className="font-bold text-lg sm:text-2xl tabular-nums leading-none tracking-tight">
                                                    {user.points}
                                                </span>
                                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-80 mt-0.5 sm:mt-1">
                                                    PTS
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50">
                            <div className="w-24 h-24 bg-white shadow-sm rounded-full flex items-center justify-center mb-6 transition-transform hover:scale-110 duration-300 hover:shadow-brand-100">
                                <Trophy className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">No Rankings Yet</h3>
                            <p className="text-base font-medium text-gray-500 max-w-sm">
                                There is no leaderboard data for {monthNames[month - 1]} {year}. Complete tasks and projects to start earning points!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}


import { useState, useEffect } from 'react'
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    ScrollArea,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'
import { Download, Calendar, TrendingUp, BarChart3, Activity, Users, User as UserIcon } from 'lucide-react'
import { reportsApi } from '@/api/reports'
import { organizationsApi } from '@/api/organizations'
import { UserAvatar } from '@/components/UserAvatar'
import { User } from '@/types'
import { formatDateToLocalString, cn } from '@/lib/utils'

export function ReportsPage() {
    const [dateRange, setDateRange] = useState('week')
    const [productivityData, setProductivityData] = useState([])
    const [utilizationData, setUtilizationData] = useState([])
    const [burndownData, setBurndownData] = useState([])
    const [velocityData, setVelocityData] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [members, setMembers] = useState<User[]>([])
    const [productivityMode, setProductivityMode] = useState<'team' | 'individual'>('team')
    const [selectedIndividualId, setSelectedIndividualId] = useState<string | null>(null)

    const [activeTab, setActiveTab] = useState('productivity')
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        fetchReports()
    }, [dateRange])

    useEffect(() => {
        if (productivityMode === 'individual' || productivityMode === 'team') {
            fetchProductivityOnly()
        }
    }, [productivityMode, selectedIndividualId, dateRange])

    useEffect(() => {
        fetchMembers()
    }, [])

    const fetchMembers = async () => {
        try {
            const response = await organizationsApi.getMembers()
            if (response.success) {
                setMembers(response.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch members:', error)
        }
    }

    const fetchProductivityOnly = async () => {
        try {
            const dateParams = getDateRange(dateRange)
            const response = await reportsApi.getProductivity({
                ...dateParams,
                period: dateRange,
                assignee_id: productivityMode === 'individual' ? selectedIndividualId : null
            })
            if (response.success) {
                setProductivityData(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch productivity:', error)
        }
    }

    const getDateRange = (range: string) => {
        const today = new Date()
        let startDate: Date
        let endDate = new Date(today)

        switch (range) {
            case 'day':
                startDate = new Date(today)
                startDate.setHours(0, 0, 0, 0)
                break
            case 'week':
                startDate = new Date(today)
                startDate.setDate(today.getDate() - today.getDay())
                startDate.setHours(0, 0, 0, 0)
                break
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1)
                break

            default:
                startDate = new Date(today)
                startDate.setDate(today.getDate() - 7)
        }

        return {
            start_date: formatDateToLocalString(startDate),
            end_date: formatDateToLocalString(endDate),
        }
    }

    const handleExport = async () => {
        try {
            setIsExporting(true)
            const dateParams = getDateRange(dateRange)
            const response = await reportsApi.exportProductivity(productivityMode, {
                ...dateParams,
                period: dateRange,
                assignee_id: productivityMode === 'individual' ? selectedIndividualId : null
            })
            const blob = new Blob([response.data], {
                type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            const filename = `productivity-${productivityMode}-${dateParams.start_date}-to-${dateParams.end_date}.xlsx`
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Export failed:', error)
        } finally {
            setIsExporting(false)
        }
    }

    useEffect(() => {
        if (productivityMode === 'individual' && !selectedIndividualId && members.length > 0) {
            setSelectedIndividualId(members[0].id)
        }
    }, [productivityMode, members, selectedIndividualId])


    const fetchReports = async () => {
        try {
            setIsLoading(true)
            const dateParams = getDateRange(dateRange)

            // In a real app, these might be separate calls based on active tab
            // for now we fetch all relevant to the view
            const [prod, util, burndown, velocity] = await Promise.all([
                reportsApi.getProductivity({
                    ...dateParams,
                    period: dateRange,
                    assignee_id: productivityMode === 'individual' ? selectedIndividualId : null
                }),
                reportsApi.getUtilization(dateParams),
                reportsApi.getBurndown('all'), // Assuming 'all' projects for overview
                reportsApi.getVelocity()
            ])

            if (prod.success) setProductivityData(prod.data)
            if (util.success) setUtilizationData(util.data)
            if (burndown.success) setBurndownData(burndown.data)
            if (velocity.success) setVelocityData(velocity.data)
        } catch (error) {
            console.error('Failed to fetch reports:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-brand-600" />
                        Reports & Analytics
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Track productivity, utilization, and delivery metrics
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none lg:w-40">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-full bg-white border-gray-200 h-9 text-sm justify-between shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-gray-200 shadow-2xl shadow-brand-100/20 p-1 bg-white ring-1 ring-black/5">
                                <SelectItem value="day" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors border-b border-gray-100 mb-0.5">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                                        Today
                                    </div>
                                </SelectItem>
                                <SelectItem value="week" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors border-b border-gray-100 mb-0.5">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                                        This Week
                                    </div>
                                </SelectItem>
                                <SelectItem value="month" className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <Calendar className="w-4 h-4 text-violet-500 shrink-0" />
                                        This Month
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        variant="outline"
                        className="flex-1 lg:flex-none bg-brand-600 text-white hover:bg-brand-700 hover:text-white h-9 px-3 text-sm"
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                                <span className="hidden xs:inline">Exporting...</span>
                                <span className="xs:hidden">...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-1 md:mr-2" />
                                Export
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <PageSkeleton />
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <TabsList className="bg-gray-100 p-1 rounded-lg h-auto shadow-inner flex-shrink-0">
                            <TabsTrigger
                                value="productivity"
                                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md h-9"
                            >
                                <Activity className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Productivity</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="burndown"
                                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md h-9"
                            >
                                <TrendingUp className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Burndown</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="velocity"
                                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md h-9"
                            >
                                <BarChart3 className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Velocity</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Divider */}
                        {activeTab === 'productivity' && (
                            <div className="h-7 w-px bg-gray-200 hidden sm:block" />
                        )}

                        {/* Productivity Specific Toggles */}
                        {activeTab === 'productivity' && (
                            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-400">
                                <div className="flex bg-gray-100/80 p-0.5 rounded-xl border border-gray-200/50">
                                    <button
                                        onClick={() => setProductivityMode('team')}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                                            productivityMode === 'team'
                                                ? "bg-white text-brand-600 shadow-md"
                                                : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        <span>Team</span>
                                    </button>
                                    <button
                                        onClick={() => setProductivityMode('individual')}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                                            productivityMode === 'individual'
                                                ? "bg-white text-brand-600 shadow-md"
                                                : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <UserIcon className="w-3.5 h-3.5" />
                                        <span>Individual</span>
                                    </button>
                                </div>

                                {productivityMode === 'individual' && (
                                    <Select value={selectedIndividualId || ''} onValueChange={setSelectedIndividualId}>
                                        <SelectTrigger className="w-[160px] sm:w-[180px] h-9 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium shadow-sm">
                                            <SelectValue placeholder="Select Member" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-gray-200 shadow-2xl shadow-brand-100/20 p-1 bg-white ring-1 ring-black/5">
                                            {members.map(member => (
                                                <SelectItem key={member.id} value={member.id} className="cursor-pointer rounded-xl py-2 px-3 focus:bg-brand-50/80 transition-colors mb-0.5">
                                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                                        <UserAvatar user={member} className="w-5 h-5" />
                                                        <span className="font-medium">{member.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                            </div>
                        )}
                    </div>

                    {/* Productivity Tab */}
                    <TabsContent value="productivity" className="space-y-6">

                        <Card className="border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden bg-gradient-to-br from-white to-gray-50/50">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                                            {productivityMode === 'team' ? 'Team Performance' : 'Individual Performance'}
                                        </CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Logged vs Expected hours for this {dateRange}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 px-2 sm:px-6 pb-6">
                                <div className="w-full overflow-x-auto no-scrollbar">
                                    <div className="h-[350px] sm:h-[400px] min-w-[700px] w-full pr-4">
                                        {productivityData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={productivityData}>
                                                    <defs>
                                                        <linearGradient id="colorLogged" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tickFormatter={(v) => {
                                                            const d = new Date(v)
                                                            return dateRange === 'day'
                                                                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                                                        }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                        dy={10}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                        dx={-10}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: '#fff',
                                                            borderRadius: '16px',
                                                            border: 'none',
                                                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                            padding: '12px'
                                                        }}
                                                    />
                                                    <Legend verticalAlign="top" height={36} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="logged"
                                                        stroke="#8b5cf6"
                                                        strokeWidth={3}
                                                        fillOpacity={1}
                                                        fill="url(#colorLogged)"
                                                        name="Logged Hours"
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="expected"
                                                        stroke="#94a3b8"
                                                        strokeWidth={2}
                                                        strokeDasharray="5 5"
                                                        fill="transparent"
                                                        name="Expected Hours"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                                <Activity className="w-8 h-8 opacity-20" />
                                                <p>No productivity data available for this range</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Team Utilization</CardTitle>
                            </CardHeader>
                            <CardContent className="px-2 sm:px-6 pb-4">
                                <div className="w-full overflow-x-auto no-scrollbar">
                                    <div className="min-w-[500px] w-full">
                                        <ScrollArea className="h-[450px] w-full pr-4">
                                            <div style={{ height: Math.max(300, utilizationData.length * 50) }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={utilizationData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                                                        <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" />
                                                        <YAxis
                                                            type="category"
                                                            dataKey="userName"
                                                            stroke="#9CA3AF"
                                                            width={120}
                                                            tick={{ fontSize: 12 }}
                                                        />
                                                        <Tooltip
                                                            cursor={{ fill: 'transparent' }}
                                                            contentStyle={{
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                            }}
                                                        />
                                                        <Bar
                                                            dataKey="productivityPercentage"
                                                            fill="#6366F1"
                                                            radius={[0, 4, 4, 0]}
                                                            name="Productivity %"
                                                            barSize={24}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Burndown Tab */}
                    <TabsContent value="burndown">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sprint Burndown</CardTitle>
                            </CardHeader>
                            <CardContent className="px-2 sm:px-6 pb-4">
                                <div className="w-full overflow-x-auto no-scrollbar">
                                    <div className="h-[350px] sm:h-[400px] min-w-[600px] w-full pr-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={burndownData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                                    stroke="#9CA3AF"
                                                />
                                                <YAxis stroke="#9CA3AF" />
                                                <Tooltip />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="remaining"
                                                    stroke="#6366F1"
                                                    strokeWidth={2}
                                                    dot={{ fill: '#6366F1' }}
                                                    name="Remaining Work"
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="ideal"
                                                    stroke="#9CA3AF"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    name="Ideal Burndown"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Velocity Tab */}
                    <TabsContent value="velocity">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sprint Velocity</CardTitle>
                            </CardHeader>
                            <CardContent className="px-2 sm:px-6 pb-4">
                                <div className="w-full overflow-x-auto no-scrollbar">
                                    <div className="h-[350px] sm:h-[400px] min-w-[600px] w-full pr-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={velocityData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                                <XAxis dataKey="sprint" stroke="#9CA3AF" />
                                                <YAxis stroke="#9CA3AF" />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="committed" fill="#336ad7ff" name="Committed" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="completed" fill="#22C55E" name="Completed" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}

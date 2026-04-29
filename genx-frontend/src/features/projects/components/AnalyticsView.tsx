import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useStatusStore } from '@/stores'
import { CheckCircle2, AlertCircle, Clock, ListTodo } from 'lucide-react'
import type { Task } from '@/types'
import { UserAvatar } from '@/components/UserAvatar'
import { formatHours, isOverdue } from '@/lib/utils'

interface AnalyticsViewProps {
    projectId: string
    tasks: Task[]
}

export function AnalyticsView({ projectId, tasks }: AnalyticsViewProps) {
    const { statuses } = useStatusStore()
    void projectId

    // Status Distribution Data
    const statusData = statuses.map(status => {
        const count = tasks.filter(t => t.status === status.slug).length
        return {
            name: status.name,
            value: count,
            color: status.color || '#6b7280'
        }
    }).filter(d => d.value > 0)

    // Priority Distribution Data (Unused for now but kept for future expansion)
    // const priorityData = Object.keys(priorityConfig).map(priority => {
    //     const count = tasks.filter(t => t.priority === priority).length
    //     return {
    //         name: priorityConfig[priority as keyof typeof priorityConfig].label,
    //         count: count,
    //         color: priorityConfig[priority as keyof typeof priorityConfig].color
    //     }
    // })

    // Assignee Workload
    const assigneeDataMap = new Map<string, { count: number; assigneeId?: string; assigneeAvatar?: string }>()
    tasks.forEach(t => {
        if (!t.assigneeName) return
        const current = assigneeDataMap.get(t.assigneeName) || { count: 0 }
        assigneeDataMap.set(t.assigneeName, {
            count: current.count + 1,
            assigneeId: t.assigneeId,
            assigneeAvatar: t.assigneeAvatar
        })
    })

    const assigneeData = Array.from(assigneeDataMap.entries())
        .map(([name, data]) => ({
            name,
            fullName: name,
            tasks: data.count,
            assigneeId: data.assigneeId,
            assigneeAvatar: data.assigneeAvatar
        }))
        .sort((a, b) => b.tasks - a.tasks) // Sort by task count descending

    // KPIs
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const overdueTasks = tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
    const overdueRate = totalTasks ? Math.round((overdueTasks / totalTasks) * 100) : 0

    // Calculate total estimated hours from all tasks and their subtasks
    const totalEstimatedHours = tasks.reduce((total, task) => {
        const taskHours = task.estimatedHours || 0
        const subtaskHours = (task.subtasks || []).reduce((subTotal, subtask) => {
            return subTotal + (subtask.estimatedHours || 0)
        }, 0)
        return total + taskHours + subtaskHours
    }, 0)

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <ListTodo className="w-4 h-4" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{totalTasks}</h3>
                            </div>
                            <span className="text-xs font-medium text-blue-500 bg-blue-100 px-2 py-1 rounded-full">Tasks</span>
                        </div>
                        <p className="text-xs text-gray-500">Total tasks in project</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{completedTasks}</h3>
                            </div>
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">{completionRate}%</span>
                        </div>
                        <p className="text-xs text-gray-500">Completed tasks</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{overdueTasks}</h3>
                            </div>
                            <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">{overdueRate}%</span>
                        </div>
                        <p className="text-xs text-gray-500">Overdue tasks</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{formatHours(totalEstimatedHours)}</h3>
                            </div>
                            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Hours</span>
                        </div>
                        <p className="text-xs text-gray-500">Total estimated hours</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Task Status</CardTitle>
                        <CardDescription>Distribution of tasks by current status</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Assignee Workload */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Team Workload</CardTitle>
                        <CardDescription>Number of tasks assigned per member</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {assigneeData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <ListTodo className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-sm">No assigned tasks</p>
                            </div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white border-b z-10">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Member</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tasks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assigneeData.map((member) => {
                                            const maxTasks = Math.max(...assigneeData.map(m => m.tasks), 1)
                                            return (
                                                <tr key={member.assigneeId || member.name} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar
                                                                user={{
                                                                    id: member.assigneeId || '',
                                                                    name: member.name,
                                                                    avatar: member.assigneeAvatar
                                                                }}
                                                                className="h-8 w-8"
                                                                fallbackClassName="text-xs"
                                                            />
                                                            <span className="text-sm font-medium text-gray-900">{member.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className="text-sm font-semibold text-gray-900">{member.tasks}</span>
                                                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-brand-600 transition-all"
                                                                    style={{ width: `${Math.min((member.tasks / maxTasks) * 100, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

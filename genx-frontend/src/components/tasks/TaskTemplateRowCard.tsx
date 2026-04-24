import {
    Clock,
    Briefcase,
    Tag,
} from 'lucide-react'
import { priorityConfig } from '@/mock'
import { TaskTemplate } from '@/types'

interface TaskTemplateRowCardProps {
    template: TaskTemplate
    onClick: () => void
}

export function TaskTemplateRowCard({ template, onClick }: TaskTemplateRowCardProps) {
    const priority = template.priority ? priorityConfig[template.priority as keyof typeof priorityConfig] : null

    // Format estimated hours
    const formatEstHours = (hours: any) => {
        if (hours == null || hours === '') return null
        const n = typeof hours === 'string' ? parseFloat(hours) : hours
        const h = Math.floor(n)
        const m = Math.round((n % 1) * 60)
        return m > 0 ? `${h}h ${m}m` : `${h}h`
    }

    const est = formatEstHours(template.estimated_hours)

    return (
        <div
            onClick={onClick}
            className="group block p-4 bg-white hover:bg-slate-50 border border-gray-200 rounded-2xl shadow-sm transition-all cursor-pointer"
        >
            <div className="flex flex-col gap-1.5">
                {/* Header: Title */}
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-[15px] sm:text-base font-semibold text-slate-800 transition-colors line-clamp-1 leading-tight group-hover:text-brand-600">
                        {template.title}
                    </h3>
                </div>

                {/* Meta Row: Project/Est (Left), Priority (Right) */}
                <div className="flex items-center justify-between gap-4 mt-0.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px] font-medium">
                        {template.project && (
                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 min-w-0">
                                <Briefcase className="w-3 h-3 text-brand-400" />
                                <span className="max-w-[120px] truncate">
                                    {template.project.title}
                                </span>
                            </div>
                        )}

                        {est && (
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-100 whitespace-nowrap">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Est. {est}
                            </div>
                        )}
                    </div>

                    {priority && (
                        <div
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap border border-black/5 shrink-0 shadow-sm"
                            style={{ backgroundColor: priority.bgColor, color: priority.color }}
                        >
                            <Tag className="w-2.5 h-2.5" />
                            {priority.label}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}


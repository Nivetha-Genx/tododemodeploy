import { Clock, Briefcase, MoreHorizontal, Pencil, Trash2, Tag, Play } from 'lucide-react'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import { priorityConfig } from '@/mock'
import type { TaskTemplate } from '@/types'
import { stripHtml } from '@/lib/utils'

function formatHours(h: number | string | null | undefined): string {
    if (h == null || h === '') return ''
    const n = typeof h === 'string' ? parseFloat(h) : h
    if (Number.isNaN(n)) return ''
    const hours = Math.floor(n)
    const minutes = Math.round((n % 1) * 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

interface TaskTemplateRowCardProps {
    template: TaskTemplate
    onUseTemplate?: () => void
    onEdit?: () => void
    onDelete?: () => void
}

export function TaskTemplateRowCard({ template, onUseTemplate, onEdit, onDelete }: TaskTemplateRowCardProps) {
    const priority = template.priority ? priorityConfig[template.priority as keyof typeof priorityConfig] : null

    return (
        <div
            className="group relative bg-white border border-gray-200 p-4 sm:p-5 rounded-2xl shadow-sm mb-3 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-[0_8px_30px_rgba(99,102,241,0.12)]"
        >
            <div className="flex items-center gap-4 sm:gap-6">
                {/* Content Section */}
                <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 transition-colors line-clamp-1 leading-tight group-hover:text-brand-600">
                            {template.title}
                        </h3>
                        {template.description && (
                            <p className="text-[13px] text-slate-500 line-clamp-1 leading-relaxed">
                                {stripHtml(template.description)}
                            </p>
                        )}
                    </div>

                    {/* Footer Actions & Meta */}
                    <div className="flex items-center flex-wrap gap-2 sm:gap-3 mt-2">
                        {onUseTemplate && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUseTemplate();
                                }}
                                className="bg-brand-50 text-brand-700 border border-brand-200
                                    px-3 py-1.5 rounded-full
                                    text-[10px] sm:text-[11px] font-black uppercase tracking-wider
                                    flex items-center gap-2
                                    hover:bg-brand-100 hover:border-brand-300
                                    transition-all duration-200 shrink-0"
                            >
                                <Play className="w-2.5 h-2.5 sm:w-3 h-3" fill="currentColor" />
                                Quick Create
                            </button>
                        )}

                        <div className="flex items-center flex-wrap gap-2 text-slate-400 text-[10px] sm:text-xs font-semibold">
                            {template.project && (
                                <div className="flex items-center gap-1.5 min-w-0 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
                                    <Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-400" />
                                    <span className="max-w-[100px] sm:max-w-[150px] truncate">{template.project.title}</span>
                                </div>
                            )}
                            
                            {(template.estimated_hours != null && template.estimated_hours !== '') && (
                                <div className="flex items-center gap-1.5 whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                                    <span>Est. {formatHours(template.estimated_hours)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Column (Centered Right) */}
                <div className="flex flex-col items-end justify-center gap-2 sm:gap-3 pl-4 sm:pl-6 border-l border-slate-100 shrink-0 min-h-[60px] sm:min-h-[70px]">
                    {priority && (
                        <div 
                            className="flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold sm:font-black whitespace-nowrap border border-black/5 shadow-sm"
                            style={{ backgroundColor: priority.bgColor, color: priority.color }}
                        >
                            <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {priority.label}
                        </div>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 hover:bg-slate-100 rounded-full transition-all duration-200 shadow-sm border border-slate-100 bg-slate-50/50"
                            >
                                <MoreHorizontal className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="rounded-xl border-gray-100 shadow-xl">
                            {onEdit && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-lg gap-2 focus:bg-brand-50 focus:text-brand-600 cursor-pointer">
                                    <Pencil className="w-4 h-4" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                            )}
                            {onDelete && (
                                <DropdownMenuItem className="text-red-600 rounded-full gap-2 focus:bg-red-50 focus:text-red-600 cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}

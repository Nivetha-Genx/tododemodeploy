import { Skeleton } from "./skeleton"
import { cn } from "@/lib/utils"

interface ModalSkeletonProps {
    className?: string
    rows?: number
}

export function ModalSkeleton({ className, rows = 4 }: ModalSkeletonProps) {
    return (
        <div className={cn("space-y-6 py-4", className)}>
            <div className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-[80px]" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
            <div className="flex justify-end gap-3 pt-4">
                <Skeleton className="h-10 w-[100px]" />
                <Skeleton className="h-10 w-[100px]" />
            </div>
        </div>
    )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function FormFieldSkeleton() {
    return (
        <div className="flex items-center gap-3 py-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-4 w-4" />
        </div>
    )
}

export function DetailDrawerSkeleton() {
    return (
        <div className="space-y-0">
            {/* Title Skeleton */}
            <div className="px-4 py-3 border-b border-gray-100">
                <Skeleton className="h-7 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4" />
            </div>

            {/* Rows */}
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border-b border-gray-100 px-4">
                    <FormFieldSkeleton />
                </div>
            ))}

            {/* Description */}
            <div className="px-4 py-4 space-y-3">
                <Skeleton className="h-3 w-20" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>
        </div>
    )
}

export function TaskCardSkeleton() {
    return (
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-3">
            <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-24 ml-auto" />
            </div>
        </div>
    )
}

interface PageSkeletonProps {
    showSummaryCard?: boolean
    tasksCount?: number
}

export function PageSkeleton({ showSummaryCard = false, tasksCount = 5 }: PageSkeletonProps) {
    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between px-1">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-20 rounded-lg" />
            </div>

            <div className="flex-1 flex flex-col space-y-4">
                {/* Summary Card Skeleton */}
                {showSummaryCard && (
                    <div className="mx-1 p-4 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-3">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    </div>
                )}

                {/* Search & Filter Skeleton */}
                <div className="px-1 space-y-4">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <div className="flex gap-2 overflow-hidden">
                        <Skeleton className="h-9 w-16 rounded-full shrink-0" />
                        <Skeleton className="h-9 w-24 rounded-full shrink-0" />
                        <Skeleton className="h-9 w-20 rounded-full shrink-0" />
                        <Skeleton className="h-9 w-28 rounded-full shrink-0" />
                    </div>
                </div>

                {/* Task List Skeleton */}
                <div className="flex-1 px-1 space-y-4">
                    {Array.from({ length: tasksCount }).map((_, i) => (
                        <TaskCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export function ProjectCardSkeleton() {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full animate-pulse">
            <div className="p-6 pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
            <div className="px-6 flex-1 flex flex-col gap-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-10" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto pb-4">
                    <Skeleton className="h-4 w-20" />
                </div>
            </div>
        </div>
    )
}

export function ProjectDetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1">
                <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg shadow-sm" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 mr-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="w-8 h-8 rounded-full border-2 border-white" />
                        ))}
                    </div>
                    <Skeleton className="h-10 w-28 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
            </div>

            <div className="flex gap-4 border-b border-gray-100 pb-px px-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24 rounded-t-lg" />
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                        <Skeleton className="h-6 w-40" />
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                        <Skeleton className="h-6 w-32" />
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex justify-between border-b border-gray-50 pb-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function CreateTaskModalSkeleton() {
    return (
        <>
            {/* Desktop Skeleton */}
            <div className="hidden md:block space-y-0 animate-pulse">
                {/* Title Skeleton */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-center">
                    <Skeleton className="h-9 w-1/2" />
                </div>

                {/* Description Skeleton */}
                <div className="border-b border-gray-100 px-4 py-5">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-2/3" />
                    </div>
                </div>

                {/* Form Fields: Status, Priority, Estimated Hours, Sprint, Story Points, Start Date, Due Date, Assignee, Project */}
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border-b border-gray-100 px-4">
                        <FormFieldSkeleton />
                    </div>
                ))}

                {/* Attachment Field */}
                <div className="border-b border-gray-100 px-4 py-3">
                    <div className="flex items-start gap-3">
                        <Skeleton className="h-5 w-5 rounded shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-1/4" />
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/5 mt-1" />
                        </div>
                        <Skeleton className="h-4 w-4 shrink-0" />
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 p-4">
                    <Skeleton className="flex-1 h-10 rounded-md" />
                    <Skeleton className="flex-1 h-10 rounded-md" />
                </div>
            </div>

            {/* Mobile Skeleton */}
            <div className="md:hidden space-y-3 animate-pulse">
                <div className="flex items-center gap-2 rounded-2xl bg-white px-1">
                    <Skeleton className="h-9 flex-1 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                </div>

                <div className="flex items-center justify-between pt-1 px-1">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-[68px] rounded-full shrink-0" />
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                </div>
            </div>
        </>
    )
}

export function ActivitySkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm animate-pulse">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0 bg-gray-100" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full rounded bg-gray-100" />
                        <div className="flex items-center gap-1.5 pt-1">
                            <Skeleton className="h-3 w-3 rounded-full bg-gray-100" />
                            <Skeleton className="h-3 w-24 rounded bg-gray-100" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}


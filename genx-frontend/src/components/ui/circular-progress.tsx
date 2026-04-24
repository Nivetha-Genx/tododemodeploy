import * as React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps {
    value: number
    size?: number
    strokeWidth?: number
    className?: string
    color?: string
    children?: React.ReactNode
}

export function CircularProgress({
    value,
    size = 160,
    strokeWidth = 12,
    className,
    color,
    children
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (value / 100) * circumference

    // Determine color based on value if not provided
    const getAutoColor = (val: number) => {
        if (val >= 100) return "#10b981" 
        if (val >= 80) return "#14b8a6"
        if (val >= 60) return "#f59e0b" 
        if (val >= 40) return "#e61a1aff" 
        return "#e61a1aff" 
    }

    const strokeColor = color || getAutoColor(value)

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-in-out"
                />
            </svg>
            {/* Content in center */}
            {children && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {children}
                </div>
            )}
        </div>
    )
}


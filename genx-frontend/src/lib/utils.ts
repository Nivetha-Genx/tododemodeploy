import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { Layout, Globe, Smartphone, Database, Server, Code2, Briefcase, Folder } from 'lucide-react'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | undefined | null): string {
    if (!date) return 'N/A'
    const d = parseISOToLocal(date)
    if (!d) return 'N/A'
    return format(d, "MMM do yyyy")
}

/**
 * Format a Date object as YYYY-MM-DD in LOCAL timezone (not UTC).
 * Use this instead of date.toISOString().split('T')[0] to avoid timezone shift issues.
 */
export function formatDateToLocalString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function formatDateTime(date: string | Date | undefined | null): string {
    if (!date) return 'N/A'
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'N/A'
    return format(d, "MMM do yyyy, hh:mm a")
}

export function formatRelativeTime(date: string | Date | undefined | null): string {
    if (!date) return 'N/A'
    const then = new Date(date)
    if (isNaN(then.getTime())) return 'N/A'
    const now = new Date()
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(date)
}

export function getInitials(name: string | undefined | null): string {
    if (!name) return '?'
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function calculateProgress(completed: number, total: number): number {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
}

export function formatHours(hours: number): string {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

export function formatHoursMinutes(hours: number): string {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${String(m).padStart(2, '0')}`
}

/**
 * Safely parse a YYYY-MM-DD string as a LOCAL date, avoiding UTC shifts.
 */
export function parseISOToLocal(dateStr: string | Date | null | undefined): Date | null {
    if (!dateStr) return null
    if (dateStr instanceof Date) return dateStr

    // If it's a YYYY-MM-DD format (10 chars), parse it manually to avoid UTC shifts
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number)
        return new Date(year, month - 1, day)
    }

    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
}

export function isOverdue(dueDate: string | null | undefined): boolean {
    if (!dueDate) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const due = parseISOToLocal(dueDate)
    if (!due) return false

    due.setHours(0, 0, 0, 0)
    return due < today
}

export function getDaysUntilDue(dueDate: string): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = parseISOToLocal(dueDate)
    if (!due) return 0
    due.setHours(0, 0, 0, 0)
    const diffMs = due.getTime() - today.getTime()
    return Math.ceil(diffMs / 86400000)
}

// Helper to get consistent random color based on string
export function getRandomColor(str: string): string {
    const colors = [
        'bg-red-100 text-red-600',
        'bg-orange-100 text-orange-600',
        'bg-amber-100 text-amber-600',
        'bg-green-100 text-green-600',
        'bg-emerald-100 text-emerald-600',
        'bg-teal-100 text-teal-600',
        'bg-cyan-100 text-cyan-600',
        'bg-blue-100 text-blue-600',
        'bg-indigo-100 text-indigo-600',
        'bg-violet-100 text-violet-600',
        'bg-purple-100 text-purple-600',
        'bg-fuchsia-100 text-fuchsia-600',
        'bg-pink-100 text-pink-600',
        'bg-rose-100 text-rose-600',
    ]
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

// Helper to get consistent random icon based on string
export function getRandomIcon(str: string) {
    const icons = [Layout, Globe, Smartphone, Database, Server, Code2, Briefcase, Folder]
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return icons[Math.abs(hash) % icons.length]
}

export function getErrorMessage(error: any): string {
    if (!error) return 'An unexpected error occurred';

    if (error.response?.data) {
        const data = error.response.data;
        if (data.errors) {
            // Handle Laravel-style validation errors
            return Object.values(data.errors).flat().join(' ');
        }
        if (data.message) {
            return data.message;
        }
    }

    if (error.message) {
        return error.message;
    }

    return 'An unexpected error occurred';
}

export function stripHtml(html: string): string {
    if (!html) return '';

    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    return (tmp.textContent || tmp.innerText || "")
        .replace(/\u00A0/g, " ")
        .trim();
}

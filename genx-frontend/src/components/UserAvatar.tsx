import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

interface UserAvatarProps {
    user?: {
        id: string
        name: string
        avatar?: string
        avatar_url?: string
    }
    className?: string
    fallbackClassName?: string
}

const COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
    "bg-cyan-100 text-cyan-700",
]

export function UserAvatar({ user, className = "h-8 w-8", fallbackClassName }: UserAvatarProps) {
    if (!user) {
        return (
            <Avatar className={className} title="Unassigned">
                <AvatarFallback className={fallbackClassName}>?</AvatarFallback>
            </Avatar>
        )
    }

    // Get a consistent color based on user ID
    const colorIndex = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLORS.length
    const colorClass = COLORS[colorIndex]

    return (
        <Avatar className={className} title={user.name || 'Unassigned'}>
            {user.avatar_url || user.avatar ? (
                <AvatarImage src={user.avatar_url || user.avatar} alt={user.name || 'User'} />
            ) : null}
            <AvatarFallback className={`${colorClass} ${fallbackClassName}`}>
                {getInitials(user.name)}
            </AvatarFallback>
        </Avatar>
    )
}

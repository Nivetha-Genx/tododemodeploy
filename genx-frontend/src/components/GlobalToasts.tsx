import { useEffect, useRef } from "react"
import { toast } from "@/components/ui/use-toast"
import { useNotificationStore } from "@/stores/notificationStore"

export function GlobalToasts() {
    const { notifications, dismiss } = useNotificationStore()
    const displayedToasts = useRef(new Set<string>())

    useEffect(() => {
        notifications.forEach((n) => {
            const toastId = n.id
            if (!displayedToasts.current.has(toastId)) {
                displayedToasts.current.add(toastId)
                
                toast({
                    title: n.title,
                    description: n.message,
                    variant: n.type as any,
                    duration: n.duration || 5000,
                })

                // Cleanup store after duration + a small buffer
                setTimeout(() => {
                    dismiss(n.id)
                    displayedToasts.current.delete(toastId)
                }, (n.duration || 5000) + 1000)
            }
        })
    }, [notifications, dismiss])

    return null
}

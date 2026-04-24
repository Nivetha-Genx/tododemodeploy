import { useEffect } from "react"
import { toast } from "react-toastify"
import { useNotificationStore } from "@/stores/notificationStore"

export function GlobalToasts() {
    const { notifications, dismiss } = useNotificationStore()

    useEffect(() => {
        notifications.forEach((n) => {
            const toastId = n.id
            if (!toast.isActive(toastId)) {
                toast(
                    <div>
                        {n.title && <div className="font-bold">{n.title}</div>}
                        <div>{n.message}</div>
                    </div>,
                    {
                        toastId,
                        type: n.type === "error" ? "error" : n.type === "success" ? "success" : n.type === "warning" ? "warning" : "info",
                        onClose: () => dismiss(n.id),
                        autoClose: n.duration || 5000,
                        pauseOnHover: true,
                        pauseOnFocusLoss: true,
                        draggable: true,
                    }
                )
            }
        })
    }, [notifications, dismiss])

    return null
}

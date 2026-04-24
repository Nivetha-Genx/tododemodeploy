import * as React from "react"
import { toast as toastify } from "react-toastify"

export type ToastProps = {
    title?: React.ReactNode
    description?: React.ReactNode
    variant?: "default" | "destructive" | "success" | "warning" | "info"
    duration?: number
    progress?: number
}

function toast({ title, description, variant, duration = 5000, progress }: ToastProps) {
    const type = variant === "destructive" ? "error" : variant === "success" ? "success" : variant === "warning" ? "warning" : variant === "info" ? "info" : "default"

    const content = (
        <div>
            {title && <div className="font-bold">{title}</div>}
            {description && <div>{description}</div>}
        </div>
    )

    const id = toastify(content, {
        type: (type === "default" ? "info" : type) as any,
        autoClose: duration,
        progress,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
        draggable: true,
    })

    return {
        id,
        dismiss: () => toastify.dismiss(id),
        update: (props: ToastProps) => {
            const newType = props.variant === "destructive" ? "error" : props.variant === "success" ? "success" : props.variant === "warning" ? "warning" : props.variant === "info" ? "info" : "default"
            toastify.update(id, {
                render: (
                    <div>
                        {props.title && <div className="font-bold">{props.title}</div>}
                        {props.description && <div>{props.description}</div>}
                    </div>
                ),
                type: (newType === "default" ? "info" : newType) as any,
                autoClose: props.duration,
                progress: props.progress,
                pauseOnHover: true,
                pauseOnFocusLoss: true,
                draggable: true,
            })
        },
    }
}

function useToast() {
    return {
        toast,
        dismiss: (id?: string | number) => toastify.dismiss(id),
        toasts: [] as any[],
    }
}

export { useToast, toast }

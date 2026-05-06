import * as React from "react"
import toastHot, { Toast } from "react-hot-toast"
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"

export type ToastProps = {
    title?: React.ReactNode
    description?: React.ReactNode
    variant?: "default" | "destructive" | "success" | "warning" | "info"
    duration?: number
    progress?: number
}

const PremiumToast = ({ t, title, description, variant }: { t: Toast, title?: React.ReactNode, description?: React.ReactNode, variant?: string }) => {
    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        destructive: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        default: <Info className="w-5 h-5 text-gray-500" />,
    }

    const icon = icons[variant as keyof typeof icons] || icons.default

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-[360px] w-full bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 border border-white/20`}
            style={{
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
        >
            <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {icon}
                    </div>
                    <div className="ml-3 flex-1">
                        {title && <p className="text-sm font-semibold text-gray-900 leading-tight">{title}</p>}
                        {description && <p className={`mt-1 text-sm text-gray-500 leading-relaxed ${title ? '' : 'font-medium text-gray-700'}`}>{description}</p>}
                    </div>
                </div>
            </div>
            <div className="flex border-l border-gray-100">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toastHot.dismiss(t.id);
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

function toast({ title, description, variant, duration = 5000 }: ToastProps) {
    const id = toastHot.custom(
        (t) => <PremiumToast t={t} title={title} description={description} variant={variant} />,
        { duration }
    );

    return {
        id,
        dismiss: () => toastHot.dismiss(id),
        update: (props: ToastProps) => {
            toastHot.custom(
                (t) => <PremiumToast t={t} title={props.title} description={props.description} variant={props.variant} />,
                { id, duration: props.duration }
            );
        },
    }
}

function useToast() {
    return {
        toast,
        dismiss: (id?: string) => toastHot.dismiss(id),
        toasts: [] as any[],
    }
}

export { useToast, toast }

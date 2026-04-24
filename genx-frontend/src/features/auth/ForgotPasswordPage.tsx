import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useNotificationStore } from '@/stores/notificationStore'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
    Input,
    Label,
} from '@/components/ui'
import { CheckCircle2, Mail, ArrowLeft, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
    const navigate = useNavigate()
    const { show } = useNotificationStore()
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    })

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true)
        try {
            const response = await authApi.forgotPassword({ login: data.email })
            if (response.success) {
                show({ type: 'success', title: 'Code Sent', message: response.message || 'Check your email for the verification code.' })
                navigate('/forgot-password/otp', { state: { email: data.email } })
            } else {
                show({ type: 'error', title: 'Failed', message: response.message || 'Could not send the verification code.' })
            }
        } catch (err: any) {
            show({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Something went wrong. Please try again.' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
            <div className="w-full max-w-md">
                {/* Logo — matches LoginPage */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">Project Management</span>
                </div>

                <Card className="shadow-lg border-0">
                    <CardHeader className="text-center pb-2">
                        {/* Icon badge */}
                        <div className="mx-auto w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-brand-100">
                            <Mail className="w-7 h-7 text-brand-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
                        <CardDescription className="mt-1">
                            No worries! Enter your registered email address and we'll send you a verification code.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="fp-email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="fp-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        {...register('email')}
                                        className={cn('pl-10', errors.email && 'border-red-500')}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        Sending Code...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Send className="w-4 h-4" />
                                        Send Verification Code
                                    </span>
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors mt-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Sign In
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/api/auth'
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
import { CheckCircle2, Lock, Eye, EyeOff, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notificationStore'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const resetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
            .regex(/[0-9]/, 'Must contain at least one number')
            .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
        password_confirmation: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: "Passwords don't match",
        path: ['password_confirmation'],
    })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

function PasswordStrengthBar({ password }: { password: string }) {
    const checks = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ]
    const score = checks.filter(Boolean).length

    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
    const labels = ['Weak', 'Fair', 'Good', 'Strong']

    if (!password) return null

    return (
        <div className="space-y-1.5 mt-2">
            <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors duration-300',
                            i < score ? colors[score - 1] : 'bg-gray-200'
                        )}
                    />
                ))}
            </div>
            <p className={cn('text-xs font-medium', score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-500' : score === 3 ? 'text-yellow-600' : 'text-green-600')}>
                {labels[score - 1] || ''}
            </p>
        </div>
    )
}

export function ResetPasswordPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { show } = useNotificationStore()
    const login: string = (location.state as any)?.login || ''
    const otp: string = (location.state as any)?.otp || ''
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [success, setSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: '', password_confirmation: '' },
    })

    const passwordValue = watch('password')

    const onSubmit = async (data: ResetPasswordFormValues) => {
        setIsLoading(true)
        try {
            const response = await authApi.resetPassword({
                login,
                otp,
                password: data.password,
                password_confirmation: data.password_confirmation,
            })
            if (response.success) {
                show({ type: 'success', title: 'Password Reset!', message: response.message || 'Your password has been reset successfully.' })
                setSuccess(true)
                setTimeout(() => navigate('/login'), 2000)
            } else {
                show({ type: 'error', title: 'Reset Failed', message: response.message || 'Failed to reset password. Please try again.' })
            }
        } catch (err: any) {
            show({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Something went wrong. Please try again.' })
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md text-center">
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
                    <p className="text-gray-500 mb-6">
                        Your password has been reset successfully. Redirecting to login…
                    </p>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600 mx-auto" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">Project Management</span>
                </div>

                <Card className="shadow-lg border-0">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-brand-100">
                            <KeyRound className="w-7 h-7 text-brand-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
                        <CardDescription className="mt-1">
                            Your new password must be different from your previous password.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="rp-password">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="rp-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        {...register('password')}
                                        className={cn('pl-10 pr-10', errors.password && 'border-red-500')}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                                )}
                                <PasswordStrengthBar password={passwordValue} />
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="rp-confirm">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="rp-confirm"
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        {...register('password_confirmation')}
                                        className={cn('pl-10 pr-10', errors.password_confirmation && 'border-red-500')}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-xs text-red-600 mt-1">{errors.password_confirmation.message}</p>
                                )}
                            </div>

                            {/* Password hints */}
                            <ul className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                {[
                                    { label: 'At least 8 characters', ok: passwordValue?.length >= 8 },
                                    { label: 'One uppercase letter', ok: /[A-Z]/.test(passwordValue || '') },
                                    { label: 'One number', ok: /[0-9]/.test(passwordValue || '') },
                                    { label: 'One special character (!@#$%^&*)', ok: /[^A-Za-z0-9]/.test(passwordValue || '') },
                                ].map(({ label, ok }) => (
                                    <li key={label} className={cn('flex items-center gap-2', ok ? 'text-green-600' : 'text-gray-400')}>
                                        <CheckCircle2 className={cn('w-3.5 h-3.5', ok ? 'text-green-500' : 'text-gray-300')} />
                                        {label}
                                    </li>
                                ))}
                            </ul>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        Resetting...
                                    </span>
                                ) : (
                                    'Reset Password'
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                            >
                                Back to Sign In
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

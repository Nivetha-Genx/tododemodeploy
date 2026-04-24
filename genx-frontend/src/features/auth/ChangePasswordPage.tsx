import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'
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
import { Lock, Eye, EyeOff, CheckCircle2, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notificationStore'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const changePasswordSchema = z.object({
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
})

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

function PasswordStrengthBar({ password }: { password: string }) {
    const checks = [
        (password || '').length >= 8,
        /[A-Z]/.test(password || ''),
        /[0-9]/.test(password || ''),
        /[^A-Za-z0-9]/.test(password || ''),
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

export function ChangePasswordPage() {
    const navigate = useNavigate()
    const { show } = useNotificationStore()
    const { setMustChangePassword, logout } = useAuthStore()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            password: '',
            password_confirmation: '',
        },
    })

    const passwordValue = watch('password')

    const onChangePasswordSubmit = async (data: ChangePasswordFormValues) => {
        setIsLoading(true)

        try {
            const response = await authApi.changePassword(data)
            if (response.success) {
                setMustChangePassword(false)
                show({
                    type: 'success',
                    title: 'Password Changed',
                    message: 'Your password has been updated successfully.'
                })
                navigate('/dashboard')
            } else {
                show({
                    type: 'error',
                    title: 'Update Failed',
                    message: response.message || 'Failed to update password. Please try again.'
                })
            }
        } catch (err: any) {
            console.error('Change password error:', err)
            show({
                type: 'error',
                title: 'Request Error',
                message: err.response?.data?.message || 'Failed to update password. Please check your connection.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
            <div className="w-full max-w-md">
                <Card className="shadow-lg border-0">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-brand-100">
                            <KeyRound className="w-7 h-7 text-brand-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Secure Your Account</CardTitle>
                        <CardDescription>
                            You logged in with a temporary password. Please set a new permanent password to continue.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onChangePasswordSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        {...register('password')}
                                        className={cn("pl-10 pr-10", errors.password && "border-red-500")}
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

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="password_confirmation"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        {...register('password_confirmation')}
                                        className={cn("pl-10 pr-10", errors.password_confirmation && "border-red-500")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-xs text-red-600 mt-1">{errors.password_confirmation.message}</p>
                                )}
                            </div>

                            {/* Password hints */}
                            <ul className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                {[
                                    { label: 'At least 8 characters', ok: (passwordValue || '').length >= 8 },
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
                                {isLoading ? 'Updating...' : 'Set Password & Continue'}
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-gray-500"
                                onClick={() => logout()}
                            >
                                Sign Out
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

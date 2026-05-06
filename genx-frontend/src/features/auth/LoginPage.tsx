import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { authApi, mapBackendUserToFrontend } from '@/api/auth'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
    Input,
    Label,
    Checkbox,
} from '@/components/ui'
import { CheckCircle2, Lock, Eye, EyeOff, Smartphone, Hash, ArrowLeft, UserRound } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'

export function LoginPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { show } = useNotificationStore()
    const { login: storeLogin } = useAuthStore()

    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [step, setStep] = useState<'login' | 'password' | 'otp'>('login')

    const [loginValue, setLoginValue] = useState('')
    const [password, setPassword] = useState('')
    const [otp, setOtp] = useState('')
    const [remember, setRemember] = useState(false)
    const [otpMobile, setOtpMobile] = useState('')

    const looksLikeEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim())

    const normalizeMobile = (value: string) => {
        const trimmed = value.trim()
        const digitsOnly = trimmed.replace(/\D/g, '')
        if (!digitsOnly) return trimmed
        if (trimmed.startsWith('+')) return trimmed
        if (digitsOnly.length === 10) return `${digitsOnly}`
        if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`
        return trimmed
    }

    const handlePostLogin = (response: any, isMobile: boolean = false) => {
        const mustChange = isMobile ? false : response.data.must_change_password
        const user = mapBackendUserToFrontend(
            response.data.user,
            mustChange
        )
        storeLogin(user, response.data.access_token)

        show({
            type: 'success',
            title: 'Authentication Successful',
            message: `Welcome back, ${user.name}`
        })

        if (mustChange) {
            navigate('/change-password')
        } else {
            const redirectTo = searchParams.get('redirect') || '/dashboard'
            navigate(redirectTo)
        }
    }

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault()
        const login = loginValue.trim()

        if (!login) {
            show({ type: 'error', title: 'Error', message: 'Please enter your email or mobile number' })
            return
        }

        if (looksLikeEmail(login)) {
            setStep('password')
            return
        }

        // Mobile flow
        setIsLoading(true)
        try {
            const response = await authApi.login({ login })
            if (response.success) {
                setOtpMobile(normalizeMobile(login))
                setStep('otp')
                show({
                    type: 'success',
                    title: 'OTP Sent',
                    message: 'Please check your mobile for the verification code.'
                })
            } else {
                show({
                    type: 'error',
                    title: 'Failed to send OTP',
                    message: response.message || 'Please check your mobile number.'
                })
            }
        } catch (err: any) {
            console.error('OTP request error:', err)
            show({
                type: 'error',
                title: 'Error',
                message: err.response?.data?.message || 'Failed to send OTP. Please try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        const login = loginValue.trim()
        const trimmedPassword = password.trim()

        if (!trimmedPassword) {
            show({ type: 'error', title: 'Error', message: 'Please enter your password' })
            return
        }

        setIsLoading(true)
        try {
            const response = await authApi.login({
                login,
                password: trimmedPassword,
                remember,
                device_name: 'Web Browser'
            })

            if (response.success) {
                handlePostLogin(response, false)
            } else {
                show({
                    type: 'error',
                    title: 'Login Failed',
                    message: response.message || 'Invalid credentials. Please try again.'
                })
            }
        } catch (err: any) {
            console.error('Password login error:', err)
            show({
                type: 'error',
                title: 'Authentication Error',
                message: err.response?.data?.message || 'Failed to sign in. Please check your credentials.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        const mobile = otpMobile.trim()
        const trimmedOtp = otp.trim()

        if (!trimmedOtp) {
            show({ type: 'error', title: 'Error', message: 'Please enter the OTP' })
            return
        }

        setIsLoading(true)
        try {
            const response = await authApi.validateOtp({
                mobile,
                otp: trimmedOtp,
                device_name: 'Web Browser'
            })

            if (response.success) {
                handlePostLogin(response, true)
            } else {
                show({
                    type: 'error',
                    title: 'Verification Failed',
                    message: response.message || 'Invalid OTP. Please try again.'
                })
            }
        } catch (err: any) {
            console.error('OTP verification error:', err)
            show({
                type: 'error',
                title: 'Authentication Error',
                message: err.response?.data?.message || 'Verification failed. Please try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleBack = () => {
        if (step === 'password') {
            setPassword('')
            setStep('login')
        } else if (step === 'otp') {
            setOtp('')
            setOtpMobile('')
            setStep('login')
        }
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
                        <CardTitle className="text-2xl">Welcome back</CardTitle>
                        <CardDescription>
                            Sign in to your account to continue
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {step !== 'login' && (
                            <button
                                onClick={handleBack}
                                className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
                                disabled={isLoading}
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back
                            </button>
                        )}

                        <form
                            onSubmit={
                                step === 'login' ? handleContinue :
                                    step === 'password' ? handlePasswordLogin :
                                        handleVerifyOtp
                            }
                            className="space-y-4"
                        >
                            {/* Email/Mobile Input */}
                            <div className="space-y-2">
                                <Label htmlFor="login-input">Email or Mobile</Label>
                                <div className="relative">
                                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="login-input"
                                        type="text"
                                        placeholder="you@example.com or mobile"
                                        value={loginValue}
                                        onChange={(e) => setLoginValue(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault() }}
                                        disabled={step !== 'login' || isLoading}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Password Step */}
                            {step === 'password' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === ' ') e.preventDefault() }}
                                            className="pl-10 pr-10"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="remember"
                                                checked={remember}
                                                onCheckedChange={(checked) => setRemember(!!checked)}
                                            />
                                            <Label
                                                htmlFor="remember"
                                                className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                                Stay signed in
                                            </Label>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                                            onClick={() => navigate('/forgot-password')}
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* OTP Step */}
                            {step === 'otp' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="bg-brand-50 p-3 rounded-lg border border-brand-100 flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-brand-600" />
                                        <div className="text-xs text-brand-800">
                                            OTP sent to <span className="font-bold">{otpMobile}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="otp">Verification Code</Label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                id="otp"
                                                type="text"
                                                placeholder="6-digit code"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                className="pl-10"
                                                maxLength={6}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="text-center mt-2">
                                            <button
                                                type="button"
                                                className="text-sm text-brand-600 hover:underline font-semibold"
                                                onClick={handleContinue}
                                                disabled={isLoading}
                                            >
                                                Resend OTP
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    step === 'otp' ? 'Verifying...' : 'Processing...'
                                ) : (
                                    step === 'login' ? 'Continue' :
                                        step === 'password' ? 'Sign In' :
                                            'Verify & Login'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

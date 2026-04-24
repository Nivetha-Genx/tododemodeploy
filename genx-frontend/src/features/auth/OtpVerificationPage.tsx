import { useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/api/auth'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
} from '@/components/ui'
import { CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const OTP_LENGTH = 6

export function OtpVerificationPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const email: string = (location.state as any)?.email || ''

    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    const otp = digits.join('')

    const focusBox = (index: number) => {
        inputRefs.current[index]?.focus()
    }

    const handleChange = useCallback((index: number, value: string) => {
        setError('')
        const digit = value.replace(/\D/g, '').slice(-1)
        const newDigits = [...digits]
        newDigits[index] = digit
        setDigits(newDigits)
        if (digit && index < OTP_LENGTH - 1) {
            focusBox(index + 1)
        }
    }, [digits])

    const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault()
            const newDigits = [...digits]
            if (newDigits[index]) {
                newDigits[index] = ''
                setDigits(newDigits)
            } else if (index > 0) {
                newDigits[index - 1] = ''
                setDigits(newDigits)
                focusBox(index - 1)
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            focusBox(index - 1)
        } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
            focusBox(index + 1)
        }
    }, [digits])

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        setError('')
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
        if (!pasted) return
        const newDigits = Array(OTP_LENGTH).fill('')
        pasted.split('').forEach((ch, i) => { newDigits[i] = ch })
        setDigits(newDigits)
        const nextEmpty = pasted.length < OTP_LENGTH ? pasted.length : OTP_LENGTH - 1
        focusBox(nextEmpty)
    }, [])

    const handleVerify = async () => {
        if (otp.length < OTP_LENGTH) {
            setError('Please enter the complete 6-digit code.')
            return
        }
        setIsLoading(true)
        try {
            const response = await authApi.verifyPasswordResetOtp({ login: email, otp })
            if (response.success) {
                navigate('/forgot-password/reset', { state: { login: email, otp } })
            } else {
                setError(response.message || 'Invalid code. Please try again.')
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Verification failed. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const maskedEmail = email
        ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
        : 'your email'

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
                            <ShieldCheck className="w-7 h-7 text-brand-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
                        <CardDescription className="mt-1">
                            We've sent a 6-digit verification code to{' '}
                            <span className="font-semibold text-gray-700">{maskedEmail}</span>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4">
                        <div className="space-y-5">
                            {/* 6-Box OTP Input */}
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700 text-center">Verification Code</p>
                                <div className="flex items-center justify-center gap-2.5">
                                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { inputRefs.current[i] = el }}
                                            id={`otp-box-${i}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digits[i]}
                                            autoFocus={i === 0}
                                            onChange={(e) => handleChange(i, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(i, e)}
                                            onPaste={handlePaste}
                                            onFocus={(e) => e.target.select()}
                                            className={cn(
                                                'w-11 h-13 text-center text-xl font-bold rounded-lg border-2 outline-none transition-all duration-150',
                                                'focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
                                                digits[i] ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-900',
                                                error && !digits[i] && 'border-red-400 bg-red-50',
                                            )}
                                            style={{ width: '2.75rem', height: '3.25rem' }}
                                        />
                                    ))}
                                </div>
                                {error && (
                                    <p className="text-xs text-red-600 text-center">{error}</p>
                                )}
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleVerify}
                                disabled={isLoading || otp.length < OTP_LENGTH}
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        Verifying...
                                    </span>
                                ) : (
                                    'Verify Code'
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

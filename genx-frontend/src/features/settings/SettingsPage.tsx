import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
    Input,
    Label,
    Separator,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Progress,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Badge,
} from '@/components/ui'
import { getInitials, cn } from '@/lib/utils'
import { User, Eye, EyeOff, Save, Shield, CheckCircle2, UserCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { authApi, mapBackendUserToFrontend } from '@/api/auth'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

function calculatePasswordStrength(password: string): { strength: PasswordStrength; score: number; label: string } {
    if (!password) {
        return { strength: 'weak', score: 0, label: '' }
    }

    let score = 0

    // Length scoring (0-25 points)
    if (password.length >= 8) score += 10
    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 5

    // Character variety (0-45 points)
    if (/[a-z]/.test(password)) score += 10
    if (/[A-Z]/.test(password)) score += 10
    if (/[0-9]/.test(password)) score += 10
    if (/[^a-zA-Z0-9]/.test(password)) score += 15

    let strength: PasswordStrength = 'weak'
    let label = 'Weak'

    if (score >= 56) {
        strength = 'strong'
        label = 'Strong'
    } else if (score >= 41) {
        strength = 'good'
        label = 'Good'
    } else if (score >= 21) {
        strength = 'fair'
        label = 'Fair'
    }

    return { strength, score: Math.min(score, 70), label }
}

export function SettingsPage() {
    const { user, updateUser: setUser } = useAuthStore()
    const { toast } = useToast()
    const [name, setName] = useState(user?.name || '')
    const [isSaving, setIsSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const [cropDialogOpen, setCropDialogOpen] = useState(false)
    const [imageToCrop, setImageToCrop] = useState<string | null>(null)
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const passwordStrength = calculatePasswordStrength(newPassword)

    const handleSaveProfile = async () => {
        if (!user) return
        if (name === user.name) {
            toast({
                title: 'No changes',
                description: 'No changes to save',
            })
            return
        }
        try {
            setIsSaving(true)
            const response = await authApi.updateProfile({ name })
            if (response.success && response.data?.user) {
                const updatedUser = mapBackendUserToFrontend(response.data.user)
                setUser(updatedUser)
                toast({
                    title: 'Success',
                    description: 'Profile updated successfully',
                    variant: 'success',
                })
            }
        } catch (error) {
            console.error('Failed to update profile:', error)
            toast({
                title: 'Error',
                description: 'Failed to update profile. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast({
                title: 'Error',
                description: 'Please fill in all password fields',
                variant: 'destructive',
            })
            return
        }

        if (newPassword !== confirmPassword) {
            toast({
                title: 'Error',
                description: 'Passwords do not match',
                variant: 'destructive',
            })
            return
        }

        if (newPassword.length < 8) {
            toast({
                title: 'Error',
                description: 'Password must be at least 8 characters',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsUpdatingPassword(true)
            const response = await authApi.changePassword({
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            })

            if (response.success) {
                toast({
                    title: 'Success',
                    description: 'Password updated successfully',
                    variant: 'success',
                })
                // Clear password fields
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
            }
        } catch (error: any) {
            console.error('Failed to update password:', error)
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update password. Please check your current password and try again.',
                variant: 'destructive',
            })
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
            toast({
                title: 'Invalid file type',
                description: 'Please select a JPG or PNG image',
                variant: 'destructive',
            })
            return
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Please select an image smaller than 2MB',
                variant: 'destructive',
            })
            return
        }

        // Read file and open crop dialog
        const reader = new FileReader()
        reader.onloadend = () => {
            setImageToCrop(reader.result as string)
            setCropDialogOpen(true)
            setCrop({ x: 0, y: 0 })
            setZoom(1)
        }
        reader.readAsDataURL(file)

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const createImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const image = new Image()
            image.addEventListener('load', () => resolve(image))
            image.addEventListener('error', (error) => reject(error))
            image.src = url
        })
    }

    const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
        const image = await createImage(imageSrc)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            throw new Error('No 2d context')
        }

        // Set canvas size to match the cropped area
        canvas.width = pixelCrop.width
        canvas.height = pixelCrop.height

        // Draw the cropped image
        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        )

        // Convert to blob
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'))
                    return
                }
                resolve(blob)
            }, 'image/jpeg', 0.95)
        })
    }

    const handleCropComplete = async () => {
        if (!imageToCrop || !croppedAreaPixels) return

        try {
            setIsUploadingAvatar(true)
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels)
            const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' })

            const response = await authApi.uploadAvatar(file)
            if (response.success && response.data?.user) {
                const updatedUser = mapBackendUserToFrontend(response.data.user)
                setUser(updatedUser)
                setAvatarPreview(null)
                setCropDialogOpen(false)
                setImageToCrop(null)
                toast({
                    title: 'Success',
                    description: 'Avatar updated successfully',
                    variant: 'success',
                })
            }
        } catch (error: any) {
            console.error('Failed to crop/upload image:', error)
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to process image. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const cardClassName = "border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl"
    const headerClassName = "bg-gray-50/50 border-b border-gray-100 px-5 sm:px-8 py-4 sm:py-6"
    const inputClassName = "rounded-xl border-gray-200 focus:ring-brand-500 focus:border-brand-500 h-11 sm:h-12 transition-all"

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="secondary" className="bg-brand-100 text-brand-700 hover:bg-brand-100 border-none px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                            {user?.role || 'User Account'}
                        </Badge>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                        My Profile
                    </h1>
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-1 font-medium">Manage your account identity and security preferences.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Profile Section */}
                <Card className={cardClassName}>
                    <CardHeader className={headerClassName}>
                        <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                            Personal Information
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm font-medium">Update your identity and contact details.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-8 space-y-6 sm:space-y-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                            <div className="relative group">
                                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-xl group-hover:shadow-brand-100 transition-all duration-300">
                                    <AvatarImage src={avatarPreview || user?.avatar} />
                                    <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-brand-50 text-brand-600">
                                        {getInitials(user?.name || '')}
                                    </AvatarFallback>
                                </Avatar>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity backdrop-blur-[2px]"
                                >
                                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Change</span>
                                </button>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">{user?.name}</h3>
                                <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">{user?.email}</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingAvatar}
                                        className="rounded-full px-4 sm:px-5 h-8 sm:h-9 text-[11px] sm:text-xs border-gray-200 hover:border-brand-500 hover:text-brand-600 transition-colors"
                                    >
                                        {isUploadingAvatar ? 'Uploading...' : 'Upload New Photo'}
                                    </Button>
                                    <p className="w-full text-[10px] sm:text-[11px] text-gray-400 mt-1 sm:mt-2 font-medium">Supported formats: JPG, PNG. Max size 2MB.</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-gray-100/80" />

                        <div className="space-y-5 sm:space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-3.5 bg-brand-500 rounded-full" />
                                        <Label htmlFor="name" className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-widest">Full Name</Label>
                                    </div>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={cn(inputClassName, "font-semibold bg-white/50 focus:bg-white text-sm")}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-3.5 bg-gray-300 rounded-full" />
                                        <Label htmlFor="email" className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</Label>
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className={cn(inputClassName, "font-medium bg-gray-50/50 border-gray-100 text-gray-400 cursor-not-allowed text-sm")}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 sm:pt-4">
                            <Button
                                onClick={handleSaveProfile}
                                disabled={isSaving || name === user?.name}
                                className="w-full sm:w-auto rounded-full px-8 h-10 sm:h-11 bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-200 transition-all font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                <span className="text-sm sm:text-base">{isSaving ? 'Saving...' : 'Save Changes'}</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <Card className={cardClassName}>
                    <CardHeader className={headerClassName}>
                        <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                            Account Security
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm font-medium">Keep your account secure with a strong password.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-brand-500 rounded-full" />
                                <Label htmlFor="current-password" className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-widest">Current Password</Label>
                            </div>
                            <div className="relative group">
                                <Input
                                    id="current-password"
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className={cn(inputClassName, "pr-12 font-medium bg-white/50 focus:bg-white text-sm")}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 focus:outline-none transition-colors"
                                >
                                    {showCurrentPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                            </div>
                        </div>

                        <Separator className="bg-gray-100/80" />

                        <div className="space-y-5 sm:space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3.5 bg-brand-500 rounded-full" />
                                    <Label htmlFor="new-password" className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-widest">New Password</Label>
                                </div>
                                <div className="relative group">
                                    <Input
                                        id="new-password"
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className={cn(inputClassName, "pr-12 font-medium bg-white/50 focus:bg-white text-sm",
                                            newPassword && passwordStrength.strength === 'strong' ? "border-green-200" : ""
                                        )}
                                        placeholder="Must be at least 8 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 focus:outline-none transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </button>
                                </div>
                                {newPassword && (
                                    <div className="space-y-3 mt-3 p-3 sm:p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className={cn(
                                                "text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-black",
                                                passwordStrength.strength === 'weak' && "text-red-600",
                                                passwordStrength.strength === 'fair' && "text-orange-600",
                                                passwordStrength.strength === 'good' && "text-yellow-600",
                                                passwordStrength.strength === 'strong' && "text-green-700"
                                            )}>
                                                Strength: {passwordStrength.label}
                                            </span>
                                            {passwordStrength.strength === 'strong' && (
                                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                                            )}
                                        </div>
                                        <Progress
                                            value={(passwordStrength.score / 70) * 100}
                                            className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden"
                                            indicatorClassName={cn(
                                                "transition-all duration-500 rounded-full",
                                                passwordStrength.strength === 'weak' && "bg-red-500",
                                                passwordStrength.strength === 'fair' && "bg-orange-500",
                                                passwordStrength.strength === 'good' && "bg-yellow-500",
                                                passwordStrength.strength === 'strong' && "bg-green-600 shadow-sm shadow-green-200"
                                            )}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3.5 bg-brand-500 rounded-full" />
                                    <Label htmlFor="confirm-password" className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-widest">Confirm Password</Label>
                                </div>
                                <div className="relative group">
                                    <Input
                                        id="confirm-password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={cn(inputClassName, "pr-12 font-medium bg-white/50 focus:bg-white text-sm",
                                            confirmPassword && newPassword && confirmPassword !== newPassword ? "border-red-200" : ""
                                        )}
                                        placeholder="Repeat new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 focus:outline-none transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                                    <p className="text-[10px] sm:text-[11px] text-red-600 font-bold uppercase tracking-wider mt-1.5 ml-1">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 sm:pt-4">
                            <Button
                                onClick={handleUpdatePassword}
                                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
                                className="w-full sm:w-auto rounded-full px-8 h-10 sm:h-11 bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-200 transition-all font-bold flex items-center justify-center active:scale-[0.98] disabled:opacity-50"
                            >
                                <span className="text-sm sm:text-base">{isUpdatingPassword ? 'Updating...' : 'Update Password'}</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Crop Dialog */}
            <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl rounded-2xl sm:rounded-3xl overflow-hidden border-none shadow-2xl p-0">
                    <DialogHeader className="px-5 sm:px-8 py-4 sm:py-6 bg-gray-50/50 border-b border-gray-100">
                        <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                            <span className="p-1 sm:p-1.5 bg-brand-100 text-brand-600 rounded-lg"><User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></span>
                            Crop Profile Picture
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
                        <div className="relative w-full h-[250px] sm:h-[350px] bg-gray-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-inner">
                            {imageToCrop && (
                                <Cropper
                                    image={imageToCrop}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                    cropShape="round"
                                />
                            )}
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-widest">Adjust Zoom</Label>
                                <span className="text-[10px] sm:text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-md">{Math.round(zoom * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 sm:h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                            />
                        </div>
                    </div>
                    <DialogFooter className="px-5 sm:px-8 py-4 sm:py-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setCropDialogOpen(false)
                                setImageToCrop(null)
                            }}
                            disabled={isUploadingAvatar}
                            className="w-full sm:w-auto order-2 sm:order-1 rounded-full px-6 font-bold text-gray-500 h-10 sm:h-11"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCropComplete}
                            disabled={isUploadingAvatar || !croppedAreaPixels}
                            className="w-full sm:w-auto order-1 sm:order-2 rounded-full px-8 bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-100 font-bold h-10 sm:h-11 text-sm sm:text-base"
                        >
                            {isUploadingAvatar ? 'Saving...' : 'Set Photo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}

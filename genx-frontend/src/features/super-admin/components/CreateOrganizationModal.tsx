import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Button,
    Input,
    Label,
    Separator,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui'
import {
    Building2,
    Briefcase,
    Globe,
    Users,
    Wand2,
    CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { organizationsApi } from '@/api/organizations'
import { useNotificationStore } from '@/stores'

interface CreateOrganizationModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

const generateOTP = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

const generateCode = (name: string) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 20)
}

export function CreateOrganizationModal({
    isOpen,
    onOpenChange,
    onSuccess
}: CreateOrganizationModalProps) {
    const { show } = useNotificationStore()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        expectedHours: '8',
        timezone: 'UTC',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'active' as 'active' | 'suspended',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
    })

    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            code: generateCode(name)
        }))
    }

    const handleSubmit = async () => {
        if (!formData.name) return
        setIsSubmitting(true)
        try {
            const payload = {
                name: formData.name,
                slug: formData.code,
                timezone: formData.timezone,
                status: formData.status,
                working_days: formData.workingDays,
                expected_hours_per_day: parseFloat(formData.expectedHours) || 8,
                admin_name: formData.adminName,
                admin_email: formData.adminEmail,
                admin_password: formData.adminPassword,
            }

            await organizationsApi.create(payload)
            show({
                type: 'success',
                title: 'Organization Created',
                message: `Successfully provisioned ${formData.name}.`
            })
            onOpenChange(false)
            setFormData({
                name: '',
                code: '',
                expectedHours: '8',
                timezone: 'UTC',
                workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                status: 'active',
                adminName: '',
                adminEmail: '',
                adminPassword: '',
            })
            if (onSuccess) onSuccess()
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Creation Failed',
                message: error.response?.data?.message || 'Failed to create organization.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                {/* Scrollable Container including Header */}
                <div className="bg-white max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Header - Now scrolls with content */}
                    <div className="px-8 py-8 border-b border-slate-50 relative">
                        <DialogHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-50 rounded-2xl shrink-0 shadow-sm shadow-brand-100/50">
                                    <Building2 className="w-6 h-6 text-brand-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
                                        Create New Organization
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                                        Provision a new tenant
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    {/* Body Content */}
                    <div className="px-8 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organization Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Acme Corporation"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200 focus:border-brand-500"
                                />
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Slug / Identifier</Label>
                                <div className="h-10 flex items-center px-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 font-mono text-sm font-semibold">
                                    {formData.code || 'auto-generated-id'}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="hours" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Hours / Day</Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        id="hours"
                                        type="number"
                                        min="1"
                                        max="24"
                                        value={formData.expectedHours}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expectedHours: e.target.value }))}
                                        className="h-10 pl-10 rounded-xl border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Timezone</Label>
                                <Select value={formData.timezone} onValueChange={(v) => setFormData(prev => ({ ...prev, timezone: v }))}>
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                                        <Globe className="w-4 h-4 mr-2 text-slate-400" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="UTC">UTC (Universal)</SelectItem>
                                        <SelectItem value="America/New_York">EST (New York)</SelectItem>
                                        <SelectItem value="Europe/London">GMT (London)</SelectItem>
                                        <SelectItem value="Asia/Kolkata">IST (India)</SelectItem>
                                        <SelectItem value="Asia/Dubai">GST (Dubai)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2 space-y-2.5">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Working Days</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                                const updated = formData.workingDays.includes(day)
                                                    ? formData.workingDays.filter(d => d !== day)
                                                    : [...formData.workingDays, day];
                                                setFormData(prev => ({ ...prev, workingDays: updated }));
                                            }}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                formData.workingDays.includes(day)
                                                    ? "bg-brand-600 text-white shadow-sm"
                                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Initial Status</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all",
                                            formData.status === 'active'
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold"
                                                : "border-slate-100 bg-slate-50 text-slate-400"
                                        )}
                                    >
                                        <CheckCircle2 className={cn("w-4 h-4", formData.status === 'active' ? "text-emerald-500" : "text-slate-300")} />
                                        <span className="text-xs">Active</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'suspended' }))}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all",
                                            formData.status === 'suspended'
                                                ? "border-red-500 bg-red-50 text-red-700 font-bold"
                                                : "border-slate-100 bg-slate-50 text-slate-400"
                                        )}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", formData.status === 'suspended' ? "bg-red-500" : "bg-slate-300")} />
                                        <span className="text-xs">Suspended</span>
                                    </button>
                                </div>
                            </div>

                            <Separator className="sm:col-span-2" />

                            <div className="sm:col-span-2 space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-3">
                                    <div className="p-1.5 bg-brand-50 rounded-lg">
                                        <Users className="w-5 h-5 text-brand-600" />
                                    </div>
                                    Primary Administrator (Optional)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Name</Label>
                                        <Input
                                            placeholder="Full Name"
                                            value={formData.adminName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                                            className="h-10 rounded-xl bg-slate-50/30 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={formData.adminEmail}
                                            onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                                            className="h-10 rounded-xl bg-slate-50/30 text-sm"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <Label className="text-xs font-bold text-brand-600 uppercase tracking-wider">One-Time Password</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Generate or enter OTP"
                                                value={formData.adminPassword}
                                                onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                                                className="h-10 rounded-xl border-brand-100 font-semibold text-sm"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setFormData(prev => ({ ...prev, adminPassword: generateOTP() }))}
                                                className="h-10 px-4 rounded-xl border-brand-200 text-brand-600 hover:bg-brand-50 text-xs font-bold shrink-0"
                                            >
                                                <Wand2 className="w-4 h-4 mr-2" />
                                                Auto
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer - Part of the scroll flow */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="flex-1 rounded-xl h-10 font-bold text-slate-500"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!formData.name || isSubmitting}
                                className="flex-1 rounded-xl h-10 bg-brand-600 hover:bg-brand-700 font-bold"
                            >
                                {isSubmitting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                                ) : (
                                    'Create Organization'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

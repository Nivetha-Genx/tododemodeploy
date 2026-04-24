import { useState, useEffect } from 'react'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Badge,
    Separator,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui'
import { Plus, Search, Building2, Calendar, Users, Briefcase, Globe, CheckCircle2, MoreVertical, ArrowRightLeft, Wand2, Key, Copy, Check } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { Organization } from '@/types'
import { organizationsApi } from '@/api/organizations'

import { useNotificationStore } from '@/stores/notificationStore'
import { useOrgSwitchStore } from '@/stores/orgSwitchStore'
import { PageSkeleton } from '@/components/ui/modal-skeleton'

export function OrganizationManagementPage() {
    const { show } = useNotificationStore()
    const { switchOrg, isSwitching } = useOrgSwitchStore()
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        expectedHours: '8',
        timezone: 'UTC',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'active' as 'active' | 'suspended',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    })
    const [orgAdmins, setOrgAdmins] = useState<any[]>([])
    const [isLoadingAdmins, setIsLoadingAdmins] = useState(false)
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' })
    const [isAddingAdmin, setIsAddingAdmin] = useState(false)
    const [resetSuccess, setResetSuccess] = useState<{ email: string; otp: string } | null>(null)
    const [copied, setCopied] = useState(false)

    const fetchOrgAdmins = async (orgId: string) => {
        try {
            setIsLoadingAdmins(true)
            const response = await organizationsApi.getAdmins(orgId)
            if (response.success) {
                setOrgAdmins(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch org admins:', error)
        } finally {
            setIsLoadingAdmins(false)
        }
    }

    const handleAddAdmin = async () => {
        if (!selectedOrg || !newAdmin.name || !newAdmin.email) return
        try {
            setIsAddingAdmin(true)
            const response = await organizationsApi.createAdmin(selectedOrg.id, newAdmin)
            if (response.success) {
                show({ type: 'success', title: 'Admin Added', message: 'Invitation sent successfully.' })
                setNewAdmin({ name: '', email: '', password: '' })
                fetchOrgAdmins(selectedOrg.id)
            }
        } catch (error: any) {
            show({ type: 'error', title: 'Failed to add admin', message: error.response?.data?.message || 'Error occurred.' })
        } finally {
            setIsAddingAdmin(false)
        }
    }

    const handleResetAdminPassword = async (adminId: string) => {
        if (!selectedOrg) return

        const confirmReset = window.confirm('Are you sure you want to reset this administrator\'s password? A new one-time password will be generated and sent.')
        if (!confirmReset) return

        try {
            const response = await organizationsApi.resetAdminPassword(selectedOrg.id, adminId)
            if (response.success) {
                const admin = orgAdmins.find(a => a.id === adminId)
                setResetSuccess({
                    email: admin?.email || 'User',
                    otp: response.otp
                })
            }
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Reset Failed',
                message: error.response?.data?.message || 'Failed to reset password.'
            })
        }
    }

    const handleRemoveAdmin = async (adminId: string) => {
        if (!selectedOrg || !confirm('Are you sure you want to remove this admin?')) return
        try {
            const response = await organizationsApi.removeAdmin(selectedOrg.id, adminId)
            if (response.success) {
                show({ type: 'success', title: 'Admin Removed', message: 'User removed successfully.' })
                fetchOrgAdmins(selectedOrg.id)
            }
        } catch (error: any) {
            show({ type: 'error', title: 'Failed to remove admin', message: error.response?.data?.message || 'Error occurred.' })
        }
    }

    const generateCode = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20)
    }

    const generateOTP = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars like 0, O, 1, I
        let result = ''
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            code: generateCode(name)
        }))
    }

    useEffect(() => {
        fetchOrganizations()
    }, [])

    const fetchOrganizations = async () => {
        try {
            setIsLoading(true)
            const response = await organizationsApi.getAll()
            if (response.success && response.data) {
                const mapped = response.data.map((org: any) => ({
                    id: org.id,
                    name: org.name,
                    expectedHoursPerDay: org.settings_relation?.expected_hours_per_day || 8,
                    createdAt: org.created_at,
                    logo: org.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${org.name}`,
                    memberCount: org.users_count || 0,
                    timezone: org.settings_relation?.timezone || 'UTC',
                    workingDays: org.settings_relation?.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    status: org.is_active ? 'active' : 'suspended'
                }))
                setOrganizations(mapped)
            }
        } catch (error) {
            console.error('Failed to fetch organizations:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleCreate = () => {
        setFormData({
            name: '',
            code: '',
            expectedHours: '8',
            timezone: 'UTC',
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            status: 'active',
            adminName: '',
            adminEmail: '',
            adminPassword: ''
        })
        setIsCreateModalOpen(true)
    }

    const handleEdit = (org: Organization) => {
        setSelectedOrg(org)
        setFormData({
            name: org.name,
            code: generateCode(org.name),
            expectedHours: org.expectedHoursPerDay.toString(),
            timezone: (org as any).timezone || 'UTC',
            workingDays: (org as any).workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            status: (org as any).status || 'active',
            adminName: '',
            adminEmail: '',
            adminPassword: ''
        })
        fetchOrgAdmins(org.id)
        setIsEditModalOpen(true)
    }

    const handleSwitchOrg = async (e: React.MouseEvent, orgId: string, orgName: string) => {
        e.stopPropagation() // Prevent modal from opening
        try {
            await switchOrg(orgId, orgName)
            show({
                type: 'success',
                title: 'Context Switched',
                message: `Now viewing data for ${orgName}`
            })
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Switch Failed',
                message: error.response?.data?.message || 'Failed to switch organization context.'
            })
        }
    }

    const handleSubmitCreate = async () => {
        try {
            setIsSubmitting(true)
            await organizationsApi.create({
                name: formData.name,
                expected_hours_per_day: Number(formData.expectedHours),
                timezone: formData.timezone,
                working_days: formData.workingDays,
                status: formData.status,
                admin_name: formData.adminName,
                admin_email: formData.adminEmail,
                admin_password: formData.adminPassword
            })

            show({
                type: 'success',
                title: 'Organization Created',
                message: 'Organization and initial admin created successfully.',
            })

            setIsCreateModalOpen(false)
            fetchOrganizations()
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Creation Failed',
                message: error.response?.data?.message || 'Failed to create organization. Please try again.',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitEdit = async () => {
        if (!selectedOrg) return
        try {
            setIsSubmitting(true)
            await organizationsApi.update(selectedOrg.id, {
                name: formData.name,
                expected_hours_per_day: Number(formData.expectedHours),
                timezone: formData.timezone,
                working_days: formData.workingDays,
                status: formData.status
            })

            show({
                type: 'success',
                title: 'Changes Saved',
                message: 'Organization settings updated successfully.',
            })

            setIsEditModalOpen(false)
            setSelectedOrg(null)
            fetchOrganizations()
        } catch (error: any) {
            show({
                type: 'error',
                title: 'Update Failed',
                message: error.response?.data?.message || 'Failed to update organization settings.',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="container py-4 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Organizations</h1>
                    <p className="text-gray-500 mt-1">Manage platform organizations and settings.</p>
                </div>
                <Button onClick={handleCreate} className="bg-brand-600 hover:bg-brand-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Organization
                </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6 shadow-sm border-gray-100">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search organizations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 max-w-md border-gray-200"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Grid */}
            {isLoading ? (
                <PageSkeleton />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrgs.map(org => (
                        <Card key={org.id} className="hover:shadow-md transition-shadow duration-200 cursor-pointer border-gray-200 bg-white" onClick={() => handleEdit(org)}>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <Avatar className="w-12 h-12 border border-gray-100 bg-white rounded-lg">
                                    <AvatarImage src={org.logo} />
                                    <AvatarFallback className="rounded-lg"><Building2 className="w-6 h-6 text-gray-400" /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-lg font-semibold truncate text-gray-900">{org.name}</CardTitle>
                                    <CardDescription className="text-xs truncate">ID: {org.id}</CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                            <MoreVertical className="w-4 h-4 text-gray-500" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => handleEdit(org)}>
                                            <Building2 className="w-4 h-4 mr-2" />
                                            Edit Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) => handleSwitchOrg(e, org.id, org.name)}
                                            disabled={isSwitching}
                                            className="text-brand-600 focus:text-brand-700"
                                        >
                                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                                            Switch to Org
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600 focus:text-red-700">
                                            Suspend Organization
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                        <span className="text-gray-500 flex items-center">
                                            <Briefcase className="w-3.5 h-3.5 mr-2" />
                                            Work Hours
                                        </span>
                                        <span className="font-medium text-gray-900">{org.expectedHoursPerDay} hrs/day</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-2" />
                                            Created
                                        </span>
                                        <span className="font-medium text-gray-900">{formatDate(org.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 flex items-center">
                                            <Users className="w-3.5 h-3.5 mr-2" />
                                            Members
                                        </span>
                                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                                            {(org as any).memberCount || 0} Active
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && filteredOrgs.length === 0 && (
                <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No organizations found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search terms.</p>
                </div>
            )}

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-md sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-brand-600" />
                            Create New Organization
                        </DialogTitle>
                        <DialogDescription>
                            Configure the baseline settings for the new tenant.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
                        <div className="sm:col-span-2 space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold">Organization Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Acme Corporation"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="border-gray-200"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-2">
                            <Label className="text-sm font-semibold text-gray-500">Organization Code (Auto-generated)</Label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-md text-sm font-mono text-gray-600">
                                {formData.code || 'organization-code-preview'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hours" className="text-sm font-semibold">Work Hours / Day</Label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="hours"
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={formData.expectedHours}
                                    onChange={(e) => setFormData({ ...formData, expectedHours: e.target.value })}
                                    className="pl-10 border-gray-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Timezone</Label>
                            <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
                                <SelectTrigger className="border-gray-200">
                                    <Globe className="w-4 h-4 mr-2 text-gray-400" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UTC">UTC (Universal)</SelectItem>
                                    <SelectItem value="America/New_York">EST (New York)</SelectItem>
                                    <SelectItem value="Europe/London">GMT (London)</SelectItem>
                                    <SelectItem value="Asia/Kolkata">IST (India)</SelectItem>
                                    <SelectItem value="Asia/Dubai">GST (Dubai)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="sm:col-span-2 space-y-3 pt-2">
                            <Label className="text-sm font-semibold">Working Days</Label>
                            <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => {
                                            const updated = formData.workingDays.includes(day)
                                                ? formData.workingDays.filter(d => d !== day)
                                                : [...formData.workingDays, day];
                                            setFormData({ ...formData, workingDays: updated });
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                            formData.workingDays.includes(day)
                                                ? "bg-brand-600 text-white shadow-sm ring-2 ring-brand-100"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="sm:col-span-2 space-y-2 pt-2">
                            <Label className="text-sm font-semibold">Initial Status</Label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'active' })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                        formData.status === 'active'
                                            ? "border-brand-500 bg-brand-50 text-brand-700"
                                            : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                                    )}
                                >
                                    <CheckCircle2 className={cn("w-4 h-4", formData.status === 'active' ? "text-brand-500" : "text-gray-300")} />
                                    Active
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'suspended' })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                        formData.status === 'suspended'
                                            ? "border-red-500 bg-red-50 text-red-700"
                                            : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                                    )}
                                >
                                    <div className={cn("w-3 h-3 rounded-full", formData.status === 'suspended' ? "bg-red-500" : "bg-gray-300")} />
                                    Suspended
                                </button>
                            </div>
                        </div>

                        <Separator className="sm:col-span-2 my-2" />

                        <div className="sm:col-span-2 space-y-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-brand-600" />
                                Primary Administrator (Optional)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="admin-name" className="text-sm font-semibold">Admin Name</Label>
                                    <Input
                                        id="admin-name"
                                        placeholder="Full Name"
                                        value={formData.adminName}
                                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                                        className="border-gray-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="admin-email" className="text-sm font-semibold">Admin Email</Label>
                                    <Input
                                        id="admin-email"
                                        type="email"
                                        placeholder="email@example.com"
                                        value={formData.adminEmail}
                                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                        className="border-gray-200"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="admin-password" className="text-sm font-semibold text-brand-600">One-Time Password (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="admin-password"
                                        placeholder="Enter or generate OTP"
                                        value={formData.adminPassword}
                                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                        className="border-brand-100 focus:ring-brand-500"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="shrink-0 border-brand-200 text-brand-600 hover:bg-brand-50"
                                        onClick={() => setFormData({ ...formData, adminPassword: generateOTP() })}
                                    >
                                        <Wand2 className="w-4 h-4 mr-2" />
                                        Generate
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            An invitation with a temporary password will be sent to this email.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-full px-6">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitCreate}
                            disabled={!formData.name || isSubmitting}
                            className="bg-brand-600 hover:bg-brand-700 rounded-full px-8 shadow-md shadow-brand-200"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : null}
                            {isSubmitting ? 'Creating...' : 'Create Organization'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-md sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-brand-600" />
                            Edit Organization
                        </DialogTitle>
                        <DialogDescription>
                            Update the baseline settings for this organization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
                        <div className="sm:col-span-2 space-y-2">
                            <Label htmlFor="edit-name" className="text-sm font-semibold">Organization Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="border-gray-200"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-2">
                            <Label className="text-sm font-semibold text-gray-500">Organization Code (Read-only)</Label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-md text-sm font-mono text-gray-400">
                                {formData.code}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-hours" className="text-sm font-semibold">Expected Work Hours (Per Day)</Label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="edit-hours"
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={formData.expectedHours}
                                    onChange={(e) => setFormData({ ...formData, expectedHours: e.target.value })}
                                    className="pl-10 border-gray-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Timezone</Label>
                            <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
                                <SelectTrigger className="border-gray-200">
                                    <Globe className="w-4 h-4 mr-2 text-gray-400" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UTC">UTC (Universal)</SelectItem>
                                    <SelectItem value="America/New_York">EST (New York)</SelectItem>
                                    <SelectItem value="Europe/London">GMT (London)</SelectItem>
                                    <SelectItem value="Asia/Kolkata">IST (India)</SelectItem>
                                    <SelectItem value="Asia/Dubai">GST (Dubai)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="sm:col-span-2 space-y-3 pt-2">
                            <Label className="text-sm font-semibold">Working Days</Label>
                            <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => {
                                            const updated = formData.workingDays.includes(day)
                                                ? formData.workingDays.filter(d => d !== day)
                                                : [...formData.workingDays, day];
                                            setFormData({ ...formData, workingDays: updated });
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                            formData.workingDays.includes(day)
                                                ? "bg-brand-600 text-white shadow-sm ring-2 ring-brand-100"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="sm:col-span-2 space-y-2 pt-2">
                            <Label className="text-sm font-semibold">Organization Status</Label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'active' })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                        formData.status === 'active'
                                            ? "border-brand-500 bg-brand-50 text-brand-700"
                                            : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                                    )}
                                >
                                    <CheckCircle2 className={cn("w-4 h-4", formData.status === 'active' ? "text-brand-500" : "text-gray-300")} />
                                    Active
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'suspended' })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                        formData.status === 'suspended'
                                            ? "border-red-500 bg-red-50 text-red-700"
                                            : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                                    )}
                                >
                                    <div className={cn("w-3 h-3 rounded-full", formData.status === 'suspended' ? "bg-red-500" : "bg-gray-300")} />
                                    Suspended
                                </button>
                            </div>
                        </div>

                        <Separator className="sm:col-span-2 my-2" />

                        <div className="sm:col-span-2 space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-brand-600" />
                                Organization Administrators
                            </h3>

                            {/* Admin List */}
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {isLoadingAdmins ? (
                                    <div className="text-center py-4 text-xs text-gray-500">Loading admins...</div>
                                ) : orgAdmins.length > 0 ? (
                                    orgAdmins.map(admin => (
                                        <div key={admin.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-gray-900">{admin.name}</span>
                                                <span className="text-[10px] text-gray-500">{admin.email}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                                                    onClick={() => handleResetAdminPassword(admin.id)}
                                                    title="Reset Password"
                                                >
                                                    <Key className="w-3.5 h-3.5 mr-1" />
                                                    Reset
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemoveAdmin(admin.id)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-xs text-gray-500 underline decoration-dotted">No administrators assigned</div>
                                )}
                            </div>

                            {/* Add Admin Form */}
                            <div className="p-3 border border-dashed border-gray-200 rounded-xl space-y-3 bg-gray-50/30">
                                <h4 className="text-xs font-bold text-gray-700">Add New Administrator</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-gray-500 px-1">Full Name</Label>
                                        <Input
                                            placeholder="John Doe"
                                            className="h-8 text-xs"
                                            value={newAdmin.name}
                                            onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-gray-500 px-1">Email Address</Label>
                                        <Input
                                            placeholder="john@example.com"
                                            className="h-8 text-xs"
                                            value={newAdmin.email}
                                            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <Label className="text-[10px] font-bold text-brand-600 px-1">One-Time Password (Optional)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Enter or generate OTP"
                                            className="h-8 text-xs border-brand-100"
                                            value={newAdmin.password}
                                            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-8 shrink-0 border-brand-200 text-brand-600 hover:bg-brand-50 text-[10px]"
                                            onClick={() => setNewAdmin({ ...newAdmin, password: generateOTP() })}
                                        >
                                            <Wand2 className="w-3 h-3 mr-1.5" />
                                            Generate
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <Button
                                className="w-full h-8 text-xs bg-brand-600 hover:bg-brand-700"
                                onClick={handleAddAdmin}
                                disabled={isAddingAdmin || !newAdmin.name || !newAdmin.email}
                            >
                                {isAddingAdmin ? 'Adding...' : 'Add Administrator'}
                            </Button>
                            <p className="text-[10px] text-gray-400 text-center">
                                They will receive an email to set their password.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-full px-6">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitEdit}
                            disabled={!formData.name || isSubmitting}
                            className="bg-brand-600 hover:bg-brand-700 rounded-full px-8 shadow-md shadow-brand-200"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : null}
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Password Reset Success Modal */}
            <Dialog open={!!resetSuccess} onOpenChange={(open) => !open && setResetSuccess(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-6 h-6" />
                            Password Reset Successfull
                        </DialogTitle>
                        <DialogDescription>
                            A new one-time password has been generated and sent to <strong>{resetSuccess?.email}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 flex flex-col items-center justify-center space-y-4">
                        <Label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">New One-Time Password</Label>
                        <div className="flex items-center gap-2 w-full">
                            <div className="flex-1 bg-gray-50 border-2 border-dashed border-brand-200 rounded-xl p-4 text-center font-mono text-2xl font-bold tracking-[0.2em] text-brand-700">
                                {resetSuccess?.otp}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-14 w-14 rounded-xl border-brand-200 text-brand-600 hover:bg-brand-50"
                                onClick={() => {
                                    if (resetSuccess?.otp) {
                                        navigator.clipboard.writeText(resetSuccess.otp)
                                        setCopied(true)
                                        setTimeout(() => setCopied(false), 2000)
                                    }
                                }}
                            >
                                {copied ? <Check className="w-6 h-6 text-green-600" /> : <Copy className="w-6 h-6" />}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 text-center italic">
                            The user must change this password upon their next login.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            className="w-full bg-brand-600 hover:bg-brand-700 rounded-full h-12 text-lg"
                            onClick={() => setResetSuccess(null)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

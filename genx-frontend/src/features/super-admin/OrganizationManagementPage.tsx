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
import { Plus, Search, Building2, Calendar, Users, Briefcase, Globe, CheckCircle2, MoreVertical, ArrowRightLeft, Wand2, Key, Copy, Check, Trash2 } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { Organization } from '@/types'
import { organizationsApi } from '@/api/organizations'

import { useNotificationStore } from '@/stores/notificationStore'
import { useOrgSwitchStore } from '@/stores/orgSwitchStore'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { CreateOrganizationModal } from './components/CreateOrganizationModal'

export function OrganizationManagementPage() {
    const { show } = useNotificationStore()
    const { switchOrg, isSwitching } = useOrgSwitchStore()
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

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
    const [resetConfirmId, setResetConfirmId] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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
        setResetConfirmId(adminId)
    }

    const confirmResetPassword = async () => {
        if (!selectedOrg || !resetConfirmId) return

        const adminId = resetConfirmId
        setResetConfirmId(null)

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
        if (!selectedOrg) return
        setDeleteConfirmId(adminId)
    }

    const confirmDeleteAdmin = async () => {
        if (!selectedOrg || !deleteConfirmId) return

        const adminId = deleteConfirmId
        setDeleteConfirmId(null)
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
            code: (org as any).code || generateCode(org.name),
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
        <div className="w-full px-4 sm:px-6 py-4 animate-in fade-in duration-500">
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
            <div className="mb-6">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search organizations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 rounded-xl bg-white border-gray-200 shadow-sm"
                    />
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <PageSkeleton />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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

            {/* Tenant Creation Modal */}
            <CreateOrganizationModal
                isOpen={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={fetchOrganizations}
            />

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent 
                    className="max-w-md sm:max-w-xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl"
                    closeClassName="right-3 sm:right-4 top-3 sm:top-4 z-[60] bg-white shadow-md border border-slate-100"
                >
                    {/* Header */}
                    {/* Scrollable Container including Header */}
                    <div className="bg-white max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Header - Now scrolls with content */}
                        <div className="bg-white px-8 py-8 border-b border-slate-50 relative">
                            <DialogHeader>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-brand-50 rounded-2xl shrink-0 shadow-sm shadow-brand-100/50">
                                        <Building2 className="w-6 h-6 text-brand-600" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
                                            Edit Organization
                                        </DialogTitle>
                                        <DialogDescription className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                                            Update baseline settings
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>
                        </div>

                        {/* Body Content */}
                        <div className="px-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="sm:col-span-2 space-y-1.5">
                                    <Label htmlFor="edit-name" className="text-xs font-bold text-slate-500 uppercase tracking-wider border-l-2 border-brand-500 pl-2">Organization Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="h-11 rounded-xl border-slate-200 focus:border-brand-500"
                                    />
                                </div>

                                <div className="sm:col-span-2 space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider border-l-2 border-brand-500 pl-2">Organization Code (Read-only)</Label>
                                    <div className="h-10 flex items-center px-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 font-mono text-sm font-semibold">
                                        {formData.code}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-hours" className="text-xs font-bold text-slate-500 uppercase tracking-wider border-l-2 border-brand-500 pl-2">Work Hours / Day</Label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="edit-hours"
                                            type="number"
                                            min="1"
                                            max="24"
                                            value={formData.expectedHours}
                                            onChange={(e) => setFormData({ ...formData, expectedHours: e.target.value })}
                                            className="h-10 pl-10 rounded-xl border-slate-200"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider border-l-2 border-brand-500 pl-2">Timezone</Label>
                                    <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
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
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider border-l-2 border-brand-500 pl-2">Working Days</Label>
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
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider border-l-2 border-brand-500 pl-2">Organization Status</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: 'active' })}
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
                                            onClick={() => setFormData({ ...formData, status: 'suspended' })}
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

                                <div className="sm:col-span-2 space-y-5">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-3">
                                        <div className="p-1.5 bg-brand-50 rounded-lg">
                                            <Users className="w-5 h-5 text-brand-600" />
                                        </div>
                                        Organization Administrators
                                    </h3>

                                    {/* Admin List */}
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {isLoadingAdmins ? (
                                            <div className="text-center py-4 text-xs text-gray-500">Loading admins...</div>
                                        ) : orgAdmins.length > 0 ? (
                                            orgAdmins.map(admin => (
                                                <div key={admin.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900">{admin.name}</span>
                                                        <span className="text-xs text-slate-500 font-medium">{admin.email}</span>
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
                                                            className="h-7 px-2 text-red-700 hover:text-red-800 hover:bg-red-50"
                                                            onClick={() => handleRemoveAdmin(admin.id)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-sm text-slate-500 italic">No administrators assigned</div>
                                        )}
                                    </div>

                                    {/* Add Admin Form */}
                                    <div className="p-4 border border-dashed border-slate-200 rounded-xl space-y-4 bg-slate-50/30">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">Add New Administrator</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 border-l-2 border-brand-500 pl-2">Full Name</Label>
                                                <Input
                                                    placeholder="John Doe"
                                                    className="h-10 rounded-lg text-sm"
                                                    value={newAdmin.name}
                                                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 border-l-2 border-brand-500 pl-2">Email Address</Label>
                                                <Input
                                                    placeholder="john@example.com"
                                                    className="h-10 rounded-lg text-sm"
                                                    value={newAdmin.email}
                                                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <Label className="text-xs font-bold text-brand-600 border-l-2 border-brand-500 pl-2">One-Time Password</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Enter or generate"
                                                    className="h-10 rounded-lg text-sm border-brand-100"
                                                    value={newAdmin.password}
                                                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-10 rounded-lg shrink-0 border-brand-200 text-brand-600 hover:bg-brand-50 text-xs font-bold"
                                                    onClick={() => setNewAdmin({ ...newAdmin, password: generateOTP() })}
                                                >
                                                    <Wand2 className="w-4 h-4 mr-2" />
                                                    Auto
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full h-11 rounded-xl text-sm font-black bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-100"
                                        onClick={handleAddAdmin}
                                        disabled={isAddingAdmin || !newAdmin.name || !newAdmin.email}
                                    >
                                        {isAddingAdmin ? 'Adding...' : 'Add Administrator'}
                                    </Button>
                                    <p className="text-xs text-slate-500 text-center font-medium">
                                        They will receive an email to set their password.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 p-6 pt-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 rounded-xl h-10 font-bold text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitEdit}
                            disabled={!formData.name || isSubmitting}
                            className="flex-1 rounded-xl h-10 bg-brand-600 hover:bg-brand-700 font-bold shadow-sm"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Password Reset Success Modal */}
            <Dialog open={!!resetSuccess} onOpenChange={(open) => !open && setResetSuccess(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <div className="bg-white px-8 py-6 border-b border-slate-100 relative">
                        <DialogHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl shrink-0">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-xl font-black tracking-tight text-slate-900">
                                        Reset Successful
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                        Security Updated
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-6 flex flex-col items-center justify-center space-y-6 bg-white">
                        <div className="flex flex-col items-center space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New One-Time Password</Label>
                            <div className="flex items-center gap-3 w-full">
                                <div className="flex-1 bg-slate-50 border-2 border-dashed border-emerald-200 rounded-2xl p-4 text-center font-mono text-3xl font-black tracking-[0.2em] text-emerald-700">
                                    {resetSuccess?.otp}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-14 w-14 rounded-2xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 shrink-0"
                                    onClick={() => {
                                        if (resetSuccess?.otp) {
                                            navigator.clipboard.writeText(resetSuccess.otp)
                                            setCopied(true)
                                            setTimeout(() => setCopied(false), 2000)
                                        }
                                    }}
                                >
                                    {copied ? <Check className="w-6 h-6 text-emerald-600" /> : <Copy className="w-6 h-6" />}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 w-full">
                            <p className="text-[10px] text-amber-700 text-center font-bold uppercase tracking-tight">
                                Important: The user must change this password upon their next login.
                            </p>
                        </div>

                        <Button
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 font-bold shadow-lg shadow-slate-200"
                            onClick={() => setResetSuccess(null)}
                        >
                            Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Password Reset Confirmation Dialog */}
            <Dialog open={!!resetConfirmId} onOpenChange={(open) => !open && setResetConfirmId(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <div className="bg-white px-8 py-6 border-b border-slate-100 relative">
                        <DialogHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-50 rounded-2xl shrink-0 shadow-sm shadow-brand-100/50">
                                    <Key className="w-6 h-6 text-brand-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                                        Reset Password?
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                                        Administrator Security
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-4">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Are you sure you want to reset the password for <span className="font-bold text-slate-900">{orgAdmins.find(a => a.id === resetConfirmId)?.email}</span>?
                        </p>

                        <p className="text-xs text-slate-500 font-medium leading-tight p-4 bg-slate-50 rounded-xl border border-slate-100 italic">
                            A new one-time password will be generated and shown to you. The user must change it upon their next login.
                        </p>
                    </div>

                    <div className="flex gap-3 p-8 pt-0">
                        <Button
                            variant="outline"
                            onClick={() => setResetConfirmId(null)}
                            className="flex-1 rounded-xl h-11 font-bold text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmResetPassword}
                            className="flex-1 rounded-xl h-11 bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-100"
                        >
                            Confirm Reset
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Administrator Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <div className="bg-white px-8 py-6 border-b border-slate-100 relative">
                        <DialogHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-50 rounded-2xl shrink-0">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                                        Remove Admin?
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                                        Access Revocation
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-4">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Are you sure you want to remove <span className="font-bold text-slate-900">{orgAdmins.find(a => a.id === deleteConfirmId)?.name}</span> as an administrator?
                        </p>

                        <p className="text-xs text-red-600 font-medium leading-tight p-4 bg-red-50/50 rounded-xl border border-red-100 italic">
                            This will immediately revoke their access to this organization. This action cannot be undone.
                        </p>
                    </div>

                    <div className="flex gap-3 p-8 pt-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 rounded-xl h-11 font-bold text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDeleteAdmin}
                            className="flex-1 rounded-xl h-11 bg-red-700 hover:bg-red-800 text-white font-bold shadow-lg shadow-red-100"
                        >
                            Remove Admin
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

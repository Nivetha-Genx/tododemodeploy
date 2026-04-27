import { useState, useEffect } from 'react'
import {
    Card,
    CardContent,
    Button,
    Badge,
    Input,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { useUIStore, useAuthStore } from '@/stores'
import { formatDate, cn } from '@/lib/utils'
import { Plus, Search, MoreHorizontal, Shield, Edit, KeyRound, Eye, EyeOff, UserRound, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import type { UserRole, User } from '@/types'
import { teamApi } from '@/api/team'
import { organizationsApi } from '@/api/organizations'
import { mapBackendUserToFrontend } from '@/api/auth'
import { toast } from '@/components/ui/use-toast'
import { getRoleInfo, getAssignableRoles } from '@/lib/roles'

export function TeamPage() {
    const { activeModal, openModal, closeModal } = useUIStore()
    const { can } = useAuthStore()
    const [members, setMembers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviting, setIsInviting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteName, setInviteName] = useState('')
    const [inviteRole, setInviteRole] = useState<UserRole>('member')
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [editName, setEditName] = useState('')
    const [editEmail, setEditEmail] = useState('')
    const [editRole, setEditRole] = useState<UserRole>('member')
    const [resetPasswordValue, setResetPasswordValue] = useState('')
    const [showResetPassword, setShowResetPassword] = useState(false)
    const [isResettingPassword, setIsResettingPassword] = useState(false)
    const [assignableRoles, setAssignableRoles] = useState<Array<{ value: UserRole; label: string }>>([])
    const [orgSettings, setOrgSettings] = useState<any>(null)

    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState({ last_page: 1, total: 0 })
    const perPage = 12 // Changed to 12 for better grid alignment (3x4)


    useEffect(() => {
        fetchMembers()
        fetchAssignableRoles()
        fetchOrgSettings()
    }, [])

    const fetchOrgSettings = async () => {
        try {
            const response = await organizationsApi.getSettings()
            if (response.success) {
                setOrgSettings(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch org settings:', error)
        }
    }

    const fetchAssignableRoles = async () => {
        try {
            const roles = await getAssignableRoles()
            setAssignableRoles(roles)
        } catch (error) {
            console.error('Failed to fetch assignable roles:', error)
            // Fallback to default roles
            setAssignableRoles([
                { value: 'member', label: 'Member' },
                { value: 'team_lead', label: 'Team Lead' },
                { value: 'admin', label: 'Admin' },
            ])
        }
    }

    const fetchMembers = async (page = 1) => {
        try {
            setIsLoading(true)
            const response = await teamApi.getMembersPaginated({
                page,
                per_page: perPage,
                search: searchQuery.trim() || undefined
            })
            if (response.success && response.data) {
                const payload = response.data
                const data = Array.isArray(payload.data) ? payload.data : []
                setMembers(data.map((u: any) => mapBackendUserToFrontend(u)))

                if (payload.last_page !== undefined) {
                    setPagination({
                        last_page: payload.last_page,
                        total: payload.total || 0
                    })
                }
            }
        } catch (error) {
            console.error('Failed to fetch members:', error)
        } finally {
            setIsLoading(false)
        }
    }


    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMembers(currentPage)
        }, 300)
        return () => clearTimeout(timer)
    }, [currentPage, searchQuery])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    const looksLikeEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim())

    const handleInvite = async () => {
        setIsInviting(true)

        if (!inviteEmail) {
            toast({
                title: 'Error',
                description: 'Please enter an email or mobile number',
                variant: 'destructive',
            })
            setIsInviting(false)
            return
        }

        const isEmail = looksLikeEmail(inviteEmail)

        try {
            await teamApi.inviteMember({
                [isEmail ? 'email' : 'mobile']: inviteEmail.trim(),
                role: inviteRole as any,
                ...(inviteName && { name: inviteName.trim() })
            })
            closeModal()
            setInviteEmail('')
            setInviteName('')
            setInviteRole('member')
            fetchMembers(currentPage)
            toast({
                title: 'Success',
                description: 'Member invited successfully',
                variant: 'success',
            })
        } catch (error: any) {
            console.error('Failed to invite member:', error)
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to invite member',
                variant: 'destructive',
            })
        } finally {
            setIsInviting(false)
        }
    }

    const handleEditUser = (user: User) => {
        setSelectedUser(user)
        setEditName(user.name)
        setEditEmail(user.email)
        setEditRole(user.role)
        openModal('editTeamMember')
    }

    const handleUpdateUser = async () => {
        if (!selectedUser) return
        try {
            await teamApi.updateMember(selectedUser.id, {
                name: editName.trim(),
                email: editEmail.trim(),
                role: editRole as any,
            })
            closeModal()
            setSelectedUser(null)
            fetchMembers(currentPage)
            toast({
                title: 'Success',
                description: 'Member updated successfully',
                variant: 'success',
            })
        } catch (error: any) {
            console.error('Failed to update member:', error)
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to update member',
                variant: 'destructive',
            })
        }
    }

    const handleResetPassword = async () => {
        if (!selectedUser) return
        setIsResettingPassword(true)
        try {
            const response = await teamApi.resetPassword(selectedUser.id, resetPasswordValue || undefined)
            closeModal()
            setSelectedUser(null)
            setResetPasswordValue('')
            toast({
                title: 'Success',
                description: response.message || 'Password reset successfully. Email sent to user.',
                variant: 'success',
            })
        } catch (error: any) {
            console.error('Failed to reset password:', error)
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to reset password',
                variant: 'destructive',
            })
        } finally {
            setIsResettingPassword(false)
        }
    }

    const { user: currentUser } = useAuthStore()

    const canEdit = () => {
        if (!currentUser) return false
        return ['admin', 'team_lead', 'super_admin'].includes(currentUser.role) || can('users.edit')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand-600 shrink-0" />
                        Team Management
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm sm:text-base">
                        Manage team members and permissions
                    </p>
                </div>
                {can('users.invite') && (
                    <Button onClick={() => openModal('inviteTeamMember')} className="w-full sm:w-auto shrink-0">
                        <Plus className="w-4 h-4 mr-2" />
                        <span>Invite Member</span>
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                />
            </div>

            {/* Members Grid */}
            {isLoading ? (
                <PageSkeleton />
            ) : (
                <div className="space-y-6 pb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {members.map((user) => {
                            const roleInfo = getRoleInfo(user.role)
                            return (
                                <Card key={user.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            <UserAvatar user={user} className="w-12 h-12" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                    <h3 className="font-semibold text-gray-900 truncate text-base">{user.name}</h3>
                                                    {canEdit() && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1 hover:bg-gray-100 rounded shrink-0">
                                                                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                                    <Edit className="w-4 h-4 mr-2" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => {
                                                                    setSelectedUser(user)
                                                                    setResetPasswordValue('')
                                                                    openModal('resetPassword')
                                                                }}>
                                                                    <KeyRound className="w-4 h-4 mr-2" />
                                                                    Reset Password
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 truncate" title={user.email}>{user.email}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <Badge className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", roleInfo.color)}>
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        {roleInfo.label}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                                            <span>Joined {formatDate(user.createdAt)}</span>
                                            <span>{user.expectedHoursPerDay ?? (orgSettings?.expected_hours_per_day ? Number(orgSettings.expected_hours_per_day) : 8)}h/day</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Pagination UI */}
                    {pagination.last_page > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-gray-100">
                            <p className="text-sm text-gray-500 order-3 sm:order-1 text-center sm:text-left">
                                Showing page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{pagination.last_page}</span> ({pagination.total} total)
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                                <div className="flex items-center justify-center gap-1 flex-wrap w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-9 px-3"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        <span className="hidden xs:inline">Previous</span>
                                    </Button>

                                    <div className="flex items-center gap-1 mx-1">
                                        {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                                            let pageNum: number
                                            if (pagination.last_page <= 5) {
                                                pageNum = i + 1
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1
                                            } else if (currentPage >= pagination.last_page - 2) {
                                                pageNum = pagination.last_page - 4 + i
                                            } else {
                                                pageNum = currentPage - 2 + i
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className="w-8 h-8 p-0 shrink-0"
                                                >
                                                    {pageNum}
                                                </Button>
                                            )
                                        })}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                                        disabled={currentPage === pagination.last_page}
                                        className="h-9 px-3"
                                    >
                                        <span className="hidden xs:inline">Next</span>
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Invite Modal */}
            <Dialog open={activeModal === 'inviteTeamMember'} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email or Mobile</Label>
                            <div className="relative">
                                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="text"
                                    placeholder="Email or mobile number"
                                    value={inviteEmail}
                                    onChange={(e) => {
                                        setInviteEmail(e.target.value)
                                        // Auto-fill name from email if name is empty
                                        if (!inviteName && e.target.value.includes('@')) {
                                            const emailName = e.target.value.split('@')[0]
                                            setInviteName(emailName.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
                                        }
                                    }}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name (Optional)</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                            />
                            <p className="text-xs text-gray-500">
                                Name will be extracted from email if not provided.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignableRoles.map((role) => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeModal} disabled={isInviting}>Cancel</Button>
                        <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
                            {isInviting ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Sending...
                                </span>
                            ) : (
                                'Send Invitation'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Member Modal */}
            <Dialog open={activeModal === 'editTeamMember'} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                type="text"
                                placeholder="John Doe"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email Address</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                placeholder="user@company.com"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignableRoles.map((role) => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-row justify-end gap-2">
                        <Button variant="outline" onClick={closeModal}>Cancel</Button>
                        <Button onClick={handleUpdateUser}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Modal */}
            <Dialog open={activeModal === 'resetPassword'} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-600">
                            Reset password for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="reset-password">New Password (Optional)</Label>
                            <div className="relative">
                                <Input
                                    id="reset-password"
                                    type={showResetPassword ? "text" : "password"}
                                    placeholder="Leave empty to generate random password"
                                    value={resetPasswordValue}
                                    onChange={(e) => setResetPasswordValue(e.target.value)}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowResetPassword(!showResetPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                If left empty, a random 8-character password will be generated and sent via email.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-row justify-end gap-2">
                        <Button variant="outline" onClick={closeModal} disabled={isResettingPassword}>Cancel</Button>
                        <Button onClick={handleResetPassword} disabled={isResettingPassword}>
                            {isResettingPassword ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Resetting...
                                </span>
                            ) : (
                                'Reset Password'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

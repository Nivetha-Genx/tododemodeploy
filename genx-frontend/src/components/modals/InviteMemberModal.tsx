import { useUIStore } from '@/stores'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Button,
    Label,
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    ListSkeleton,
    Badge,
} from '@/components/ui'

import { teamApi } from '@/api/team'
import { projectsApi } from '@/api/projects'
import { useState, useEffect, useMemo } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { UserAvatar } from '@/components/UserAvatar'
import { mapBackendUserToFrontend } from '@/api/auth'
import { Search, Check } from 'lucide-react'
import { cn, getErrorMessage } from '@/lib/utils'
import { getAssignableRoles } from '@/lib/roles'

export function InviteMemberModal() {
    const { activeModal, modalData, closeModal } = useUIStore()
    const { toast } = useToast()
    const projectId = modalData?.projectId as string

    const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
    const [email, setEmail] = useState('')
    const [mobile, setMobile] = useState('')
    const [name, setName] = useState('')
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [role, setRole] = useState('member')
    const [isLoading, setIsLoading] = useState(false)
    const [users, setUsers] = useState<any[]>([])
    const [isLoadingUsers, setIsLoadingUsers] = useState(false)
    const [assignableRoles, setAssignableRoles] = useState<Array<{ value: string; label: string }>>([])
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [existingMemberIds, setExistingMemberIds] = useState<string[]>([])

    useEffect(() => {
        const fetchExistingMembers = async () => {
            if (activeModal === 'inviteMember' && projectId) {
                try {
                    const response = await projectsApi.getById(projectId)
                    if (response.data) {
                        const members = response.data.project_members || response.data.members || []
                        const ids = members.map((m: any) => String(m.user_id || m.id || ''))
                        setExistingMemberIds(ids)
                    }
                } catch (error) {
                    console.error('Failed to fetch existing project members:', error)
                }
            }
        }
        fetchExistingMembers()
    }, [activeModal, projectId])

    useEffect(() => {
        if (activeModal === 'inviteMember' && activeTab === 'existing') {
            fetchUsers()
        }
        if (activeModal === 'inviteMember') {
            fetchAssignableRoles()
        }
    }, [activeModal, activeTab])

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
            ])
        }
    }

    const fetchUsers = async () => {
        try {
            setIsLoadingUsers(true)
            const response = await teamApi.getMembers()
            if (response.data && Array.isArray(response.data)) {
                setUsers(response.data.map(mapBackendUserToFrontend))
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                setUsers(response.data.data.map(mapBackendUserToFrontend))
            }
        } catch (error) {
            console.error('Failed to fetch users:', error)
            toast({
                title: 'Error',
                description: 'Failed to load users',
                variant: 'destructive',
            })
        } finally {
            setIsLoadingUsers(false)
        }
    }

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users
        const query = searchQuery.toLowerCase()
        return users.filter(user =>
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query)
        )
    }, [users, searchQuery])


    const handleSubmit = () => {
        if (!projectId) {
            toast({
                title: 'Error',
                description: 'Project ID is missing',
                variant: 'destructive',
            })
            return
        }

        if (activeTab === 'existing') {
            if (selectedUserIds.length === 0) {
                toast({
                    title: 'Error',
                    description: 'Please select at least one user',
                    variant: 'destructive',
                })
                return
            }
        } else {
            if (!email && !mobile) {
                toast({
                    title: 'Error',
                    description: 'Please enter an email or mobile number',
                    variant: 'destructive',
                })
                return
            }
        }

        // Show confirmation dialog
        setShowConfirmDialog(true)
    }

    const confirmAndSendInvite = async () => {
        setShowConfirmDialog(false)

        try {
            setIsLoading(true)

            if (activeTab === 'existing') {
                // Invite existing users
                await projectsApi.inviteMember(projectId, {
                    members: selectedUserIds.map(userId => ({ assign_id: userId }))
                })

                toast({
                    title: 'Success',
                    description: `${selectedUserIds.length} member${selectedUserIds.length > 1 ? 's' : ''} added to project successfully`,
                })
            } else {
                // Invite new user via organization invite
                await teamApi.inviteMember({
                    ...(email && { email }),
                    ...(mobile && { mobile }),
                    role: role as any,
                    ...(name && { name }) // Include name if provided
                })

                toast({
                    title: 'Success',
                    description: 'Invitation sent successfully',
                    variant: 'success',
                })
            }

            closeModal()
            setEmail('')
            setMobile('')
            setName('')
            setSelectedUserIds([])
            setSearchQuery('')
            setRole('member')
            // Refresh project data
            window.dispatchEvent(new CustomEvent('project-updated'))
        } catch (error: any) {
            console.error('Failed to invite member:', error)
            const errorMessage = getErrorMessage(error)
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={activeModal === 'inviteMember'} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                    <DialogDescription>
                        Add a team member to this project.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'existing' | 'new')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100/80 p-1 rounded-2xl h-auto border border-gray-200/50">
                        <TabsTrigger 
                            value="existing" 
                            className="rounded-xl py-1.5 text-sm font-bold transition-all duration-300 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                        >
                            Existing User
                        </TabsTrigger>
                        <TabsTrigger 
                            value="new" 
                            className="rounded-xl py-1.5 text-sm font-bold transition-all duration-300 data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                        >
                            New User
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="search">Search Users</Label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="search"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10 bg-gray-50/50 border-gray-100 rounded-xl focus-visible:ring-brand-500/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Select User</Label>
                            <div className="border border-gray-100 rounded-2xl max-h-[200px] overflow-y-auto overflow-x-hidden p-1 shadow-inner bg-gray-50/20">
                                {isLoadingUsers ? (
                                    <div className="p-4">
                                        <ListSkeleton count={3} />
                                    </div>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => {
                                        const isExistingMember = existingMemberIds.includes(String(user.id))
                                        const isSelected = selectedUserIds.includes(String(user.id)) || isExistingMember

                                        return (
                                            <div
                                                key={user.id}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-2.5 transition-all text-left rounded-xl mb-1",
                                                    !isExistingMember ? "hover:bg-white hover:shadow-sm cursor-pointer" : "cursor-default opacity-80",
                                                    (isSelected && !isExistingMember) && "bg-brand-50/80 ring-1 ring-brand-100 shadow-sm"
                                                )}
                                                onClick={() => {
                                                    if (isExistingMember) return
                                                    const userId = String(user.id)
                                                    if (selectedUserIds.includes(userId)) {
                                                        setSelectedUserIds(prev => prev.filter(id => id !== userId))
                                                    } else {
                                                        setSelectedUserIds(prev => [...prev, userId])
                                                    }
                                                }}
                                            >
                                                <div className={cn(
                                                    "flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    isSelected
                                                        ? (isExistingMember ? "bg-gray-100 border-gray-200" : "bg-brand-600 border-brand-600 scale-110")
                                                        : "border-gray-200 bg-white"
                                                )}>
                                                    {isSelected && (
                                                        <Check className={cn(
                                                            "w-3 h-3",
                                                            isExistingMember ? "text-gray-400" : "text-white"
                                                        )} />
                                                    )}
                                                </div>
                                                <UserAvatar user={user} className="h-9 w-9 border-2 border-white shadow-sm" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={cn(
                                                            "text-sm font-bold truncate",
                                                            isSelected && !isExistingMember ? "text-brand-900" : "text-gray-900"
                                                        )}>
                                                            {user.name}
                                                        </p>
                                                        {isExistingMember && (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-white text-gray-500 border-gray-200 font-normal uppercase tracking-wider">
                                                                Already in project
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        {searchQuery ? 'No users found' : 'No users available'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="new" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-10 rounded-xl border-gray-200 bg-white"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-10 rounded-xl border-gray-200 bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="mobile">Mobile Number (Optional)</Label>
                                <Input
                                    id="mobile"
                                    type="tel"
                                    placeholder="9876543210"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    className="h-10 rounded-xl border-gray-200 bg-white"
                                />
                            </div>
                        </div>

                        <p className="text-xs text-gray-500">
                            Provide an email or mobile number to send the invitation.
                        </p>

                        <div className="space-y-2">
                            <Label htmlFor="org-role" className="text-xs font-bold uppercase tracking-wider text-gray-500">Organization Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger id="org-role" className="h-10 rounded-xl border-gray-200 bg-white hover:bg-gray-50 shadow-sm">
                                    <SelectValue placeholder="Select organization role" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-gray-200 shadow-2xl p-1 bg-white ring-1 ring-black/5">
                                    {assignableRoles.map((r) => (
                                        <SelectItem key={r.value} value={r.value} className="rounded-xl py-2 px-3 focus:bg-brand-50 transition-colors mb-0.5">
                                            <span className="font-medium">{r.label}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-gray-400 italic">
                                The user will be added to the project as a contributor after joining.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={closeModal} disabled={isLoading} className="rounded-xl h-10 px-6">Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || (activeTab === 'existing' ? selectedUserIds.length === 0 : (!email && !mobile))}
                        className="bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/20 rounded-xl h-10 px-6"
                    >
                        {isLoading ? 'Processing...' : activeTab === 'existing'
                            ? `Add ${selectedUserIds.length} Member${selectedUserIds.length !== 1 ? 's' : ''}`
                            : 'Send Invitation'}
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Invitation</DialogTitle>
                        <DialogDescription>
                            {activeTab === 'existing'
                                ? selectedUserIds.length === 1
                                    ? `Are you sure you want to add ${filteredUsers.find(u => u.id === selectedUserIds[0])?.name || 'this user'} to the project?`
                                    : `Are you sure you want to add ${selectedUserIds.length} members to the project?`
                                : `Are you sure you want to send an invitation to ${email || mobile}${name ? ` (${name})` : ''} with role "${assignableRoles.find(r => r.value === role)?.label || role}"?`
                            }
                            {activeTab === 'existing' && selectedUserIds.length > 1 && (
                                <div className="mt-3 max-h-32 overflow-y-auto space-y-1">
                                    {selectedUserIds.map(userId => {
                                        const user = filteredUsers.find(u => u.id === userId)
                                        return user ? (
                                            <div key={userId} className="text-sm text-gray-600">• {user.name} ({user.email})</div>
                                        ) : null
                                    })}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button onClick={confirmAndSendInvite} disabled={isLoading}>
                            {isLoading ? 'Processing...' : 'Confirm & Send'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}

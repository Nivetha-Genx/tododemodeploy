import { useState, useEffect } from 'react'
import {
    Search,
    MoreVertical,
    Key,
    Building2,
    Shield,
    Mail,
    Copy,
    Check,
    CheckCircle2
} from 'lucide-react'
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Input,
    Badge,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Skeleton,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Label
} from '@/components/ui'
import { usersApi } from '@/api/users'
import { organizationsApi } from '@/api/organizations'
import { useToast } from '@/components/ui/use-toast'
import { getRoleInfo } from '@/lib/roles'

export function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([])
    const [organizations, setOrganizations] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
    const [resetSuccess, setResetSuccess] = useState<{ email: string; otp: string } | null>(null)
    const [copied, setCopied] = useState(false)

    // Filters
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [orgFilter, setOrgFilter] = useState('all')

    const { toast } = useToast()

    const fetchUsers = async (page = 1) => {
        setIsLoading(true)
        try {
            const params: any = { page }
            if (search) params.search = search
            if (roleFilter !== 'all') params.role = roleFilter
            if (orgFilter !== 'all') params.organization_id = orgFilter

            const response = await usersApi.getUsers(params)
            if (response.success) {
                setUsers(response.data.data)
                setPagination({
                    current_page: response.data.current_page,
                    last_page: response.data.last_page,
                    total: response.data.total
                })
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch users',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const fetchOrgs = async () => {
        try {
            const response = await organizationsApi.getAll()
            if (response.success) {
                setOrganizations(response.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch orgs', error)
        }
    }

    useEffect(() => {
        fetchOrgs()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search, roleFilter, orgFilter])

    const handleResetPassword = async (userId: string) => {
        if (!confirm('Are you sure you want to reset password for this user? They will receive an email with a new OTP.')) return

        try {
            const response = await usersApi.resetPassword(userId)
            if (response.success) {
                const user = users.find(u => u.id === userId)
                setResetSuccess({
                    email: user?.email || 'User',
                    otp: response.otp
                })
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to reset password',
                variant: 'destructive',
            })
        }
    }

    const getRoleBadge = (role: string) => {
        const { label, color } = getRoleInfo(role)
        return <Badge className={`${color} hover:${color.split(' ')[0]}`}>{label}</Badge>
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">System-wide user administration and password resets</p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="team_lead">Team Lead</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={orgFilter} onValueChange={setOrgFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="All Organizations" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Organizations</SelectItem>
                                    {Array.isArray(organizations) && organizations.map((org: any) => (
                                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-gray-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="w-[300px]">User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : users.length > 0 ? (
                                    users.map((user) => (
                                        <TableRow key={user.id} className="hover:bg-gray-50/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{user.name}</span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                                            <TableCell>
                                                {user.organization ? (
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        {user.organization.name}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">System (Global)</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                                                            <Key className="w-4 h-4 mr-2" /> Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem disabled>
                                                            <Shield className="w-4 h-4 mr-2" /> Manage Roles
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-gray-500">
                                Showing page {pagination.current_page} of {pagination.last_page} ({pagination.total} total users)
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page === 1 || isLoading}
                                    onClick={() => fetchUsers(pagination.current_page - 1)}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page === pagination.last_page || isLoading}
                                    onClick={() => fetchUsers(pagination.current_page + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Password Reset Success Modal */}
            <Dialog open={!!resetSuccess} onOpenChange={(open) => !open && setResetSuccess(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-6 h-6" />
                            Password Reset Successful
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

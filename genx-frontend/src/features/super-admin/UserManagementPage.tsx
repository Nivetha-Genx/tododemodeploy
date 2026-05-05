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
    CheckCircle2,
    AlertCircle,
    Users
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
    Label,
    Avatar,
    AvatarFallback
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
    const [resetConfirmId, setResetConfirmId] = useState<string | null>(null)

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

    const handleResetPassword = (userId: string) => {
        setResetConfirmId(userId)
    }

    const confirmResetPassword = async () => {
        if (!resetConfirmId) return
        const userId = resetConfirmId
        setResetConfirmId(null)

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
        <div className="w-full px-4 lg:px-0 py-4 space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-brand-50 rounded-xl sm:rounded-2xl shrink-0">
                            <Users className="w-5 h-5 md:w-6 md:h-6 text-brand-600" />
                        </div>
                        <span className="truncate">User Management</span>
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">
                        System-wide user administration and security controls.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="bg-slate-50/50 p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 h-10 md:h-11 rounded-xl border-slate-200 bg-white"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full sm:w-[160px] h-10 md:h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700 text-xs sm:text-sm">
                                    <div className="flex items-center">
                                        <Shield className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                        <SelectValue placeholder="All Roles" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    <SelectItem value="all" className="font-bold text-slate-700">All Roles</SelectItem>
                                    <SelectItem value="super_admin" className="font-bold text-slate-700">Super Admin</SelectItem>
                                    <SelectItem value="admin" className="font-bold text-slate-700">Admin</SelectItem>
                                    <SelectItem value="team_lead" className="font-bold text-slate-700">Team Lead</SelectItem>
                                    <SelectItem value="member" className="font-bold text-slate-700">Member</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={orgFilter} onValueChange={setOrgFilter}>
                                <SelectTrigger className="w-full sm:w-[220px] h-10 md:h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700 text-xs sm:text-sm">
                                    <div className="flex items-center">
                                        <Building2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                        <SelectValue placeholder="All Organizations" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    <SelectItem value="all" className="font-bold text-slate-700">All Organizations</SelectItem>
                                    {Array.isArray(organizations) && organizations.map((org: any) => (
                                        <SelectItem key={org.id} value={org.id} className="font-bold text-slate-700">{org.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto scrollbar-thin">
                        <div className="min-w-[900px]">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-slate-50">
                                        <TableHead className="px-6 py-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">User</TableHead>
                                        <TableHead className="px-6 py-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">Role</TableHead>
                                        <TableHead className="px-6 py-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">Organization</TableHead>
                                        <TableHead className="px-6 py-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">Joined</TableHead>
                                        <TableHead className="px-6 py-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</TableHead>
                                    </TableRow>
                            </TableHeader>
                                <TableBody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i} className="border-slate-50">
                                                <TableCell className="px-6 py-4"><Skeleton className="h-10 w-48 rounded-lg" /></TableCell>
                                                <TableCell className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                                <TableCell className="px-6 py-4"><Skeleton className="h-6 w-32 rounded-lg" /></TableCell>
                                                <TableCell className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-lg" /></TableCell>
                                                <TableCell className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : users.length > 0 ? (
                                        users.map((user) => (
                                            <TableRow key={user.id} className="group hover:bg-slate-50/50 border-slate-50 transition-colors">
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-9 h-9 rounded-xl border border-slate-100 bg-white">
                                                            <AvatarFallback className="font-bold text-slate-400 bg-slate-50 text-xs">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-bold text-slate-900 truncate">{user.name}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                                <Mail className="w-3 h-3" /> {user.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4">{getRoleBadge(user.role)}</TableCell>
                                                <TableCell className="px-6 py-4">
                                                    {user.organization ? (
                                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                            {user.organization.name}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Global System</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-sm font-bold text-slate-500">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 hover:bg-brand-50 hover:text-brand-600">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl w-48">
                                                            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2">User Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator className="bg-slate-50" />
                                                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)} className="font-bold text-slate-700 py-2.5 cursor-pointer">
                                                                <Key className="w-4 h-4 mr-2 text-slate-400" /> Reset Password
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem disabled className="font-bold text-slate-300 py-2.5">
                                                                <Shield className="w-4 h-4 mr-2 text-slate-200" /> Manage Roles
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <Users className="w-12 h-12 text-slate-200" />
                                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No users found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-slate-50">
                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Page {pagination.current_page} of {pagination.last_page} • {pagination.total} total
                            </p>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page === 1 || isLoading}
                                    onClick={() => fetchUsers(pagination.current_page - 1)}
                                    className="flex-1 sm:flex-none rounded-lg h-9 font-bold text-slate-600"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page === pagination.last_page || isLoading}
                                    onClick={() => fetchUsers(pagination.current_page + 1)}
                                    className="flex-1 sm:flex-none rounded-lg h-9 font-bold text-slate-600"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Reset Password Confirmation Dialog */}
            <Dialog open={!!resetConfirmId} onOpenChange={(open) => !open && setResetConfirmId(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <div className="bg-white px-8 py-6 border-b border-slate-100">
                        <DialogHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-50 rounded-2xl shrink-0 shadow-sm shadow-brand-100/50">
                                    <Key className="w-6 h-6 text-brand-600" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
                                        Reset Password?
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                                        User Security
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-4">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Are you sure you want to reset the password for{' '}
                            <span className="font-bold text-slate-900">
                                {users.find(u => u.id === resetConfirmId)?.email}
                            </span>?
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 font-medium leading-tight">
                                A new one-time password will be generated and shown to you. The user must change it upon their next login.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 px-8 pb-8">
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

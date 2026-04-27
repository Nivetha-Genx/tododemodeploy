import { useState, useEffect } from 'react'
import { Plus, Shield, Search, MoreVertical, Edit2, Trash2, Info } from 'lucide-react'
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Badge,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui'
import { PageSkeleton } from '@/components/ui/modal-skeleton'
import { rolesApi, Role } from '@/api/roles'
import { useToast } from '@/components/ui/use-toast'
import { RoleDialog } from './RoleDialog'

export function RoleManagementPage() {
    const [roles, setRoles] = useState<Role[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const { toast } = useToast()

    const fetchRoles = async () => {
        setIsLoading(true)
        try {
            const response = await rolesApi.getRoles()
            if (response.success) {
                setRoles(response.data)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch roles',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRoles()
    }, [])

    const handleCreateRole = () => {
        setSelectedRole(null)
        setIsDialogOpen(true)
    }

    const handleEditRole = (role: Role) => {
        setSelectedRole(role)
        setIsDialogOpen(true)
    }

    const handleDeleteRole = async (id: number) => {
        try {
            setIsDeleting(true)
            const response = await rolesApi.deleteRole(id)
            if (response.success) {
                toast({
                    title: 'Success',
                    description: 'Role deleted successfully',
                    variant: 'success',
                })
                setIsDeleteDialogOpen(false)
                setRoleToDelete(null)
                fetchRoles()
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete role',
                variant: 'destructive',
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )

    const isProtectedRole = (name: string) => {
        // Only the core admin role is treated as a protected system role in the UI
        return ['admin'].includes(name.toLowerCase())
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-brand-600 shrink-0" />
                        Role Management
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm sm:text-base">
                        Manage custom roles and permissions for your organization
                    </p>
                </div>
                <Button onClick={handleCreateRole} className="w-full sm:w-auto shrink-0">
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Create Custom Role</span>
                </Button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                />
            </div>

            {/* Roles Grid */}
            {isLoading ? (
                <PageSkeleton />
            ) : (
                <div className="space-y-6 pb-10">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        {filteredRoles.length > 0 ? (
                            filteredRoles.map((role) => (
                                <Card key={role.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2 p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                    isProtectedRole(role.name) ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                                )}>
                                                    <Shield className="w-4 h-4" />
                                                </div>
                                                <CardTitle className="text-lg truncate">{role.name}</CardTitle>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditRole(role)}>
                                                        <Edit2 className="w-4 h-4 mr-2" /> Edit Permissions
                                                    </DropdownMenuItem>
                                                    {!isProtectedRole(role.name) && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setRoleToDelete(role)
                                                                setIsDeleteDialogOpen(true)
                                                            }}
                                                            className="text-red-600 focus:text-red-700"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" /> Delete Role
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0">
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap gap-1.5 min-h-[60px]">
                                                {role.permissions && role.permissions.length > 0 ? (
                                                    role.permissions.map(p => (
                                                        <Badge key={p.id} variant="secondary" className="text-[10px] py-0 leading-tight">
                                                            {p.name.replace(/\./g, ': ')}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No specific permissions assigned</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2">
                                                <span className="flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    {isProtectedRole(role.name) ? "System Role" : "Custom Role"}
                                                </span>
                                                {isProtectedRole(role.name) && (
                                                    <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-200">Protected</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                No roles found matching your search.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <RoleDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                role={selectedRole}
                onSuccess={fetchRoles}
            />

            {/* Delete Role Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden">
                    <div className="p-8">
                        <DialogHeader className="space-y-4">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-700 ring-8 ring-red-50/50">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <div className="space-y-1 text-center">
                                <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">Delete Role</DialogTitle>
                                <DialogDescription className="text-gray-500 text-sm">
                                    Are you sure you want to delete the role <span className="font-semibold text-gray-900">"{roleToDelete?.name}"</span>?
                                    <br />
                                    This action cannot be undone and may affect users assigned to this role.
                                </DialogDescription>
                            </div>
                        </DialogHeader>
                    </div>
                    <DialogFooter className="flex-row gap-3 p-6 bg-gray-50 border-t border-gray-100 sm:justify-center">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="flex-1 rounded-xl h-12 border-gray-200 hover:bg-white hover:border-gray-300 font-semibold text-gray-700 transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => roleToDelete && handleDeleteRole(roleToDelete.id)}
                            disabled={isDeleting}
                            className="flex-1 rounded-xl h-12 bg-red-700 hover:bg-red-800 transition-all font-semibold flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            <span>{isDeleting ? 'Deleting...' : 'Delete Role'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

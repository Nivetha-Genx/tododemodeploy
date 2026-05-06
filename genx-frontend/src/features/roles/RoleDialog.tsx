import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Button,
    Input,
    Label,
    Checkbox,
    ModalSkeleton,
} from '@/components/ui'

import { rolesApi, Role, Permission } from '@/api/roles'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/stores'

interface RoleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    role: Role | null
    onSuccess: () => void
}

export function RoleDialog({ open, onOpenChange, role, onSuccess }: RoleDialogProps) {
    const { user } = useAuthStore()
    // Use access_level for base access checks (not role, which can be custom)
    const isSuperAdmin = (user?.access_level || user?.role) === 'super_admin'
    const [name, setName] = useState('')
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
    const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        'Projects': true,
        'Users': true,
        'Tasks': true,
        'Sprints': true,
        'Settings': true,
        'System': true,
    })
    const { toast } = useToast()

    useEffect(() => {
        if (open) {
            fetchPermissions()
            if (role) {
                setName(role.name)
                setSelectedPermissions(role.permissions?.map(p => p.name) || [])
            } else {
                setName('')
                setSelectedPermissions([])
            }
        }
    }, [open, role])

    const fetchPermissions = async () => {
        setIsLoading(true)
        try {
            const response = await rolesApi.getPermissions()
            if (response.success) {
                setAvailablePermissions(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch permissions', error)
        } finally {
            setIsLoading(false)
        }
    }


    const handleTogglePermission = (permissionName: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionName)
                ? prev.filter(p => p !== permissionName)
                : [...prev, permissionName]
        )
    }

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }))
    }

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: 'Error', description: 'Role name is required', variant: 'destructive' })
            return
        }

        setIsSaving(true)
        try {
            const data = {
                name,
                permissions: selectedPermissions,
            }

            let response
            if (role) {
                response = await rolesApi.updateRole(role.id, data)
            } else {
                response = await rolesApi.createRole(data)
            }

            if (response.success) {
                toast({
                    title: role ? 'Updated' : 'Success',
                    description: `Role ${role ? 'updated' : 'created'} successfully`,
                    variant: role ? 'info' : 'success',
                })
                onSuccess()
                onOpenChange(false)
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save role',
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }

    // System-level permissions that should only be visible to super admins
    const systemPermissions = [
        'manage-organizations',
        'view-all-organizations',
        'create-admin-users',
        'view-system-stats',
        'manage-all-users',
    ]

    // Filter permissions based on user role
    const filteredPermissions = isSuperAdmin
        ? availablePermissions
        : availablePermissions.filter(p => !systemPermissions.includes(p.name))

    const permissionGroups = {
        'Projects': filteredPermissions.filter(p => p.name.startsWith('projects.') || p.name === 'manage-projects'),
        'Users': filteredPermissions.filter(p => p.name.startsWith('users.') || p.name === 'manage-users' || p.name === 'invite-members'),
        'Tasks': filteredPermissions.filter(p => p.name.startsWith('tasks.') || p.name === 'manage-tasks' || p.name === 'view-all-tasks'),
        'Sprints': filteredPermissions.filter(p => p.name.startsWith('sprints.')),
        'Settings': filteredPermissions.filter(p => p.name.includes('settings') || p.name === 'manage-organization' || p.name === 'manage-roles'),
        'System': isSuperAdmin ? filteredPermissions.filter(p => !p.name.includes('.') &&
            !['manage-projects', 'manage-users', 'invite-members', 'manage-tasks', 'view-all-tasks', 'manage-organization', 'manage-roles'].includes(p.name)) : [],
    }

    const isProtectedRole = role && ['admin'].includes(role.name.toLowerCase())

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[95vw] sm:!max-w-[95vw] w-full max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{role ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
                    <DialogDescription>
                        {role ? 'Modify permissions for this role.' : 'Define a new role and assign specific module permissions.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4 overflow-y-auto pr-2 px-4 flex-1">
                    {isLoading ? (
                        <ModalSkeleton rows={5} />
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="role-name">Role Name</Label>
                                <Input
                                    id="role-name"
                                    placeholder="e.g. Project Manager"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!!isProtectedRole}
                                />
                                {isProtectedRole && (
                                    <p className="text-xs text-blue-500 italic">System role names cannot be modified.</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <Label>Permissions</Label>
                                <div className="space-y-3">
                                    {Object.entries(permissionGroups).map(([group, permissions]) => (

                                        permissions.length > 0 && (
                                            <div key={group} className="border border-gray-200 rounded-lg overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(group)}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    <h4 className="text-sm font-semibold text-gray-900">{group}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">
                                                            {permissions.filter(p => selectedPermissions.includes(p.name)).length} / {permissions.length} selected
                                                        </span>
                                                        {expandedGroups[group] ? (
                                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                                        )}
                                                    </div>
                                                </button>
                                                {expandedGroups[group] && (
                                                    <div className="p-4 bg-white">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {permissions.map(p => (
                                                                <div key={p.id} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 transition-colors">
                                                                    <Checkbox
                                                                        id={`perm-${p.id}`}
                                                                        checked={selectedPermissions.includes(p.name)}
                                                                        onCheckedChange={() => handleTogglePermission(p.name)}
                                                                        className="mt-0.5"
                                                                    />
                                                                    <div className="grid gap-1 leading-none flex-1">
                                                                        <label
                                                                            htmlFor={`perm-${p.id}`}
                                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                        >
                                                                            {p.name.replace(/\w+\./g, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                                        </label>
                                                                        <p className="text-xs text-gray-400 mt-1">
                                                                            {p.name}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="mt-4 pt-4 border-t border-gray-100 flex flex-row justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    )
}

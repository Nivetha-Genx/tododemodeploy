import { rolesApi } from '@/api/roles';
import { UserRole } from '@/types';

/**
 * Maps backend role names to frontend role names.
 * We now use backend role names directly and only trim/normalize.
 */
export const mapBackendRoleToFrontend = (backendRole: string): UserRole => {
    return (backendRole || 'member') as UserRole;
};

/**
 * Maps frontend role names to backend role names
 */
export const mapFrontendRoleToBackend = (frontendRole: UserRole): string => {
    // Identity mapping – we send the same role the backend understands
    return frontendRole || 'member';
};

/**
 * Role display labels
 */
export const getRoleLabel = (role: UserRole | string): string => {
    const roleLabels: Record<string, string> = {
        'admin': 'Admin',
        'team_lead': 'Team Lead',
        'member': 'Member',
        'super_admin': 'Super Admin',
    };
    const key = (role || '').toLowerCase();
    if (roleLabels[key]) {
        return roleLabels[key];
    }
    // Fallback: prettify arbitrary role names like "project manager"
    return (role || 'Member')
        .toString()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Role badge colors
 */
export const getRoleColor = (role: UserRole | string): string => {
    const roleColors: Record<string, string> = {
        'admin': 'bg-purple-100 text-purple-700',
        'team_lead': 'bg-blue-100 text-blue-700',
        'member': 'bg-gray-100 text-gray-700',
        'super_admin': 'bg-red-100 text-red-700',
    };
    return roleColors[role?.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

/**
 * Get available roles for assignment (for dropdowns)
 * This fetches roles from the API and returns all organization roles
 * (excluding super_admin, which is not assignable via org UI).
 */
export const getAssignableRoles = async (): Promise<Array<{ value: UserRole; label: string }>> => {
    try {
        const response = await rolesApi.getRoles();
        if (response.success && response.data) {
            const assignableRoles = response.data
                // Do not expose super_admin in org-level assignment dropdowns
                .filter(role => role.name.toLowerCase() !== 'super_admin')
                .map(role => {
                    const value = mapBackendRoleToFrontend(role.name);
                    return {
                        value,
                        label: getRoleLabel(role.name),
                    };
                });

            // Remove duplicates by value
            const unique = Array.from(
                new Map(assignableRoles.map(r => [r.value, r])).values()
            );

            // Sort alphabetically by label for a stable UI
            return unique.sort((a, b) => a.label.localeCompare(b.label));
        }
    } catch (error) {
        console.error('Failed to fetch roles from API:', error);
    }

    // Fallback to default roles if API fails
    return [
        { value: 'member', label: 'Member' },
        { value: 'team_lead', label: 'Team Lead' },
        { value: 'admin', label: 'Admin' },
    ];
};

/**
 * Get role info for display (label and color)
 */
export const getRoleInfo = (role: UserRole | string): { label: string; color: string } => {
    return {
        label: getRoleLabel(role),
        color: getRoleColor(role),
    };
};


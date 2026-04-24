import apiClient from '@/lib/axios';

export interface Permission {
    id: number;
    name: string;
    guard_name: string;
}

export interface Role {
    id: number;
    name: string;
    team_id: number | null;
    permissions?: Permission[];
}

export interface RolesResponse {
    success: boolean;
    data: Role[];
}

export interface RoleResponse {
    success: boolean;
    data: Role;
    message?: string;
}

export interface PermissionsResponse {
    success: boolean;
    data: Permission[];
}

export const rolesApi = {
    getRoles: async () => {
        // Backend route: GET /api/v1/organization/roles
        const response = await apiClient.get<RolesResponse>('/organization/roles');
        return response.data;
    },

    createRole: async (data: { name: string; permissions?: string[] }) => {
        // Backend route: POST /api/v1/organization/roles
        const response = await apiClient.post<RoleResponse>('/organization/roles', data);
        return response.data;
    },

    updateRole: async (id: number, data: { name?: string; permissions?: string[] }) => {
        // Backend route: PUT /api/v1/organization/roles/{role}
        const response = await apiClient.put<RoleResponse>(`/organization/roles/${id}`, data);
        return response.data;
    },

    deleteRole: async (id: number) => {
        // Backend route: DELETE /api/v1/organization/roles/{role}
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/organization/roles/${id}`);
        return response.data;
    },

    getPermissions: async () => {
        // Backend route: GET /api/v1/organization/permissions
        const response = await apiClient.get<PermissionsResponse>('/organization/permissions');
        return response.data;
    }
};

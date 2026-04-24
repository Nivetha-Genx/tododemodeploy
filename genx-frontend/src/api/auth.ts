import apiClient from '@/lib/axios';
import { User, UserRole } from '@/types';

export interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
    device_name?: string;
}

export interface AuthResponseData {
    user: any; // Raw user from backend
    access_token: string;
    token_type: string;
    expires_in: number;
    must_change_password: boolean;
    org_setup_completed: boolean;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data: AuthResponseData;
}

// ── Forgot Password ──────────────────────────────────────────────
export interface ForgotPasswordPayload {
    login: string;
}

export interface ForgotPasswordResponse {
    success: boolean;
    message: string;
}

export interface VerifyPasswordOtpPayload {
    login: string;
    otp: string;
}

export interface VerifyPasswordOtpResponse {
    success: boolean;
    message: string;
    data?: { reset_token?: string };
}

export interface ResetPasswordPayload {
    login: string;
    otp: string;
    password: string;
    password_confirmation: string;
}

export interface ResetPasswordResponse {
    success: boolean;
    message: string;
}
// ─────────────────────────────────────────────────────────────────

export const authApi = {
    login: async (credentials: { login: string; password?: string; remember?: boolean; device_name?: string }) => {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
        return response.data;
    },

    validateOtp: async (data: { mobile: string; otp: string; device_name?: string }) => {
        const response = await apiClient.post<AuthResponse>('/auth/validate-otp', data);
        return response.data;
    },

    logout: async () => {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    },

    me: async () => {
        const response = await apiClient.get<{ success: boolean; data: { user: any } }>('/auth/me');
        return response.data;
    },

    refresh: async () => {
        const response = await apiClient.post<AuthResponse>('/auth/refresh');
        return response.data;
    },

    register: async (data: any) => {
        const response = await apiClient.post('/auth/register', data);
        return response.data;
    },
    changePassword: async (data: any) => {
        const response = await apiClient.post('/auth/change-password', data);
        return response.data;
    },

    /** Step 1 – request a password-reset OTP */
    forgotPassword: async (payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> => {
        const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', payload);
        return response.data;
    },

    /** Step 2 – verify the OTP sent to the user's email */
    verifyPasswordResetOtp: async (payload: VerifyPasswordOtpPayload): Promise<VerifyPasswordOtpResponse> => {
        const response = await apiClient.post<VerifyPasswordOtpResponse>('/auth/verify-forgot-password-otp', payload);
        return response.data;
    },

    /** Step 3 – set a new password using the verified OTP */
    resetPassword: async (payload: ResetPasswordPayload): Promise<ResetPasswordResponse> => {
        const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', payload);
        return response.data;
    },
    updateProfile: async (data: { name?: string; timezone?: string }) => {
        const response = await apiClient.put<{ success: boolean; data: { user: any }; message: string }>('/auth/profile', data);
        return response.data;
    },
    uploadAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('_method', 'PUT');
        const response = await apiClient.post<{ success: boolean; data: { user: any }; message: string }>('/auth/profile', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};

export const mapBackendUserToFrontend = (backendUser: any, mustChangePassword?: boolean): User => {
    return {
        id: String(backendUser.id),
        name: backendUser.name,
        email: backendUser.email,
        // Use backend role directly (normalized via type cast)
        role: (backendUser.role || 'member') as UserRole,
        organizationId: backendUser.organization_id ? String(backendUser.organization_id) : '',
        organizationName: backendUser.organization?.name || backendUser.organization_name || undefined,
        createdAt: backendUser.created_at,
        expectedHoursPerDay: backendUser.expected_hours_per_day ? Number(backendUser.expected_hours_per_day) : undefined,
        avatar: backendUser.avatar_url || undefined, // Adjust based on actual backend field
        permissions: backendUser.permissions || [],
        mustChangePassword: mustChangePassword ?? false,
    } as User;
};

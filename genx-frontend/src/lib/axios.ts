import axios from 'axios';
import { useAuthStore } from '@/stores';
import { useUIStore } from '@/stores/uiStore';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Close any open modals or drawers before logging out
            useUIStore.getState().closeModal();
            useUIStore.getState().closeTaskDrawer();
            // Clear auth state
            useAuthStore.getState().logout();
            // Force hard redirect to login — ensures all portals/dialogs are fully unmounted
            if (window.location.pathname !== '/login') {
                window.location.replace('/login');
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;

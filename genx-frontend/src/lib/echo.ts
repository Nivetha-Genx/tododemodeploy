import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// @ts-ignore
window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    // Use the backend's auth endpoint
    authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,
    auth: {
        headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            Accept: 'application/json',
        }
    }
});

function getAuthToken() {
    try {
        const authData = localStorage.getItem('pm-todo-auth');
        if (authData) {
            const parsed = JSON.parse(authData);
            return parsed.state?.token || '';
        }
    } catch (e) {
        console.error('Failed to parse auth token for Echo', e);
    }
    return '';
}

export default echo;

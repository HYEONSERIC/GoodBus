const API_BASE_URL =
    // Use same-origin proxy in production/deployments (avoids CORS + cookie issues)
    (typeof window !== 'undefined' ? '/api' : '') ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

async function fetchAPI(endpoint: string, options?: RequestInit) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (!response.ok) {
            let errorMessage = 'Something went wrong';
            try {
                const data = await response.json();
                errorMessage = data.error || errorMessage;
            } catch {
                try {
                    const text = await response.text();
                    errorMessage =
                        text?.trim()
                            ? `HTTP ${response.status}: ${text.trim()}`
                            : `HTTP ${response.status}: ${response.statusText}`;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
    } catch (error: unknown) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Cannot connect to server. Please check if the backend server is running.');
        }
        throw error;
    }
}

function toQuery(params?: Record<string, string | number | undefined>) {
    if (!params) return '';

    const query = new URLSearchParams(
        Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, String(value)])
    ).toString();

    return query ? `?${query}` : '';
}

export const authAPI = {
    signup: async (
        email: string,
        password: string,
        role: 'Passenger' | 'Driver' | 'BusCompany'
    ) =>
        fetchAPI('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, role }),
        }),
    login: async (email: string, password: string) =>
        fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    logout: async () =>
        fetchAPI('/auth/logout', {
            method: 'POST',
        }),
    getMe: async () => fetchAPI('/auth/me'),
};

export const tripsAPI = {
    getAll: async (status?: string) => {
        const query = status ? `?status=${status}` : '';
        return fetchAPI(`/trips${query}`);
    },
    getById: async (id: string) => fetchAPI(`/trips/${id}`),
    create: async (data: Record<string, unknown>) =>
        fetchAPI('/trips', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    award: async (tripId: string, bidId: string) =>
        fetchAPI(`/trips/${tripId}/award`, {
            method: 'POST',
            body: JSON.stringify({ bidId }),
        }),
    cancel: async (tripId: string) =>
        fetchAPI(`/trips/${tripId}/cancel`, {
            method: 'PATCH',
        }),
    update: async (tripId: string, data: Record<string, unknown>) =>
        fetchAPI(`/trips/${tripId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
};

export const bidsAPI = {
    create: async (tripId: string, price: number, note?: string) =>
        fetchAPI('/bids', {
            method: 'POST',
            body: JSON.stringify({ tripId, price, note }),
        }),
    withdraw: async (id: string) =>
        fetchAPI(`/bids/${id}/withdraw`, {
            method: 'PATCH',
        }),
};

export const chatsAPI = {
    getRooms: async () => fetchAPI('/chats/rooms'),
    getMessages: async (roomId: string, params?: { after?: string }) =>
        fetchAPI(`/chats/rooms/${roomId}/messages${toQuery(params)}`),
    sendMessage: async (roomId: string, message: string) =>
        fetchAPI(`/chats/rooms/${roomId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        }),
    markRead: async (roomId: string) =>
        fetchAPI(`/chats/rooms/${roomId}/read`, {
            method: 'PATCH',
        }),
};

export const notificationsAPI = {
    getAll: async () => fetchAPI('/notifications'),
    getHistory: async (params?: {
        page?: number;
        pageSize?: number;
        type?: string;
        startDate?: string;
        endDate?: string;
    }) => fetchAPI(`/notifications/history${toQuery(params)}`),
    getUnreadCount: async () => fetchAPI('/notifications/unread-count'),
    markAsRead: async (id: string) =>
        fetchAPI(`/notifications/${id}/read`, {
            method: 'PATCH',
        }),
    markAllAsRead: async () =>
        fetchAPI('/notifications/read-all', {
            method: 'PATCH',
        }),
    deleteHistory: async (id: string) =>
        fetchAPI(`/notifications/history/${id}`, {
            method: 'DELETE',
        }),
    clearHistory: async () =>
        fetchAPI('/notifications/history', {
            method: 'DELETE',
        }),
};

export const adminAPI = {
    getOverview: async () => fetchAPI('/admin/overview'),
    getUsers: async (params?: {
        role?: string;
        status?: string;
        search?: string;
    }) => {
        const query = params
            ? `?${new URLSearchParams(
                  Object.entries(params).filter(([, value]) => value) as string[][]
              ).toString()}`
            : '';
        return fetchAPI(`/admin/users${query}`);
    },
    updateUserStatus: async (id: string, status: 'Active' | 'Blocked') =>
        fetchAPI(`/admin/users/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    getUserDetails: async (id: string) => fetchAPI(`/admin/users/${id}`),
    getUserActivity: async (id: string, take?: number) =>
        fetchAPI(`/admin/users/${id}/activity${take ? `?take=${take}` : ''}`),
    createAdmin: async (data: {
        email: string;
        password: string;
        adminRole: 'Super' | 'CustomerSupport' | 'Operations' | 'Finance';
    }) =>
        fetchAPI('/admin/admins', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getBids: async (params?: {
        search?: string;
        bidStatus?: string;
        tripStatus?: string;
        startDate?: string;
        endDate?: string;
    }) => {
        const query = params
            ? `?${new URLSearchParams(
                  Object.entries(params).filter(([, value]) => value) as string[][]
              ).toString()}`
            : '';
        return fetchAPI(`/admin/bids${query}`);
    },
    getNotificationHistory: async (params?: {
        page?: number;
        pageSize?: number;
        type?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
        userId?: string;
    }) => fetchAPI(`/admin/notification-history${toQuery(params)}`),
};

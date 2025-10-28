const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

async function fetchAPI(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }

    return data;
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
    create: async (data: any) =>
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

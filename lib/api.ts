const API_BASE_URL =
    // Use same-origin proxy in production/deployments (avoids CORS + cookie issues)
    (typeof window !== 'undefined' ? '/api' : '') ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

async function fetchAPI(endpoint: string, options?: RequestInit) {
    try {
        const isFormData =
            typeof FormData !== 'undefined' && options?.body instanceof FormData;
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers: {
                ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
        role: 'Passenger' | 'Driver' | 'BusCompany',
        displayName?: string,
        phoneNumber?: string,
        phoneOtpCode?: string
    ) =>
        fetchAPI('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                role,
                displayName,
                phoneNumber,
                phoneOtpCode,
            }),
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
    requestPhoneOtp: async (
        phoneNumber: string,
        purpose: 'signup' | 'login'
    ) =>
        fetchAPI('/auth/phone/request-otp', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber, purpose }),
        }),
    loginWithPhone: async (phoneNumber: string, code: string) =>
        fetchAPI('/auth/phone/login', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber, code }),
        }),
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
    cancel: async (tripId: string, reason: string) =>
        fetchAPI(`/trips/${tripId}/cancel`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
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
    getMinByVehicleType: async () => fetchAPI('/bids/min-by-vehicle-type'),
};

export const paymentsAPI = {
    getBillingKeyStatus: async () => fetchAPI('/payments/billing-key'),
    deleteBillingKey: async () =>
        fetchAPI('/payments/billing-key', { method: 'DELETE' }),
    confirmBillingKey: async (authKey: string) =>
        fetchAPI('/payments/billing-key/confirm', {
            method: 'POST',
            body: JSON.stringify({ authKey }),
        }),
    subscribe: async (
        plan: 'Plus' | 'Premium' | 'Business',
        acknowledgedPlanChange?: boolean,
    ) =>
        fetchAPI('/payments/subscribe', {
            method: 'POST',
            body: JSON.stringify({ plan, acknowledgedPlanChange }),
        }),
    cancelSubscription: async () =>
        fetchAPI('/payments/subscribe/cancel', {
            method: 'POST',
        }),
    getSubscriptionStatus: async () => fetchAPI('/payments/subscribe/status'),
    reactivateSubscription: async () =>
        fetchAPI('/payments/subscribe/reactivate', {
            method: 'POST',
        }),
    cancelPendingDowngrade: async () =>
        fetchAPI('/payments/subscribe/downgrade/cancel', {
            method: 'POST',
        }),
    subscribeMinBidAddon: async () =>
        fetchAPI('/payments/addon/min-bid/subscribe', {
            method: 'POST',
        }),
    cancelMinBidAddonSubscription: async () =>
        fetchAPI('/payments/addon/min-bid/cancel', {
            method: 'POST',
        }),
    getMinBidAddonSubscriptionStatus: async () =>
        fetchAPI('/payments/addon/min-bid/status'),
    reactivateMinBidAddonSubscription: async () =>
        fetchAPI('/payments/addon/min-bid/reactivate', {
            method: 'POST',
        }),
};

export const chatsAPI = {
    ensureQuoteRoom: async (tripId: string, bidderId: string) =>
        fetchAPI('/chats/rooms/for-quote', {
            method: 'POST',
            body: JSON.stringify({ tripId, bidderId }),
        }),
    getRooms: async () => fetchAPI('/chats/rooms'),
    getMessages: async (roomId: string, params?: { after?: string }) =>
        fetchAPI(`/chats/rooms/${roomId}/messages${toQuery(params)}`),
    sendMessage: async (roomId: string, message: string) =>
        fetchAPI(`/chats/rooms/${roomId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        }),
    uploadImage: async (roomId: string, file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        return fetchAPI(`/chats/rooms/${roomId}/image`, {
            method: 'POST',
            body: formData,
            headers: {},
        });
    },
    markRead: async (roomId: string) =>
        fetchAPI(`/chats/rooms/${roomId}/read`, {
            method: 'PATCH',
        }),
    leaveRoom: async (roomId: string) =>
        fetchAPI(`/chats/rooms/${roomId}/leave`, {
            method: 'POST',
        }),
    updateRoom: async (roomId: string, body: { customTitle: string | null }) =>
        fetchAPI(`/chats/rooms/${roomId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
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
        bidderId?: string;
        passengerId?: string;
        tripId?: string;
        take?: number;
    }) => fetchAPI(`/admin/bids${toQuery(params)}`),
    getNotificationHistory: async (params?: {
        page?: number;
        pageSize?: number;
        type?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
        userId?: string;
    }) => fetchAPI(`/admin/notification-history${toQuery(params)}`),
    getVerifications: async (params?: { type?: string; status?: string }) => {
        const query = params
            ? `?${new URLSearchParams(
                  Object.entries(params).filter(([, value]) => value) as string[][]
              ).toString()}`
            : '';
        return fetchAPI(`/admin/verifications${query}`);
    },
    updateVerification: async (
        id: string,
        type: 'driver' | 'company',
        status: 'approved' | 'rejected',
        reason?: string
    ) =>
        fetchAPI(`/admin/verifications/${id}?type=${type}`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason }),
        }),
    getSupportPosts: async (params?: { kind?: string }) =>
        fetchAPI(`/admin/support-posts${toQuery(params)}`),
    createSupportPost: async (body: {
        kind: 'notice' | 'faq';
        title: string;
        body: string;
        pinned: boolean;
    }) =>
        fetchAPI('/admin/support-posts', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
    updateSupportPost: async (
        id: string,
        body: Partial<{
            kind: 'notice' | 'faq';
            title: string;
            body: string;
            pinned: boolean;
        }>
    ) =>
        fetchAPI(`/admin/support-posts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
    deleteSupportPost: async (id: string) =>
        fetchAPI(`/admin/support-posts/${id}`, {
            method: 'DELETE',
        }),
    getSupportInquiries: async (params?: {
        search?: string;
        status?: string;
        sort?: string;
        take?: number;
    }) => fetchAPI(`/admin/support-inquiries${toQuery(params)}`),
    getSupportInquiry: async (id: string) =>
        fetchAPI(`/admin/support-inquiries/${id}`),
    replySupportInquiry: async (id: string, body: { adminReply: string }) =>
        fetchAPI(`/admin/support-inquiries/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
    getRevenueStats: async (params: { from: string; to: string }) =>
        fetchAPI(
            `/admin/revenue-stats${toQuery({
                from: params.from,
                to: params.to,
            })}`,
        ),
    getRevenueAwardsForMonth: async (year: number, month: number) =>
        fetchAPI(
            `/admin/revenue-stats/awards?year=${year}&month=${month}`,
        ) as Promise<{ year: number; month: number; awards: unknown[] }>,
    getRevenueAwardsForRange: async (params: { from: string; to: string }) =>
        fetchAPI(
            `/admin/revenue-stats/awards${toQuery({
                from: params.from,
                to: params.to,
            })}`,
        ) as Promise<{ from: string; to: string; awards: unknown[] }>,
    getAuditLog: async (params?: { page?: number; pageSize?: number }) =>
        fetchAPI(`/admin/audit-log${toQuery(params)}`),
};

export const supportAPI = {
    listPosts: async (params: { kind: 'notice' | 'faq'; q?: string }) =>
        fetchAPI(`/support/posts${toQuery(params)}`),
    getPost: async (id: string) => fetchAPI(`/support/posts/${id}`),
    createInquiry: async (body: {
        category:
            | 'quote_amount'
            | 'reservation_progress'
            | 'verification'
            | 'other';
        title: string;
        body: string;
    }) =>
        fetchAPI('/support/inquiries', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
    listMyInquiries: async () => fetchAPI('/support/my-inquiries'),
    getMyInquiry: async (id: string) =>
        fetchAPI(`/support/my-inquiries/${id}`),
};

export const verificationAPI = {
    getMe: async () => fetchAPI('/verification/me'),
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetchAPI('/verification/upload', {
            method: 'POST',
            body: formData,
            headers: {},
        });
    },
};

export type DriverReviewStats = {
    avgRating: number | null;
    count: number;
};

export const reviewsAPI = {
    listForTrips: async (tripIds: string[]) => {
        if (tripIds.length === 0) return { reviews: [] };
        return fetchAPI(`/reviews?tripIds=${tripIds.join(',')}`);
    },
    create: async (formData: FormData) =>
        fetchAPI('/reviews', {
            method: 'POST',
            body: formData,
            headers: {},
        }),
    getDriverMe: async () => fetchAPI('/reviews/driver/me'),
    getDriversSummary: async (driverIds: string[]) => {
        if (driverIds.length === 0) {
            return { byDriverId: {} as Record<string, DriverReviewStats> };
        }
        return fetchAPI(
            `/reviews/drivers/summary?driverIds=${driverIds.join(',')}`,
        ) as Promise<{ byDriverId: Record<string, DriverReviewStats> }>;
    },
    getDriverById: async (driverId: string) =>
        fetchAPI(`/reviews/drivers/${driverId}`) as Promise<{
            reviews: unknown[];
            avgRating: number | null;
            count: number;
        }>,
};

export const profileAPI = {
    getMe: async () => fetchAPI('/profile/me'),
    update: async (formData: FormData) =>
        fetchAPI('/profile/me', {
            method: 'PATCH',
            body: formData,
            headers: {},
        }),
};

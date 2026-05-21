'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI, authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { verificationKindForUser } from '@/lib/adminVerification';
import type {
    AdminBidRow,
    AdminNotificationHistoryRow,
    AdminTabId,
    AdminUser,
    AdminUserActivity,
    AdminUserDetail,
    OverviewResponse,
    PassengerTripSummary,
    SupportAdminPostRow,
    SupportInquiryAdminRow,
    SupportInquiryDetail,
    VerificationRow,
} from '@/types/admin';

type AdminDashboardContextValue = ReturnType<typeof useAdminDashboardState>;

const AdminDashboardContext = createContext<AdminDashboardContextValue | null>(
    null,
);

function useAdminDashboardState() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<OverviewResponse | null>(null);
    const [error, setError] = useState('');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
    const [passengerTripSummary, setPassengerTripSummary] =
        useState<PassengerTripSummary | null>(null);
    const [selectedUserActivity, setSelectedUserActivity] =
        useState<AdminUserActivity | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [adminForm, setAdminForm] = useState({
        email: '',
        password: '',
        adminRole: 'CustomerSupport',
    });
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<
        | 'overview'
        | 'users'
        | 'bids'
        | 'notifications'
        | 'verification'
        | 'revenue'
        | 'faq'
        | 'adminCreate'
    >('overview');
    const [adminRole, setAdminRole] = useState<string | null>(null);
    const [overviewTripLimit, setOverviewTripLimit] = useState(5);
    const [overviewBidLimit, setOverviewBidLimit] = useState(5);
    const [activityTake, setActivityTake] = useState(10);
    const [bidSearch, setBidSearch] = useState('');
    const [bidStatusFilter, setBidStatusFilter] = useState('');
    const [tripStatusFilter, setTripStatusFilter] = useState('');
    const [bidStartDate, setBidStartDate] = useState('');
    const [bidEndDate, setBidEndDate] = useState('');
    const [bidResults, setBidResults] = useState<AdminBidRow[]>([]);
    const [bidLoading, setBidLoading] = useState(false);
    const [bidError, setBidError] = useState('');
    const [notificationHistory, setNotificationHistory] = useState<
        AdminNotificationHistoryRow[]
    >([]);
    const [notificationSearch, setNotificationSearch] = useState('');
    const [notificationTypeFilter, setNotificationTypeFilter] = useState('');
    const [notificationStartDate, setNotificationStartDate] = useState('');
    const [notificationEndDate, setNotificationEndDate] = useState('');
    const [notificationPage, setNotificationPage] = useState(1);
    const [notificationTotalPages, setNotificationTotalPages] = useState(1);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [notificationError, setNotificationError] = useState('');
    const [verificationType, setVerificationType] = useState<
        'all' | 'driver' | 'company'
    >('all');
    const [verificationStatus, setVerificationStatus] = useState('pending');
    const [verificationList, setVerificationList] = useState<VerificationRow[]>(
        []
    );
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationReason, setVerificationReason] = useState<{
        [key: string]: string;
    }>({});
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [supportPosts, setSupportPosts] = useState<SupportAdminPostRow[]>(
        [],
    );
    const [supportPostsLoading, setSupportPostsLoading] = useState(false);
    const [newPostKind, setNewPostKind] = useState<'notice' | 'faq'>('notice');
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostBody, setNewPostBody] = useState('');
    const [newPostPinned, setNewPostPinned] = useState(false);
    const [creatingPost, setCreatingPost] = useState(false);
    const [editPost, setEditPost] = useState<SupportAdminPostRow | null>(null);
    const [editKind, setEditKind] = useState<'notice' | 'faq'>('notice');
    const [editTitle, setEditTitle] = useState('');
    const [editBody, setEditBody] = useState('');
    const [editPinned, setEditPinned] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [faqSectionTab, setFaqSectionTab] = useState<'posts' | 'inquiries'>(
        'posts',
    );
    const [newPostDialogOpen, setNewPostDialogOpen] = useState(false);
    const [supportInquiries, setSupportInquiries] = useState<
        SupportInquiryAdminRow[]
    >([]);
    const [supportInquiriesLoading, setSupportInquiriesLoading] =
        useState(false);
    const [supportInquiryDetailOpen, setSupportInquiryDetailOpen] =
        useState(false);
    const [supportInquiryDetail, setSupportInquiryDetail] =
        useState<SupportInquiryDetail | null>(null);
    const [supportInquiryDetailLoading, setSupportInquiryDetailLoading] =
        useState(false);
    const [supportInquiryReplyDraft, setSupportInquiryReplyDraft] =
        useState('');
    const [supportInquiryReplySaving, setSupportInquiryReplySaving] =
        useState(false);
    const [supportInquiryReplyError, setSupportInquiryReplyError] =
        useState('');
    const uploadBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        async function loadData() {
            try {
                const me = await authAPI.getMe();
                if (me.user?.role !== 'Admin') {
                    router.push('/dashboard');
                    return;
                }
                setAdminRole(me.user?.adminRole || null);
                const [overviewData, usersData] = await Promise.all([
                    adminAPI.getOverview(),
                    adminAPI.getUsers(),
                ]);
                setOverview(overviewData);
                setUsers(usersData.users);
            } catch (err: unknown) {
                setError(getErrorMessage(err, 'Failed to load admin data'));
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [router]);

    useEffect(() => {
        if (activeTab === 'bids' && bidResults.length === 0 && !bidLoading) {
            handleBidSearch();
        }
        if (
            activeTab === 'notifications' &&
            notificationHistory.length === 0 &&
            !notificationLoading
        ) {
            handleNotificationHistorySearch(1);
        }
        if (activeTab === 'verification' && !verificationLoading) {
            loadVerifications();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'verification') {
            loadVerifications();
        }
    }, [verificationType, verificationStatus]);

    useEffect(() => {
        if (activeTab !== 'faq') return;
        let cancelled = false;
        (async () => {
            setSupportPostsLoading(true);
            try {
                const data = await adminAPI.getSupportPosts();
                if (!cancelled) setSupportPosts(data.posts || []);
            } catch (err: unknown) {
                if (!cancelled) {
                    setError(
                        getErrorMessage(
                            err,
                            '고객센터 글 목록을 불러오지 못했습니다.',
                        ),
                    );
                }
            } finally {
                if (!cancelled) setSupportPostsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeTab]);

    useEffect(() => {
        if (faqSectionTab !== 'posts') setNewPostDialogOpen(false);
    }, [faqSectionTab]);

    useEffect(() => {
        if (activeTab !== 'faq' || faqSectionTab !== 'inquiries') return;
        let cancelled = false;
        (async () => {
            setSupportInquiriesLoading(true);
            try {
                const data = await adminAPI.getSupportInquiries();
                if (!cancelled) setSupportInquiries(data.inquiries || []);
            } catch (err: unknown) {
                if (!cancelled) {
                    setError(
                        getErrorMessage(
                            err,
                            '문의 목록을 불러오지 못했습니다.',
                        ),
                    );
                }
            } finally {
                if (!cancelled) setSupportInquiriesLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeTab, faqSectionTab]);

    useEffect(() => {
        if (!editPost) return;
        setEditKind(editPost.kind === 'faq' ? 'faq' : 'notice');
        setEditTitle(editPost.title);
        setEditBody(editPost.body);
        setEditPinned(editPost.pinned);
    }, [editPost]);

    useEffect(() => {
        if (!supportInquiryDetail) {
            setSupportInquiryReplyDraft('');
            setSupportInquiryReplyError('');
            return;
        }
        setSupportInquiryReplyDraft(supportInquiryDetail.adminReply ?? '');
        setSupportInquiryReplyError('');
    }, [supportInquiryDetail]);

    const handleLogout = async () => {
        await authAPI.logout();
        router.push('/login');
    };

    const handleFilter = async () => {
        const params: { role?: string; status?: string; search?: string } = {};
        if (roleFilter !== 'all') params.role = roleFilter;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (search.trim()) params.search = search.trim();
        const data = await adminAPI.getUsers(params);
        setUsers(data.users);
    };

    const toggleUserStatus = async (user: AdminUser) => {
        const nextStatus = user.status === 'Active' ? 'Blocked' : 'Active';
        await adminAPI.updateUserStatus(user.id, nextStatus);
        await handleFilter();
    };

    const loadUserDetails = async (userId: string, take = activityTake) => {
        setDetailLoading(true);
        setSelectedUserId(userId);
        try {
            const [detailData, activityData] = await Promise.all([
                adminAPI.getUserDetails(userId),
                adminAPI.getUserActivity(userId, take),
            ]);
            setSelectedUser(detailData.user);
            setPassengerTripSummary(detailData.tripSummary ?? null);
            setSelectedUserActivity(activityData);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load user details'));
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCreateAdmin = async () => {
        if (!adminForm.email || !adminForm.password) {
            setError('관리자 이메일과 비밀번호를 입력하세요.');
            return;
        }
        try {
            await adminAPI.createAdmin({
                email: adminForm.email,
                password: adminForm.password,
                adminRole: adminForm.adminRole as
                    | 'Super'
                    | 'CustomerSupport'
                    | 'Operations'
                    | 'Finance',
            });
            setAdminForm({ email: '', password: '', adminRole: 'CustomerSupport' });
            await handleFilter();
        } catch (err: unknown) {
            setError(getErrorMessage(err, '관리자 생성에 실패했습니다.'));
        }
    };

    const handleBidSearch = async () => {
        setBidLoading(true);
        setBidError('');
        try {
            const data = await adminAPI.getBids({
                search: bidSearch.trim(),
                bidStatus: bidStatusFilter || undefined,
                tripStatus: tripStatusFilter || undefined,
                startDate: bidStartDate || undefined,
                endDate: bidEndDate || undefined,
            });
            setBidResults(data.bids || []);
        } catch (err: unknown) {
            setBidError(getErrorMessage(err, '입찰 검색에 실패했습니다.'));
        } finally {
            setBidLoading(false);
        }
    };

    const handleNotificationHistorySearch = async (page = notificationPage) => {
        setNotificationLoading(true);
        setNotificationError('');
        try {
            const data = await adminAPI.getNotificationHistory({
                page,
                pageSize: 10,
                search: notificationSearch.trim(),
                type: notificationTypeFilter || undefined,
                startDate: notificationStartDate || undefined,
                endDate: notificationEndDate || undefined,
            });
            setNotificationHistory(data.history || []);
            setNotificationPage(data.pagination?.page || page);
            setNotificationTotalPages(data.pagination?.totalPages || 1);
        } catch (err: unknown) {
            setNotificationError(
                getErrorMessage(err, '알림 히스토리 조회에 실패했습니다.')
            );
        } finally {
            setNotificationLoading(false);
        }
    };

    const handleActivityMore = () => {
        if (!selectedUserId) return;
        const nextTake = activityTake + 10;
        setActivityTake(nextTake);
        loadUserDetails(selectedUserId, nextTake);
    };

    const loadVerifications = async () => {
        setVerificationLoading(true);
        try {
            const data = await adminAPI.getVerifications({
                type: verificationType,
                status: verificationStatus,
            });
            setVerificationList(data.users || []);
        } catch (err: unknown) {
            setError(getErrorMessage(err, '승인 목록을 불러오지 못했습니다.'));
        } finally {
            setVerificationLoading(false);
        }
    };

    const updateVerificationStatus = async (
        user: VerificationRow,
        status: 'approved' | 'rejected',
    ) => {
        await adminAPI.updateVerification(
            user.id,
            verificationKindForUser(user),
            status,
            verificationReason[user.id],
        );
        setVerificationReason((prev) => ({ ...prev, [user.id]: '' }));
        await loadVerifications();
    };

    return {
        router,
        loading,
        setLoading,
        overview,
        setOverview,
        error,
        setError,
        users,
        setUsers,
        selectedUser,
        setSelectedUser,
        passengerTripSummary,
        setPassengerTripSummary,
        selectedUserActivity,
        setSelectedUserActivity,
        selectedUserId,
        setSelectedUserId,
        detailLoading,
        setDetailLoading,
        adminForm,
        setAdminForm,
        roleFilter,
        setRoleFilter,
        statusFilter,
        setStatusFilter,
        search,
        setSearch,
        activeTab,
        setActiveTab,
        adminRole,
        setAdminRole,
        overviewTripLimit,
        setOverviewTripLimit,
        overviewBidLimit,
        setOverviewBidLimit,
        activityTake,
        setActivityTake,
        bidSearch,
        setBidSearch,
        bidStatusFilter,
        setBidStatusFilter,
        tripStatusFilter,
        setTripStatusFilter,
        bidStartDate,
        setBidStartDate,
        bidEndDate,
        setBidEndDate,
        bidResults,
        setBidResults,
        bidLoading,
        setBidLoading,
        bidError,
        setBidError,
        notificationHistory,
        setNotificationHistory,
        notificationSearch,
        setNotificationSearch,
        notificationTypeFilter,
        setNotificationTypeFilter,
        notificationStartDate,
        setNotificationStartDate,
        notificationEndDate,
        setNotificationEndDate,
        notificationPage,
        setNotificationPage,
        notificationTotalPages,
        setNotificationTotalPages,
        notificationLoading,
        setNotificationLoading,
        notificationError,
        setNotificationError,
        verificationType,
        setVerificationType,
        verificationStatus,
        setVerificationStatus,
        verificationList,
        setVerificationList,
        verificationLoading,
        setVerificationLoading,
        verificationReason,
        setVerificationReason,
        previewUrl,
        setPreviewUrl,
        supportPosts,
        setSupportPosts,
        supportPostsLoading,
        setSupportPostsLoading,
        newPostKind,
        setNewPostKind,
        newPostTitle,
        setNewPostTitle,
        newPostBody,
        setNewPostBody,
        newPostPinned,
        setNewPostPinned,
        creatingPost,
        setCreatingPost,
        editPost,
        setEditPost,
        editKind,
        setEditKind,
        editTitle,
        setEditTitle,
        editBody,
        setEditBody,
        editPinned,
        setEditPinned,
        savingEdit,
        setSavingEdit,
        faqSectionTab,
        setFaqSectionTab,
        newPostDialogOpen,
        setNewPostDialogOpen,
        supportInquiries,
        setSupportInquiries,
        supportInquiriesLoading,
        setSupportInquiriesLoading,
        supportInquiryDetailOpen,
        setSupportInquiryDetailOpen,
        supportInquiryDetail,
        setSupportInquiryDetail,
        supportInquiryDetailLoading,
        setSupportInquiryDetailLoading,
        supportInquiryReplyDraft,
        setSupportInquiryReplyDraft,
        supportInquiryReplySaving,
        setSupportInquiryReplySaving,
        supportInquiryReplyError,
        setSupportInquiryReplyError,
        handleLogout,
        handleFilter,
        toggleUserStatus,
        loadUserDetails,
        handleCreateAdmin,
        handleBidSearch,
        handleNotificationHistorySearch,
        handleActivityMore,
        loadVerifications,
        updateVerificationStatus,
        uploadBaseUrl,
    };

}

export function AdminDashboardProvider({ children }: { children: ReactNode }) {
    const value = useAdminDashboardState();
    return (
        <AdminDashboardContext.Provider value={value}>
            {children}
        </AdminDashboardContext.Provider>
    );
}

export function useAdminDashboard() {
    const ctx = useContext(AdminDashboardContext);
    if (!ctx) {
        throw new Error('useAdminDashboard must be used within AdminDashboardProvider');
    }
    return ctx;
}

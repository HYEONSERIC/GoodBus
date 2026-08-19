'use client';

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI, authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { verificationKindForUser } from '@/lib/adminVerification';
import { buildAdminHref, parseAdminNavQuery } from '@/lib/adminNav';
import type {
    AdminAuditLogRow,
    AdminAuditLogMeta,
    AdminBidRow,
    AdminBidderStats,
    AdminNotificationHistoryRow,
    AdminReviewSummary,
    AdminTabId,
    AdminUser,
    AdminUserActivity,
    AdminUserDetail,
    OverviewResponse,
    PassengerTripSummary,
    SupportAdminPostRow,
    SupportInquiryAdminRow,
    SupportInquiryDetail,
    SupportInquiryListMeta,
    SupportInquiryListSort,
    SupportInquiryListStatus,
    VerificationRow,
    AdminRevenueStatsResponse,
} from '@/types/admin';
import {
    buildMonthOptions,
    buildYearOptions,
    currentYearMonth,
    yearMonthValue,
} from '@/lib/adminRevenueDisplay';

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
    const [bidderStats, setBidderStats] = useState<AdminBidderStats | null>(
        null,
    );
    const [reviewSummary, setReviewSummary] =
        useState<AdminReviewSummary | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [highlightBidId, setHighlightBidId] = useState<string | null>(null);
    const initialNavApplied = useRef(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [adminForm, setAdminForm] = useState({
        email: '',
        password: '',
        adminRole: 'CustomerSupport',
    });
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
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
    const [bidsTake, setBidsTake] = useState(50);
    const [bidsMeta, setBidsMeta] = useState<{
        totalMatching: number;
        returned: number;
    } | null>(null);
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
    const [supportInquiryMeta, setSupportInquiryMeta] =
        useState<SupportInquiryListMeta | null>(null);
    const [supportInquiryTake, setSupportInquiryTake] = useState(300);
    const [inquirySearch, setInquirySearch] = useState('');
    const [inquiryStatusFilter, setInquiryStatusFilter] =
        useState<SupportInquiryListStatus>('all');
    const [inquirySort, setInquirySort] =
        useState<SupportInquiryListSort>('unanswered_first');
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

    const { year: currentYear, month: currentMonth } = currentYearMonth();
    const [revenueFromYear, setRevenueFromYear] = useState(currentYear);
    const [revenueFromMonth, setRevenueFromMonth] = useState(1);
    const [revenueToYear, setRevenueToYear] = useState(currentYear);
    const [revenueToMonth, setRevenueToMonth] = useState(currentMonth);
    const [revenueStats, setRevenueStats] =
        useState<AdminRevenueStatsResponse | null>(null);
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [revenueError, setRevenueError] = useState('');

    const [auditLogs, setAuditLogs] = useState<AdminAuditLogRow[]>([]);
    const [auditLogMeta, setAuditLogMeta] = useState<AdminAuditLogMeta | null>(
        null,
    );
    const [auditLogPage, setAuditLogPage] = useState(1);
    const [auditLogLoading, setAuditLogLoading] = useState(false);
    const [auditLogError, setAuditLogError] = useState('');

    async function refreshOverview() {
        try {
            const overviewData = await adminAPI.getOverview();
            setOverview(overviewData);
        } catch (err: unknown) {
            setError(getErrorMessage(err, '요약 정보를 불러오지 못했습니다.'));
        }
    }

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
        if (loading || initialNavApplied.current) return;
        if (typeof window === 'undefined') return;
        initialNavApplied.current = true;
        const nav = parseAdminNavQuery(
            new URLSearchParams(window.location.search),
        );
        if (nav.tab) setActiveTab(nav.tab);
        if (nav.tab === 'users' && nav.userId) {
            void loadUserDetails(nav.userId, 10);
        }
        if (nav.tab === 'bids') {
            if (nav.bidSearch) setBidSearch(nav.bidSearch);
            if (nav.bidStatus) setBidStatusFilter(nav.bidStatus);
            void runBidSearch({
                search: nav.bidSearch,
                bidStatus: nav.bidStatus,
                bidderId: nav.bidderId,
                passengerId: nav.passengerId,
                tripId: nav.tripId,
            });
        }
    }, [loading]);

    const overviewRefreshSkipRef = useRef(true);
    useEffect(() => {
        if (loading) return;
        if (overviewRefreshSkipRef.current) {
            overviewRefreshSkipRef.current = false;
            return;
        }
        void refreshOverview();
    }, [activeTab]);

    useEffect(() => {
        setError('');
    }, [activeTab]);

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
        if (activeTab === 'revenue' && !revenueStats && !revenueLoading) {
            void loadRevenueStats();
        }
        if (
            activeTab === 'auditLog' &&
            auditLogs.length === 0 &&
            !auditLogLoading
        ) {
            void loadAuditLog(1);
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

    const loadSupportInquiries = async (overrides?: {
        search?: string;
        status?: SupportInquiryListStatus;
        sort?: SupportInquiryListSort;
        take?: number;
    }) => {
        setSupportInquiriesLoading(true);
        const take = overrides?.take ?? supportInquiryTake;
        try {
            const data = await adminAPI.getSupportInquiries({
                search: (overrides?.search ?? inquirySearch).trim() || undefined,
                status: overrides?.status ?? inquiryStatusFilter,
                sort: overrides?.sort ?? inquirySort,
                take,
            });
            setSupportInquiries(data.inquiries || []);
            setSupportInquiryMeta(data.meta ?? null);
            setSupportInquiryTake(take);
        } catch (err: unknown) {
            setError(
                getErrorMessage(err, '문의 목록을 불러오지 못했습니다.'),
            );
        } finally {
            setSupportInquiriesLoading(false);
        }
    };

    const handleSupportInquiryLoadMore = () => {
        const nextTake = Math.min(supportInquiryTake + 100, 500);
        void loadSupportInquiries({ take: nextTake });
    };

    useEffect(() => {
        if (activeTab !== 'faq' || faqSectionTab !== 'inquiries') return;
        void loadSupportInquiries({ take: 300 });
    }, [activeTab, faqSectionTab, inquiryStatusFilter, inquirySort]);

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
        router.push('/admin/login');
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

    const syncAdminUrl = (query: Parameters<typeof buildAdminHref>[0]) => {
        router.replace(buildAdminHref(query), { scroll: false });
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
            setBidderStats(detailData.bidderStats ?? null);
            setReviewSummary(detailData.reviewSummary ?? null);
            setSelectedUserActivity({
                trips: activityData.trips ?? [],
                bids: activityData.bids ?? [],
                reviews: activityData.reviews ?? [],
            });
            syncAdminUrl({ tab: 'users', userId });
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load user details'));
        } finally {
            setDetailLoading(false);
        }
    };

    const openUserProfile = async (userId: string) => {
        setActiveTab('users');
        setActivityTake(10);
        await loadUserDetails(userId, 10);
    };

    const runBidSearch = async (overrides?: {
        search?: string;
        bidStatus?: string;
        tripStatus?: string;
        startDate?: string;
        endDate?: string;
        bidderId?: string;
        passengerId?: string;
        tripId?: string;
        highlightBidId?: string | null;
        take?: number;
    }) => {
        setBidLoading(true);
        setBidError('');
        if (overrides?.highlightBidId !== undefined) {
            setHighlightBidId(overrides.highlightBidId);
        }
        const take = overrides?.take ?? bidsTake;
        try {
            const data = await adminAPI.getBids({
                search: (overrides?.search ?? bidSearch).trim() || undefined,
                bidStatus:
                    (overrides?.bidStatus ?? bidStatusFilter) || undefined,
                tripStatus:
                    (overrides?.tripStatus ?? tripStatusFilter) || undefined,
                startDate: (overrides?.startDate ?? bidStartDate) || undefined,
                endDate: (overrides?.endDate ?? bidEndDate) || undefined,
                bidderId: overrides?.bidderId,
                passengerId: overrides?.passengerId,
                tripId: overrides?.tripId,
                take,
            });
            setBidResults(data.bids || []);
            setBidsMeta(data.meta ?? null);
            setBidsTake(take);
            syncAdminUrl({
                tab: 'bids',
                bidSearch: (overrides?.search ?? bidSearch).trim() || undefined,
                bidStatus:
                    (overrides?.bidStatus ?? bidStatusFilter) || undefined,
                bidderId: overrides?.bidderId,
                passengerId: overrides?.passengerId,
                tripId: overrides?.tripId,
            });
        } catch (err: unknown) {
            setBidError(getErrorMessage(err, '입찰 검색에 실패했습니다.'));
        } finally {
            setBidLoading(false);
        }
    };

    const handleBidLoadMore = () => {
        const nextTake = Math.min(bidsTake + 50, 200);
        void runBidSearch({ take: nextTake, highlightBidId: null });
    };

    const openBidsForBidder = async (opts: {
        bidderId: string;
        email: string | null;
        bidStatus?: string;
        highlightBidId?: string;
    }) => {
        setActiveTab('bids');
        const search = opts.email ?? '';
        setBidSearch(search);
        if (opts.bidStatus !== undefined) {
            setBidStatusFilter(opts.bidStatus);
        }
        await runBidSearch({
            search,
            bidderId: opts.bidderId,
            bidStatus: opts.bidStatus,
            highlightBidId: opts.highlightBidId ?? null,
            take: 50,
        });
    };

    const openBidsForPassenger = async (opts: {
        passengerId: string;
        email: string | null;
    }) => {
        setActiveTab('bids');
        const search = opts.email ?? '';
        setBidSearch(search);
        await runBidSearch({
            search,
            passengerId: opts.passengerId,
            highlightBidId: null,
            take: 50,
        });
    };

    const openBidsForTrip = async (tripId: string) => {
        setActiveTab('bids');
        setBidSearch('');
        await runBidSearch({
            tripId,
            search: '',
            highlightBidId: null,
            take: 50,
        });
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

    const loadRevenueStats = async () => {
        setRevenueLoading(true);
        setRevenueError('');
        try {
            const data = await adminAPI.getRevenueStats({
                from: yearMonthValue(revenueFromYear, revenueFromMonth),
                to: yearMonthValue(revenueToYear, revenueToMonth),
            });
            setRevenueStats(data as AdminRevenueStatsResponse);
        } catch (err: unknown) {
            setRevenueError(
                getErrorMessage(err, '거래 통계를 불러오지 못했습니다.'),
            );
            setRevenueStats(null);
        } finally {
            setRevenueLoading(false);
        }
    };

    const handleBidSearch = async () => {
        await runBidSearch({ highlightBidId: null, take: 50 });
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
        await refreshOverview();
    };

    const loadAuditLog = async (page = auditLogPage) => {
        setAuditLogLoading(true);
        setAuditLogError('');
        try {
            const data = await adminAPI.getAuditLog({ page, pageSize: 30 });
            setAuditLogs(data.logs || []);
            setAuditLogMeta(data.meta ?? null);
            setAuditLogPage(page);
        } catch (err: unknown) {
            setAuditLogError(
                getErrorMessage(err, '감사 로그를 불러오지 못했습니다.'),
            );
        } finally {
            setAuditLogLoading(false);
        }
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
        bidderStats,
        reviewSummary,
        selectedUserId,
        setSelectedUserId,
        highlightBidId,
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
        bidsTake,
        bidsMeta,
        handleBidLoadMore,
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
        supportInquiryMeta,
        supportInquiryTake,
        handleSupportInquiryLoadMore,
        inquirySearch,
        setInquirySearch,
        inquiryStatusFilter,
        setInquiryStatusFilter,
        inquirySort,
        setInquirySort,
        loadSupportInquiries,
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
        openUserProfile,
        openBidsForBidder,
        openBidsForPassenger,
        openBidsForTrip,
        handleCreateAdmin,
        handleBidSearch,
        runBidSearch,
        handleNotificationHistorySearch,
        handleActivityMore,
        loadVerifications,
        updateVerificationStatus,
        refreshOverview,
        uploadBaseUrl,
        revenueFromYear,
        setRevenueFromYear,
        revenueFromMonth,
        setRevenueFromMonth,
        revenueToYear,
        setRevenueToYear,
        revenueToMonth,
        setRevenueToMonth,
        revenueStats,
        revenueLoading,
        revenueError,
        setRevenueError,
        loadRevenueStats,
        revenueYearOptions: buildYearOptions(),
        revenueMonthOptions: buildMonthOptions(),
        auditLogs,
        auditLogMeta,
        auditLogPage,
        auditLogLoading,
        auditLogError,
        loadAuditLog,
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

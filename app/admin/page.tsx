'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import { adminAPI, authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface SupportAdminPostRow {
    id: string;
    kind: string;
    title: string;
    body: string;
    pinned: boolean;
    authorLabel: string;
    authorRole: string;
    createdAt: string;
    updatedAt: string;
}

interface SupportInquiryAdminRow {
    id: string;
    title: string;
    category: string;
    categoryLabel: string;
    createdAt: string;
    authorEmail: string;
    authorRole: string;
    authorDisplay: string;
    repliedAt: string | null;
}

interface SupportInquiryDetail {
    id: string;
    title: string;
    body: string;
    category: string;
    categoryLabel: string;
    createdAt: string;
    adminReply: string | null;
    repliedAt: string | null;
    user: {
        email: string;
        role: string;
        displayName: string | null;
        companyName: string | null;
        phoneNumber: string | null;
    };
}

interface OverviewResponse {
    counts: {
        users: number;
        trips: number;
        bids: number;
    };
    recentTrips: Array<{
        id: string;
        origin: string;
        destination: string;
        createdAt: string;
        passenger: { id: string; email: string };
    }>;
    recentBids: Array<{
        id: string;
        price: string;
        createdAt: string;
        trip: { id: string; origin: string; destination: string };
        bidder: { id: string; email: string; role: string };
    }>;
}

interface AdminUser {
    id: string;
    email: string;
    role: string;
    status: 'Active' | 'Blocked';
    createdAt: string;
}

interface PassengerTripSummary {
    quoteOpen: number;
    quoteExpired?: number;
    reservationUpcoming: number;
    completed: number;
    totalGrouped: number;
    totalRaw: number;
}

interface AdminUserDetail extends AdminUser {
    _count: {
        tripsAsPassenger: number;
        bids: number;
    };
    displayName?: string | null;
    companyName?: string | null;
    phoneNumber?: string | null;
    garageAddress?: string | null;
    busNumber?: string | null;
    busType?: string | null;
    busYear?: string | null;
    capacity?: number | null;
    profileImageUrl?: string | null;
    vehicleImageUrls?: string[] | null;
    driverLicenseUrl?: string | null;
    driverLicenseStatus?: string | null;
    driverLicenseNote?: string | null;
    companyRegistrationUrl?: string | null;
    companyRegistrationStatus?: string | null;
    companyRegistrationNote?: string | null;
}

interface AdminUserActivity {
    trips: Array<{
        id: string;
        origin: string;
        destination: string;
        status: string;
        createdAt: string;
    }>;
    bids: Array<{
        id: string;
        price: string;
        status: string;
        createdAt: string;
        trip: {
            id: string;
            origin: string;
            destination: string;
        };
    }>;
}

interface AdminBidRow {
    id: string;
    price: string;
    status: string;
    createdAt: string;
    bidder: { id: string; email: string; role: string };
    trip: {
        id: string;
        origin: string;
        destination: string;
        status: string;
        passenger: { id: string; email: string };
    };
}

interface AdminNotificationHistoryRow {
    id: string;
    type: string;
    title: string;
    readAt: string;
    user: { id: string; email: string; role: string };
    trip?: {
        id: string;
        origin: string;
        destination: string;
        dateTime: string;
    } | null;
    bid?: {
        id: string;
        price: string;
        status: string;
        trip?: {
            id: string;
            origin: string;
            destination: string;
            dateTime: string;
        } | null;
    } | null;
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function formatNotificationResult(item: AdminNotificationHistoryRow) {
    if (item.bid?.status === 'awarded' || item.type === 'BID_AWARDED') {
        return '입찰 성공';
    }
    if (['lost', 'withdrawn'].includes(item.bid?.status || '')) {
        return '입찰 실패';
    }
    if (item.title.toLowerCase().includes('cancel')) {
        return '입찰 실패';
    }
    return '입찰 대기';
}

interface VerificationRow {
    id: string;
    email: string;
    role: string;
    driverLicenseUrl?: string | null;
    driverLicenseStatus?: string | null;
    driverLicenseNote?: string | null;
    companyRegistrationUrl?: string | null;
    companyRegistrationStatus?: string | null;
    companyRegistrationNote?: string | null;
    createdAt: string;
}

function verificationKindForUser(
    user: VerificationRow,
): 'driver' | 'company' {
    return user.role === 'BusCompany' ? 'company' : 'driver';
}

function verificationDisplayForUser(user: VerificationRow) {
    const kind = verificationKindForUser(user);
    if (kind === 'company') {
        return {
            kind,
            imagePath: user.companyRegistrationUrl,
            status: user.companyRegistrationStatus,
            note: user.companyRegistrationNote,
            docLabel: '사업자등록증',
            roleLabel: '버스회사',
        };
    }
    return {
        kind,
        imagePath: user.driverLicenseUrl,
        status: user.driverLicenseStatus,
        note: user.driverLicenseNote,
        docLabel: '버스면허증',
        roleLabel: '기사',
    };
}

export default function AdminPage() {
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

    if (loading) {
        return <div className="p-8">Loading admin dashboard...</div>;
    }

    if (error) {
        return (
            <div className="p-8 space-y-4">
                <p className="text-red-600">{error}</p>
                <Button onClick={() => router.push('/login')}>Back to login</Button>
            </div>
        );
    }

    if (!overview) return null;

    const sectionTitles: Record<typeof activeTab, string> = {
        overview: '요약',
        users: '사용자',
        bids: '입찰/낙찰 관리',
        notifications: '알림 히스토리',
        verification: '기사/회사 승인',
        revenue: '매출 (예정)',
        faq: 'FAQ/문의',
        adminCreate: '관리자 계정 생성',
    };

    function navItemClass(tab: typeof activeTab) {
        return `w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            activeTab === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
        }`;
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        GoodBus
                    </p>
                    <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                        관리자
                    </h1>
                    {adminRole ? (
                        <p
                            className="mt-1 truncate text-xs text-slate-500"
                            title={adminRole}
                        >
                            {adminRole}
                        </p>
                    ) : null}
                </div>
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
                    <button
                        type="button"
                        className={navItemClass('overview')}
                        onClick={() => setActiveTab('overview')}
                    >
                        요약
                    </button>
                    <button
                        type="button"
                        className={navItemClass('users')}
                        onClick={() => setActiveTab('users')}
                    >
                        사용자
                    </button>
                    <button
                        type="button"
                        className={navItemClass('bids')}
                        onClick={() => setActiveTab('bids')}
                    >
                        입찰/낙찰 관리
                    </button>
                    <button
                        type="button"
                        className={navItemClass('notifications')}
                        onClick={() => setActiveTab('notifications')}
                    >
                        알림 히스토리
                    </button>
                    <button
                        type="button"
                        className={navItemClass('verification')}
                        onClick={() => setActiveTab('verification')}
                    >
                        기사/회사 승인
                    </button>
                    {adminRole !== 'CustomerSupport' ? (
                        <button
                            type="button"
                            className={navItemClass('revenue')}
                            onClick={() => setActiveTab('revenue')}
                        >
                            매출 (예정)
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className={navItemClass('faq')}
                        onClick={() => setActiveTab('faq')}
                    >
                        FAQ/문의
                    </button>
                    {adminRole === 'Super' ? (
                        <button
                            type="button"
                            className={navItemClass('adminCreate')}
                            onClick={() => setActiveTab('adminCreate')}
                        >
                            관리자 계정 생성
                        </button>
                    ) : null}
                </nav>
                <div className="border-t border-slate-100 p-3">
                    <Button
                        variant="outline"
                        className="w-full border-slate-200 text-slate-800 hover:bg-slate-50"
                        onClick={handleLogout}
                    >
                        로그아웃
                    </Button>
                </div>
            </aside>

            <main className="min-h-screen min-w-0 flex-1 space-y-8 overflow-y-auto p-6 md:p-8">
                <header className="border-b border-slate-200/80 pb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                        {sectionTitles[activeTab]}
                    </h2>
                </header>

            {activeTab === 'overview' && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">전체 사용자</p>
                            <p className="text-2xl font-semibold">
                                {overview.counts.users}
                            </p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">전체 여정</p>
                            <p className="text-2xl font-semibold">
                                {overview.counts.trips}
                            </p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">전체 입찰</p>
                            <p className="text-2xl font-semibold">
                                {overview.counts.bids}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-lg border p-4">
                            <h2 className="text-lg font-semibold mb-3">최근 여정</h2>
                            <div className="space-y-3 text-sm text-gray-700 max-h-80 overflow-y-auto">
                                {overview.recentTrips
                                    .slice(0, overviewTripLimit)
                                    .map((trip) => (
                                        <div
                                            key={trip.id}
                                            className="rounded border p-3"
                                        >
                                            <div className="font-medium">
                                                {trip.origin} → {trip.destination}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                승객: {trip.passenger.email}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            {overviewTripLimit < overview.recentTrips.length && (
                                <div className="mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setOverviewTripLimit((prev) =>
                                                Math.min(
                                                    prev + 5,
                                                    overview.recentTrips.length
                                                )
                                            )
                                        }
                                    >
                                        더보기
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border p-4">
                            <h2 className="text-lg font-semibold mb-3">최근 입찰</h2>
                            <div className="space-y-3 text-sm text-gray-700 max-h-80 overflow-y-auto">
                                {overview.recentBids
                                    .slice(0, overviewBidLimit)
                                    .map((bid) => (
                                        <div
                                            key={bid.id}
                                            className="rounded border p-3"
                                        >
                                            <div className="font-medium">
                                                {bid.trip.origin} → {bid.trip.destination}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                입찰자: {bid.bidder.email} (
                                                {bid.bidder.role})
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                금액: {Number(bid.price).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            {overviewBidLimit < overview.recentBids.length && (
                                <div className="mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setOverviewBidLimit((prev) =>
                                                Math.min(
                                                    prev + 5,
                                                    overview.recentBids.length
                                                )
                                            )
                                        }
                                    >
                                        더보기
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'users' && (
                <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <Label>역할</Label>
                            <select
                                className="border rounded px-2 py-1"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                            <option value="all">전체</option>
                            <option value="Passenger">승객</option>
                            <option value="Driver">기사</option>
                            <option value="BusCompany">버스회사</option>
                            <option value="Admin">관리자</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>상태</Label>
                            <select
                                className="border rounded px-2 py-1"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                            <option value="all">전체</option>
                            <option value="Active">활성</option>
                            <option value="Blocked">차단</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>이메일</Label>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            placeholder="이메일 검색"
                            />
                        </div>
                        <Button variant="outline" onClick={handleFilter}>
                        적용
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pr-4">이메일</th>
                                    <th className="py-2 pr-4">역할</th>
                                    <th className="py-2 pr-4">상태</th>
                                    <th className="py-2 pr-4">가입일</th>
                                    <th className="py-2 pr-4">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-b cursor-pointer"
                                        onClick={() => {
                                            setActivityTake(10);
                                            loadUserDetails(user.id, 10);
                                        }}
                                    >
                                        <td className="py-2 pr-4">{user.email}</td>
                                        <td className="py-2 pr-4">{user.role}</td>
                                        <td className="py-2 pr-4">{user.status}</td>
                                        <td className="py-2 pr-4">
                                            {new Date(
                                                user.createdAt
                                            ).toLocaleDateString()}
                                        </td>
                                        <td
                                            className="py-2 pr-4"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                        {user.role === 'Admin' &&
                                        adminRole !== 'Super' ? (
                                            <span className="text-xs text-gray-500">
                                                보호됨
                                            </span>
                                        ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => toggleUserStatus(user)}
                                                >
                                                    {user.status === 'Active'
                                                        ? '차단'
                                                        : '해제'}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-lg border p-4">
                        <h3 className="text-lg font-semibold mb-2">사용자 상세</h3>
                        {detailLoading && (
                            <p className="text-sm text-gray-500">불러오는 중...</p>
                        )}
                        {!detailLoading && !selectedUser && (
                            <p className="text-sm text-gray-500">
                                사용자를 선택하면 상세가 표시됩니다.
                            </p>
                        )}
                        {selectedUser && (
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="font-medium">이메일:</span>{' '}
                                    {selectedUser.email}
                                </div>
                                {(selectedUser.displayName ||
                                    selectedUser.companyName ||
                                    selectedUser.phoneNumber ||
                                    selectedUser.garageAddress ||
                                    selectedUser.busNumber ||
                                    selectedUser.busType ||
                                    selectedUser.busYear ||
                                    selectedUser.capacity !== null) && (
                                    <div className="rounded border bg-gray-50 p-3">
                                        <div className="grid gap-1 text-xs text-gray-700">
                                            {selectedUser.displayName && (
                                                <div>
                                                    <span className="font-medium">
                                                        이름:
                                                    </span>{' '}
                                                    {selectedUser.displayName}
                                                </div>
                                            )}
                                            {selectedUser.companyName && (
                                                <div>
                                                    <span className="font-medium">
                                                        소속:
                                                    </span>{' '}
                                                    {selectedUser.companyName}
                                                </div>
                                            )}
                                            {selectedUser.phoneNumber && (
                                                <div>
                                                    <span className="font-medium">
                                                        휴대전화:
                                                    </span>{' '}
                                                    {selectedUser.phoneNumber}
                                                </div>
                                            )}
                                            {selectedUser.garageAddress && (
                                                <div>
                                                    <span className="font-medium">
                                                        차고지:
                                                    </span>{' '}
                                                    {selectedUser.garageAddress}
                                                </div>
                                            )}
                                            {selectedUser.busNumber && (
                                                <div>
                                                    <span className="font-medium">
                                                        차량번호:
                                                    </span>{' '}
                                                    {selectedUser.busNumber}
                                                </div>
                                            )}
                                            {(selectedUser.busType ||
                                                selectedUser.busYear ||
                                                selectedUser.capacity !== null) && (
                                                <div>
                                                    <span className="font-medium">
                                                        차량정보:
                                                    </span>{' '}
                                                    {[
                                                        selectedUser.busType,
                                                        selectedUser.busYear
                                                            ? `${selectedUser.busYear}년식`
                                                            : null,
                                                        typeof selectedUser.capacity ===
                                                        'number'
                                                            ? `${selectedUser.capacity}명`
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' / ') || '-'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <span className="font-medium">역할:</span>{' '}
                                    {selectedUser.role}
                                </div>
                                <div>
                                    <span className="font-medium">상태:</span>{' '}
                                    {selectedUser.status}
                                </div>
                                <div>
                                    <span className="font-medium">가입일:</span>{' '}
                                    {new Date(
                                        selectedUser.createdAt
                                    ).toLocaleString()}
                                </div>
                                <div>
                                    <span className="font-medium">
                                        등록·진행 여정:
                                    </span>{' '}
                                    {selectedUser.role === 'Passenger' &&
                                    passengerTripSummary
                                        ? passengerTripSummary.totalGrouped
                                        : selectedUser._count.tripsAsPassenger}
                                    건
                                    {selectedUser.role === 'Passenger' &&
                                    passengerTripSummary ? (
                                        <p className="mt-1 text-xs text-gray-500">
                                            견적 {passengerTripSummary.quoteOpen} ·
                                            예약{' '}
                                            {
                                                passengerTripSummary.reservationUpcoming
                                            }{' '}
                                            · 완료 {passengerTripSummary.completed}
                                            {passengerTripSummary.quoteExpired
                                                ? ` · 만료 견적 ${passengerTripSummary.quoteExpired}`
                                                : ''}{' '}
                                            (승객 앱 기준, 왕복 1건·출발 전만)
                                        </p>
                                    ) : (
                                        <span className="ml-1 text-xs text-gray-500">
                                            (취소·삭제 제외)
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium">입찰 수:</span>{' '}
                                    {selectedUser._count.bids}
                                </div>
                                {selectedUser.role === 'Driver' && (
                                    <div className="pt-2 space-y-2">
                                        <span className="font-medium">
                                            운전자격증
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            상태: {selectedUser.driverLicenseStatus || '없음'}
                                        </p>
                                        {selectedUser.driverLicenseNote && (
                                            <p className="text-xs text-gray-500">
                                                사유: {selectedUser.driverLicenseNote}
                                            </p>
                                        )}
                                        {selectedUser.driverLicenseUrl ? (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                                    <button
                                                        type="button"
                                                        className="aspect-square overflow-hidden rounded-md border bg-gray-50"
                                                        onClick={() =>
                                                            setPreviewUrl(
                                                                `${uploadBaseUrl}${selectedUser.driverLicenseUrl}`
                                                            )
                                                        }
                                                    >
                                                        <img
                                                            src={`${uploadBaseUrl}${selectedUser.driverLicenseUrl}`}
                                                            alt="운전자격증"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </button>
                                                </div>
                                                <a
                                                    href={`/api/admin/verifications/${selectedUser.id}/download?type=driver`}
                                                    download
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    파일 다운로드
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500">
                                                등록된 파일이 없습니다.
                                            </p>
                                        )}
                                    </div>
                                )}
                                {selectedUser.role === 'BusCompany' && (
                                    <div className="pt-2 space-y-2">
                                        <span className="font-medium">
                                            사업자등록증
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            상태:{' '}
                                            {selectedUser.companyRegistrationStatus ||
                                                '없음'}
                                        </p>
                                        {selectedUser.companyRegistrationNote && (
                                            <p className="text-xs text-gray-500">
                                                사유: {selectedUser.companyRegistrationNote}
                                            </p>
                                        )}
                                        {selectedUser.companyRegistrationUrl ? (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                                    <button
                                                        type="button"
                                                        className="aspect-square overflow-hidden rounded-md border bg-gray-50"
                                                        onClick={() =>
                                                            setPreviewUrl(
                                                                `${uploadBaseUrl}${selectedUser.companyRegistrationUrl}`
                                                            )
                                                        }
                                                    >
                                                        <img
                                                            src={`${uploadBaseUrl}${selectedUser.companyRegistrationUrl}`}
                                                            alt="사업자등록증"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </button>
                                                </div>
                                                <a
                                                    href={`/api/admin/verifications/${selectedUser.id}/download?type=company`}
                                                    download
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    파일 다운로드
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500">
                                                등록된 파일이 없습니다.
                                            </p>
                                        )}
                                    </div>
                                )}
                                {selectedUserActivity && (
                                    <>
                                        <div className="pt-2">
                                            <span className="font-medium">
                                                최근 여정
                                            </span>
                                            <div className="mt-2 space-y-2">
                                                {selectedUserActivity.trips.length ===
                                                0 ? (
                                                    <p className="text-xs text-gray-500">
                                                        여정 기록이 없습니다.
                                                    </p>
                                                ) : (
                                                    selectedUserActivity.trips.map(
                                                        (trip) => (
                                                            <div
                                                                key={trip.id}
                                                                className="rounded border p-2 text-xs"
                                                            >
                                                                {trip.origin} →{' '}
                                                                {trip.destination} (
                                                                {trip.status})
                                                            </div>
                                                        )
                                                    )
                                                )}
                                            </div>
                                            {selectedUserActivity.trips.length >=
                                                activityTake && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mt-2"
                                                    onClick={handleActivityMore}
                                                >
                                                    더보기
                                                </Button>
                                            )}
                                        </div>
                                        <div className="pt-2">
                                            <span className="font-medium">
                                                최근 입찰
                                            </span>
                                            <div className="mt-2 space-y-2">
                                                {selectedUserActivity.bids.length ===
                                                0 ? (
                                                    <p className="text-xs text-gray-500">
                                                        입찰 기록이 없습니다.
                                                    </p>
                                                ) : (
                                                    selectedUserActivity.bids.map(
                                                        (bid) => (
                                                            <div
                                                                key={bid.id}
                                                                className="rounded border p-2 text-xs"
                                                            >
                                                                {bid.trip.origin} →{' '}
                                                                {bid.trip.destination} /
                                                                {Number(
                                                                    bid.price
                                                                ).toLocaleString()}
                                                                원 ({bid.status})
                                                            </div>
                                                        )
                                                    )
                                                )}
                                            </div>
                                            {selectedUserActivity.bids.length >=
                                                activityTake && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mt-2"
                                                    onClick={handleActivityMore}
                                                >
                                                    더보기
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            )}

            {activeTab === 'bids' && (
                <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <Label>검색</Label>
                            <Input
                                value={bidSearch}
                                onChange={(e) => setBidSearch(e.target.value)}
                                placeholder="이메일/출발지/도착지"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>입찰 상태</Label>
                            <select
                                className="border rounded px-2 py-1"
                                value={bidStatusFilter}
                                onChange={(e) =>
                                    setBidStatusFilter(e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                <option value="open">open</option>
                                <option value="withdrawn">withdrawn</option>
                                <option value="awarded">awarded</option>
                                <option value="lost">lost</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>여정 상태</Label>
                            <select
                                className="border rounded px-2 py-1"
                                value={tripStatusFilter}
                                onChange={(e) =>
                                    setTripStatusFilter(e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                <option value="open">open</option>
                                <option value="awarded">awarded</option>
                                <option value="cancelled">cancelled</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>시작일</Label>
                            <Input
                                type="date"
                                value={bidStartDate}
                                onChange={(e) => setBidStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>종료일</Label>
                            <Input
                                type="date"
                                value={bidEndDate}
                                onChange={(e) => setBidEndDate(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={handleBidSearch}>
                            검색
                        </Button>
                    </div>

                    {bidError && (
                        <p className="text-sm text-red-500">{bidError}</p>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pr-4">시간</th>
                                    <th className="py-2 pr-4">여정</th>
                                    <th className="py-2 pr-4">승객</th>
                                    <th className="py-2 pr-4">입찰자</th>
                                    <th className="py-2 pr-4">역할</th>
                                    <th className="py-2 pr-4">입찰 상태</th>
                                    <th className="py-2 pr-4">여정 상태</th>
                                    <th className="py-2 pr-4">금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bidLoading && (
                                    <tr>
                                        <td
                                            className="py-4 text-sm text-gray-500"
                                            colSpan={8}
                                        >
                                            조회 중...
                                        </td>
                                    </tr>
                                )}
                                {!bidLoading && bidResults.length === 0 && (
                                    <tr>
                                        <td
                                            className="py-4 text-sm text-gray-500"
                                            colSpan={8}
                                        >
                                            검색 결과가 없습니다.
                                        </td>
                                    </tr>
                                )}
                                {bidResults.map((bid) => (
                                    <tr key={bid.id} className="border-b">
                                        <td className="py-2 pr-4">
                                            {new Date(
                                                bid.createdAt
                                            ).toLocaleString()}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.trip.origin} →{' '}
                                            {bid.trip.destination}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.trip.passenger.email}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.bidder.email}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {bid.bidder.role}
                                        </td>
                                        <td className="py-2 pr-4">{bid.status}</td>
                                        <td className="py-2 pr-4">
                                            {bid.trip.status}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {Number(bid.price).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'notifications' && (
                <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <Label>사용자/메시지 검색</Label>
                            <Input
                                value={notificationSearch}
                                onChange={(e) =>
                                    setNotificationSearch(e.target.value)
                                }
                                placeholder="email, title, message"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>타입</Label>
                            <select
                                className="border rounded px-2 py-1"
                                value={notificationTypeFilter}
                                onChange={(e) =>
                                    setNotificationTypeFilter(e.target.value)
                                }
                            >
                                <option value="">전체</option>
                                <option value="BID_RECEIVED">입찰 도착</option>
                                <option value="BID_AWARDED">입찰 완료</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>시작일</Label>
                            <Input
                                type="date"
                                value={notificationStartDate}
                                onChange={(e) =>
                                    setNotificationStartDate(e.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>종료일</Label>
                            <Input
                                type="date"
                                value={notificationEndDate}
                                onChange={(e) =>
                                    setNotificationEndDate(e.target.value)
                                }
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => handleNotificationHistorySearch(1)}
                        >
                            검색
                        </Button>
                    </div>

                    {notificationError && (
                        <p className="text-sm text-red-500">
                            {notificationError}
                        </p>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pr-4">날짜</th>
                                    <th className="py-2 pr-4">사용자</th>
                                    <th className="py-2 pr-4">여정</th>
                                    <th className="py-2 pr-4">가격</th>
                                    <th className="py-2 pr-4">타입</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notificationLoading && (
                                    <tr>
                                        <td
                                            className="py-4 text-sm text-gray-500"
                                            colSpan={5}
                                        >
                                            조회 중...
                                        </td>
                                    </tr>
                                )}
                                {!notificationLoading &&
                                    notificationHistory.length === 0 && (
                                        <tr>
                                            <td
                                                className="py-4 text-sm text-gray-500"
                                                colSpan={5}
                                            >
                                                검색 결과가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                {notificationHistory.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="py-2 pr-4 whitespace-nowrap">
                                            {new Date(item.readAt).toLocaleString()}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {item.user.email}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {item.trip || item.bid?.trip
                                                ? `${(item.trip || item.bid?.trip)!.origin} -> ${(item.trip || item.bid?.trip)!.destination}`
                                                : '-'}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {item.bid?.price
                                                ? Number(
                                                      item.bid.price
                                                  ).toLocaleString()
                                                : '-'}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {formatNotificationResult(item)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span>
                            {notificationPage} /{' '}
                            {Math.max(notificationTotalPages, 1)}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={notificationPage <= 1}
                                onClick={() =>
                                    handleNotificationHistorySearch(
                                        notificationPage - 1
                                    )
                                }
                            >
                                이전
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    notificationPage >= notificationTotalPages
                                }
                                onClick={() =>
                                    handleNotificationHistorySearch(
                                        notificationPage + 1
                                    )
                                }
                            >
                                다음
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'verification' && (
                <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <Label>구분</Label>
                            <select
                                className="border rounded px-2 py-1"
                                value={verificationType}
                                onChange={(e) =>
                                    setVerificationType(
                                        e.target.value as
                                            | 'all'
                                            | 'driver'
                                            | 'company',
                                    )
                                }
                            >
                                <option value="all">전체</option>
                                <option value="driver">기사</option>
                                <option value="company">버스회사</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label>상태</Label>
                            <select
                                className="border rounded px-2 py-1"
                                value={verificationStatus}
                                onChange={(e) =>
                                    setVerificationStatus(e.target.value)
                                }
                            >
                                <option value="pending">pending</option>
                                <option value="approved">approved</option>
                                <option value="rejected">rejected</option>
                            </select>
                        </div>
                        <Button variant="outline" onClick={loadVerifications}>
                            새로고침
                        </Button>
                    </div>

                    {verificationLoading ? (
                        <p className="text-sm text-gray-500">불러오는 중...</p>
                    ) : verificationList.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            해당 상태의 요청이 없습니다.
                        </p>
                    ) : (
                        <div className="grid gap-4">
                            {verificationList.map((user) => {
                                const {
                                    kind,
                                    imagePath,
                                    status,
                                    note,
                                    docLabel,
                                    roleLabel,
                                } = verificationDisplayForUser(user);
                                return (
                                    <div
                                        key={user.id}
                                        className="rounded-lg border p-4 space-y-4"
                                    >
                                        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {user.email}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {roleLabel} ·{' '}
                                                            {docLabel} · 상태:{' '}
                                                            {status}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                updateVerificationStatus(
                                                                    user,
                                                                    'approved',
                                                                )
                                                            }
                                                        >
                                                            승인
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                updateVerificationStatus(
                                                                    user,
                                                                    'rejected',
                                                                )
                                                            }
                                                        >
                                                            반려
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>반려 사유</Label>
                                                    <Input
                                                        value={
                                                            verificationReason[user.id] ||
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setVerificationReason(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [user.id]:
                                                                        e.target.value,
                                                                })
                                                            )
                                                        }
                                                        placeholder="반려 사유를 입력하세요"
                                                    />
                                                    {note && (
                                                        <p className="text-xs text-gray-500">
                                                            이전 사유: {note}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {imagePath ? (
                                                    <>
                                                        <div className="rounded border bg-white p-2">
                                                            <img
                                                                src={`${uploadBaseUrl}${imagePath}`}
                                                                alt={docLabel}
                                                                className="h-56 w-full object-contain"
                                                                onClick={() =>
                                                                    setPreviewUrl(
                                                                        `${uploadBaseUrl}${imagePath}`
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-500">
                                                                클릭하면 확대됩니다.
                                                            </span>
                                                            <a
                                                                href={`/api/admin/verifications/${user.id}/download?type=${kind}`}
                                                                download
                                                                className="text-blue-600 hover:underline"
                                                            >
                                                                파일 다운로드
                                                            </a>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-gray-500">
                                                        업로드된 이미지가 없습니다.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <Dialog
                open={Boolean(previewUrl)}
                onOpenChange={(open) => {
                    if (!open) setPreviewUrl(null);
                }}
            >
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>이미지 미리보기</DialogTitle>
                        <DialogDescription>
                            클릭한 이미지를 크게 확인합니다.
                        </DialogDescription>
                    </DialogHeader>
                    {previewUrl && (
                        <img
                            src={previewUrl}
                            alt="미리보기"
                            className="max-h-[70vh] w-full rounded border object-contain bg-white"
                        />
                    )}
                </DialogContent>
            </Dialog>

            {activeTab === 'revenue' && adminRole !== 'CustomerSupport' && (
                <div className="rounded-lg border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">매출 (예정)</h2>
                    <p className="text-sm text-gray-600">
                        결제 기능 연동 이후에 사용할 탭입니다. 결제 데이터가
                        쌓이면 월/연 매출, 수수료율, 정산 내역을 시각화할 수
                        있습니다.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">월 매출</p>
                            <p className="text-2xl font-semibold">$0</p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">연 매출</p>
                            <p className="text-2xl font-semibold">$0</p>
                        </div>
                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">수수료율</p>
                            <p className="text-2xl font-semibold">0%</p>
                        </div>
                    </div>
                    <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
                        차트 자리: 월별 매출 추이
                    </div>
                </div>
            )}

            {activeTab === 'faq' && (
                <div className="mx-auto w-full max-w-3xl space-y-6">
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div
                            className="grid grid-cols-2 border-b border-slate-200"
                            role="tablist"
                            aria-label="FAQ·문의 하위 메뉴"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={faqSectionTab === 'posts'}
                                onClick={() => setFaqSectionTab('posts')}
                                className={`border-b-[3px] py-3.5 text-center text-sm transition-colors ${
                                    faqSectionTab === 'posts'
                                        ? 'border-slate-900 font-semibold text-slate-900'
                                        : 'border-transparent font-medium text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                게시글 관리
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={faqSectionTab === 'inquiries'}
                                onClick={() => setFaqSectionTab('inquiries')}
                                className={`border-b-[3px] py-3.5 text-center text-sm transition-colors ${
                                    faqSectionTab === 'inquiries'
                                        ? 'border-slate-900 font-semibold text-slate-900'
                                        : 'border-transparent font-medium text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                문의사항
                            </button>
                        </div>
                    </div>

                    {faqSectionTab === 'inquiries' ? (
                        <>
                            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        1:1 문의
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-600">
                                        사용자가 문의하기로 접수한 내용입니다.
                                        제목을 누르면 전체 내용을 볼 수 있습니다.
                                    </p>
                                </div>
                                {supportInquiriesLoading ? (
                                    <p className="text-sm text-slate-500">
                                        불러오는 중…
                                    </p>
                                ) : supportInquiries.length === 0 ? (
                                    <p className="text-sm text-slate-500">
                                        접수된 문의가 없습니다.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[640px] text-left text-sm">
                                            <thead>
                                                <tr className="border-b text-xs text-slate-500">
                                                    <th className="pb-2 pr-2">
                                                        제목
                                                    </th>
                                                    <th className="pb-2 pr-2">
                                                        유형
                                                    </th>
                                                    <th className="pb-2 pr-2">
                                                        작성자
                                                    </th>
                                                    <th className="pb-2 pr-2">
                                                        상태
                                                    </th>
                                                    <th className="pb-2">
                                                        접수일
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {supportInquiries.map((row) => (
                                                    <tr
                                                        key={row.id}
                                                        className="border-b border-slate-100"
                                                    >
                                                        <td className="max-w-[200px] py-2 pr-2">
                                                            <button
                                                                type="button"
                                                                className="w-full truncate text-left font-medium text-slate-900 underline-offset-2 hover:underline"
                                                                onClick={async () => {
                                                                    setSupportInquiryDetailOpen(
                                                                        true,
                                                                    );
                                                                    setSupportInquiryDetail(
                                                                        null,
                                                                    );
                                                                    setSupportInquiryDetailLoading(
                                                                        true,
                                                                    );
                                                                    try {
                                                                        const data =
                                                                            await adminAPI.getSupportInquiry(
                                                                                row.id,
                                                                            );
                                                                        setSupportInquiryDetail(
                                                                            data.inquiry,
                                                                        );
                                                                    } catch (err: unknown) {
                                                                        setError(
                                                                            getErrorMessage(
                                                                                err,
                                                                                '문의를 불러오지 못했습니다.',
                                                                            ),
                                                                        );
                                                                        setSupportInquiryDetailOpen(
                                                                            false,
                                                                        );
                                                                    } finally {
                                                                        setSupportInquiryDetailLoading(
                                                                            false,
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {row.title}
                                                            </button>
                                                        </td>
                                                        <td className="whitespace-nowrap py-2 pr-2 text-slate-600">
                                                            {row.categoryLabel}
                                                        </td>
                                                        <td className="max-w-[160px] truncate py-2 pr-2 text-slate-600">
                                                            {row.authorDisplay}
                                                        </td>
                                                        <td className="whitespace-nowrap py-2 pr-2">
                                                            <span
                                                                className={
                                                                    row.repliedAt
                                                                        ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                                                                        : 'rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800'
                                                                }
                                                            >
                                                                {row.repliedAt
                                                                    ? '답변 완료'
                                                                    : '답변 대기'}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-nowrap py-2 text-slate-500">
                                                            {row.createdAt.slice(
                                                                0,
                                                                10,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <Dialog
                                open={supportInquiryDetailOpen}
                                onOpenChange={(open) => {
                                    setSupportInquiryDetailOpen(open);
                                    if (!open) {
                                        setSupportInquiryDetail(null);
                                        setSupportInquiryReplyDraft('');
                                        setSupportInquiryReplyError('');
                                    }
                                }}
                            >
                                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg md:translate-x-[7rem]">
                                    {supportInquiryDetailLoading &&
                                    !supportInquiryDetail ? (
                                        <>
                                            <DialogHeader>
                                                <DialogTitle className="sr-only">
                                                    문의 상세
                                                </DialogTitle>
                                            </DialogHeader>
                                            <p className="py-6 text-center text-sm text-slate-500">
                                                불러오는 중…
                                            </p>
                                        </>
                                    ) : supportInquiryDetail ? (
                                        <>
                                            <DialogHeader>
                                                <DialogTitle className="text-left leading-snug">
                                                    {supportInquiryDetail.title}
                                                </DialogTitle>
                                                <DialogDescription className="text-left text-slate-600">
                                                    {supportInquiryDetail.categoryLabel}{' '}
                                                    ·{' '}
                                                    {supportInquiryDetail.createdAt.slice(
                                                        0,
                                                        10,
                                                    )}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-3 text-sm">
                                                <div className="rounded-md border border-slate-100 bg-slate-50/80 p-3 text-slate-700">
                                                    <p className="text-xs font-medium text-slate-500">
                                                        작성자
                                                    </p>
                                                    <p className="mt-0.5 break-all">
                                                        {
                                                            supportInquiryDetail
                                                                .user.email
                                                        }
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        역할:{' '}
                                                        {
                                                            supportInquiryDetail
                                                                .user.role
                                                        }
                                                        {supportInquiryDetail
                                                            .user.phoneNumber
                                                            ? ` · ${supportInquiryDetail.user.phoneNumber}`
                                                            : ''}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">
                                                        문의 내용
                                                    </p>
                                                    <div className="mt-1 whitespace-pre-wrap break-words rounded-md border border-slate-100 bg-white p-3 text-slate-800">
                                                        {supportInquiryDetail.body}
                                                    </div>
                                                </div>
                                                <div className="space-y-2 border-t border-slate-100 pt-3">
                                                    <Label
                                                        htmlFor="support-inquiry-reply"
                                                        className="text-xs font-medium text-slate-500"
                                                    >
                                                        관리자 답변
                                                        {supportInquiryDetail.repliedAt
                                                            ? ` (등록: ${supportInquiryDetail.repliedAt.slice(0, 10)})`
                                                            : ''}
                                                    </Label>
                                                    <Textarea
                                                        id="support-inquiry-reply"
                                                        className="min-h-[140px] resize-y text-sm"
                                                        placeholder="사용자에게 전달할 답변을 입력하세요."
                                                        value={
                                                            supportInquiryReplyDraft
                                                        }
                                                        onChange={(e) => {
                                                            setSupportInquiryReplyDraft(
                                                                e.target.value,
                                                            );
                                                            if (
                                                                supportInquiryReplyError
                                                            ) {
                                                                setSupportInquiryReplyError(
                                                                    '',
                                                                );
                                                            }
                                                        }}
                                                        disabled={
                                                            supportInquiryReplySaving
                                                        }
                                                    />
                                                    {supportInquiryReplyError ? (
                                                        <p className="text-xs text-red-600">
                                                            {
                                                                supportInquiryReplyError
                                                            }
                                                        </p>
                                                    ) : null}
                                                    <Button
                                                        type="button"
                                                        className="w-full sm:w-auto"
                                                        disabled={
                                                            supportInquiryReplySaving
                                                        }
                                                        onClick={async () => {
                                                            if (
                                                                !supportInquiryDetail
                                                            )
                                                                return;
                                                            const text =
                                                                supportInquiryReplyDraft.trim();
                                                            if (!text) {
                                                                setSupportInquiryReplyError(
                                                                    '답변 내용을 입력해주세요.',
                                                                );
                                                                return;
                                                            }
                                                            setSupportInquiryReplySaving(
                                                                true,
                                                            );
                                                            setSupportInquiryReplyError(
                                                                '',
                                                            );
                                                            try {
                                                                const data =
                                                                    await adminAPI.replySupportInquiry(
                                                                        supportInquiryDetail.id,
                                                                        {
                                                                            adminReply:
                                                                                text,
                                                                        },
                                                                    );
                                                                setSupportInquiryDetail(
                                                                    data.inquiry,
                                                                );
                                                                setSupportInquiries(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                r,
                                                                            ) =>
                                                                                r.id ===
                                                                                data
                                                                                    .inquiry
                                                                                    .id
                                                                                    ? {
                                                                                          ...r,
                                                                                          repliedAt:
                                                                                              data
                                                                                                  .inquiry
                                                                                                  .repliedAt,
                                                                                      }
                                                                                    : r,
                                                                        ),
                                                                );
                                                            } catch (err: unknown) {
                                                                setSupportInquiryReplyError(
                                                                    getErrorMessage(
                                                                        err,
                                                                        '답변 저장에 실패했습니다.',
                                                                    ),
                                                                );
                                                            } finally {
                                                                setSupportInquiryReplySaving(
                                                                    false,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {supportInquiryReplySaving
                                                            ? '저장 중…'
                                                            : supportInquiryDetail.repliedAt
                                                              ? '답변 수정'
                                                              : '답변 등록'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                </DialogContent>
                            </Dialog>
                        </>
                    ) : null}

                    {faqSectionTab === 'posts' ? (
                        <>
                            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    게시글 목록
                                </h2>
                                {supportPostsLoading ? (
                                    <p className="mt-4 text-sm text-slate-500">
                                        불러오는 중…
                                    </p>
                                ) : supportPosts.length === 0 ? (
                                    <p className="mt-4 text-sm text-slate-500">
                                        등록된 글이 없습니다.
                                    </p>
                                ) : (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full min-w-[600px] text-left text-sm">
                                            <thead>
                                                <tr className="border-b text-xs text-slate-500">
                                                    <th className="pb-2 pr-2">
                                                        유형
                                                    </th>
                                                    <th className="pb-2 pr-2">
                                                        중요
                                                    </th>
                                                    <th className="pb-2 pr-2">
                                                        제목
                                                    </th>
                                                    <th className="pb-2 pr-2">
                                                        글쓴이
                                                    </th>
                                                    <th className="pb-2 pr-2">
                                                        작성일
                                                    </th>
                                                    <th className="pb-2">관리</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {supportPosts.map((p) => (
                                                    <tr
                                                        key={p.id}
                                                        className="border-b border-slate-100"
                                                    >
                                                        <td className="whitespace-nowrap py-2 pr-2">
                                                            {p.kind === 'faq'
                                                                ? 'FAQ'
                                                                : '공지'}
                                                        </td>
                                                        <td className="py-2 pr-2">
                                                            {p.pinned ? (
                                                                <Flag
                                                                    className="h-3.5 w-3.5 text-amber-600"
                                                                    strokeWidth={2}
                                                                    aria-label="중요"
                                                                />
                                                            ) : (
                                                                <span className="text-slate-400">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="max-w-[220px] truncate py-2 pr-2">
                                                            {p.title}
                                                        </td>
                                                        <td className="whitespace-nowrap py-2 pr-2 text-slate-600">
                                                            {p.authorLabel}
                                                        </td>
                                                        <td className="whitespace-nowrap py-2 pr-2 text-slate-500">
                                                            {p.createdAt.slice(
                                                                0,
                                                                10,
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap py-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="h-9 border-slate-300 bg-white px-3 font-medium text-slate-800 hover:bg-slate-50"
                                                                onClick={() =>
                                                                    setEditPost(
                                                                        p,
                                                                    )
                                                                }
                                                            >
                                                                수정
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="h-9 border-red-200 bg-white px-3 font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onClick={async () => {
                                                                    if (
                                                                        !confirm(
                                                                            '이 글을 삭제할까요?',
                                                                        )
                                                                    )
                                                                        return;
                                                                    setError('');
                                                                    try {
                                                                        await adminAPI.deleteSupportPost(
                                                                            p.id,
                                                                        );
                                                                        const data =
                                                                            await adminAPI.getSupportPosts();
                                                                        setSupportPosts(
                                                                            data.posts ||
                                                                                [],
                                                                        );
                                                                    } catch (err: unknown) {
                                                                        setError(
                                                                            getErrorMessage(
                                                                                err,
                                                                                '삭제에 실패했습니다.',
                                                                            ),
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                삭제
                                                            </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                                    <Button
                                        type="button"
                                        className="h-9 min-w-[5.5rem] bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-black"
                                        onClick={() => {
                                            setError('');
                                            setNewPostKind('notice');
                                            setNewPostTitle('');
                                            setNewPostBody('');
                                            setNewPostPinned(false);
                                            setNewPostDialogOpen(true);
                                        }}
                                    >
                                        글쓰기
                                    </Button>
                                </div>
                            </div>

                            <Dialog
                                open={newPostDialogOpen}
                                onOpenChange={(open) => {
                                    setNewPostDialogOpen(open);
                                }}
                            >
                                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg md:translate-x-[7rem]">
                                    <DialogHeader>
                                        <DialogTitle>
                                            공지 / FAQ 등록
                                        </DialogTitle>
                                        <DialogDescription>
                                            승객·기사·업체 고객센터에 노출됩니다.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label>게시 유형</Label>
                                                <select
                                                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                                    value={newPostKind}
                                                    onChange={(e) =>
                                                        setNewPostKind(
                                                            e.target
                                                                .value as
                                                                | 'notice'
                                                                | 'faq',
                                                        )
                                                    }
                                                >
                                                    <option value="notice">
                                                        공지사항
                                                    </option>
                                                    <option value="faq">
                                                        자주 하는 질문
                                                    </option>
                                                </select>
                                            </div>
                                            <div className="flex items-end pb-1">
                                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-300"
                                                        checked={newPostPinned}
                                                        onChange={(e) =>
                                                            setNewPostPinned(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                    />
                                                    중요 표시 (목록에 깃발)
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="support-new-title">
                                                제목
                                            </Label>
                                            <Input
                                                id="support-new-title"
                                                className="mt-1"
                                                value={newPostTitle}
                                                onChange={(e) =>
                                                    setNewPostTitle(
                                                        e.target.value,
                                                    )
                                                }
                                                maxLength={200}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="support-new-body">
                                                본문
                                            </Label>
                                            <Textarea
                                                id="support-new-body"
                                                className="mt-1 min-h-[160px]"
                                                value={newPostBody}
                                                onChange={(e) =>
                                                    setNewPostBody(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            글쓴이는 현재 로그인한 관리자 계정의
                                            역할로 자동 저장됩니다.
                                        </p>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-9 border-slate-300"
                                                onClick={() =>
                                                    setNewPostDialogOpen(false)
                                                }
                                            >
                                                취소
                                            </Button>
                                            <Button
                                                type="button"
                                                disabled={creatingPost}
                                                className="h-9 min-w-[4.5rem] bg-slate-900 font-semibold text-white hover:bg-black"
                                                onClick={async () => {
                                                    setCreatingPost(true);
                                                    setError('');
                                                    try {
                                                        await adminAPI.createSupportPost(
                                                            {
                                                                kind: newPostKind,
                                                                title: newPostTitle.trim(),
                                                                body: newPostBody.trim(),
                                                                pinned: newPostPinned,
                                                            },
                                                        );
                                                        setNewPostTitle('');
                                                        setNewPostBody('');
                                                        setNewPostPinned(
                                                            false,
                                                        );
                                                        setNewPostDialogOpen(
                                                            false,
                                                        );
                                                        const data =
                                                            await adminAPI.getSupportPosts();
                                                        setSupportPosts(
                                                            data.posts || [],
                                                        );
                                                    } catch (err: unknown) {
                                                        setError(
                                                            getErrorMessage(
                                                                err,
                                                                '등록에 실패했습니다.',
                                                            ),
                                                        );
                                                    } finally {
                                                        setCreatingPost(false);
                                                    }
                                                }}
                                            >
                                                등록하기
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    ) : null}

                    <Dialog
                        open={Boolean(editPost)}
                        onOpenChange={(open) => {
                            if (!open) setEditPost(null);
                        }}
                    >
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg md:translate-x-[7rem]">
                            <DialogHeader>
                                <DialogTitle>게시글 수정</DialogTitle>
                                <DialogDescription>
                                    저장 시 앱 고객센터에 반영됩니다.
                                </DialogDescription>
                            </DialogHeader>
                            {editPost ? (
                                <div className="space-y-4 py-2">
                                    <div>
                                        <Label>게시 유형</Label>
                                        <select
                                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                            value={editKind}
                                            onChange={(e) =>
                                                setEditKind(
                                                    e.target.value as
                                                        | 'notice'
                                                        | 'faq',
                                                )
                                            }
                                        >
                                            <option value="notice">
                                                공지사항
                                            </option>
                                            <option value="faq">
                                                자주 하는 질문
                                            </option>
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded"
                                            checked={editPinned}
                                            onChange={(e) =>
                                                setEditPinned(e.target.checked)
                                            }
                                        />
                                        중요 표시
                                    </label>
                                    <div>
                                        <Label>제목</Label>
                                        <Input
                                            className="mt-1"
                                            value={editTitle}
                                            onChange={(e) =>
                                                setEditTitle(e.target.value)
                                            }
                                            maxLength={200}
                                        />
                                    </div>
                                    <div>
                                        <Label>본문</Label>
                                        <Textarea
                                            className="mt-1 min-h-[180px]"
                                            value={editBody}
                                            onChange={(e) =>
                                                setEditBody(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-9 border-slate-300"
                                            onClick={() => setEditPost(null)}
                                        >
                                            취소
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={savingEdit}
                                            className="h-9 min-w-[4.5rem] bg-slate-900 font-semibold text-white hover:bg-black"
                                            onClick={async () => {
                                                if (!editPost) return;
                                                setSavingEdit(true);
                                                setError('');
                                                try {
                                                    await adminAPI.updateSupportPost(
                                                        editPost.id,
                                                        {
                                                            kind: editKind,
                                                            title: editTitle.trim(),
                                                            body: editBody.trim(),
                                                            pinned: editPinned,
                                                        },
                                                    );
                                                    setEditPost(null);
                                                    const data =
                                                        await adminAPI.getSupportPosts();
                                                    setSupportPosts(
                                                        data.posts || [],
                                                    );
                                                } catch (err: unknown) {
                                                    setError(
                                                        getErrorMessage(
                                                            err,
                                                            '저장에 실패했습니다.',
                                                        ),
                                                    );
                                                } finally {
                                                    setSavingEdit(false);
                                                }
                                            }}
                                        >
                                            저장
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {activeTab === 'adminCreate' && adminRole === 'Super' && (
                <div className="rounded-lg border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">관리자 계정 생성</h2>
                    <p className="text-sm text-gray-600">
                        운영/고객지원/재무 관리자 계정을 생성합니다.
                    </p>
                    <div className="space-y-3">
                        <div>
                            <Label>이메일</Label>
                            <Input
                                value={adminForm.email}
                                onChange={(e) =>
                                    setAdminForm((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                                placeholder="admin2@example.com"
                            />
                        </div>
                        <div>
                            <Label>비밀번호</Label>
                            <Input
                                type="password"
                                value={adminForm.password}
                                onChange={(e) =>
                                    setAdminForm((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                    }))
                                }
                                placeholder="비밀번호"
                            />
                        </div>
                        <div>
                            <Label>관리자 역할</Label>
                            <select
                                className="border rounded px-2 py-1 w-full"
                                value={adminForm.adminRole}
                                onChange={(e) =>
                                    setAdminForm((prev) => ({
                                        ...prev,
                                        adminRole: e.target.value,
                                    }))
                                }
                            >
                                <option value="CustomerSupport">고객지원</option>
                                <option value="Operations">운영</option>
                                <option value="Finance">재무</option>
                            </select>
                        </div>
                        <Button onClick={handleCreateAdmin}>관리자 생성</Button>
                    </div>
                </div>
            )}
            </main>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI, authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface AdminUserDetail extends AdminUser {
    _count: {
        tripsAsPassenger: number;
        bids: number;
    };
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

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<OverviewResponse | null>(null);
    const [error, setError] = useState('');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
    const [selectedUserActivity, setSelectedUserActivity] =
        useState<AdminUserActivity | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [adminFormOpen, setAdminFormOpen] = useState(false);
    const [adminForm, setAdminForm] = useState({
        email: '',
        password: '',
        adminRole: 'CustomerSupport',
    });
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<
        'overview' | 'users' | 'revenue' | 'faq'
    >('overview');
    const [adminRole, setAdminRole] = useState<string | null>(null);

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
            } catch (err: any) {
                setError(err.message || 'Failed to load admin data');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [router]);

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

    const loadUserDetails = async (userId: string) => {
        setDetailLoading(true);
        try {
            const [detailData, activityData] = await Promise.all([
                adminAPI.getUserDetails(userId),
                adminAPI.getUserActivity(userId),
            ]);
            setSelectedUser(detailData.user);
            setSelectedUserActivity(activityData);
        } catch (err: any) {
            setError(err.message || 'Failed to load user details');
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
            setAdminFormOpen(false);
            await handleFilter();
        } catch (err: any) {
            setError(err.message || '관리자 생성에 실패했습니다.');
        }
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

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">관리자 대시보드</h1>
                <Button variant="outline" onClick={handleLogout}>
                    로그아웃
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant={activeTab === 'overview' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('overview')}
                >
                    요약
                </Button>
                <Button
                    variant={activeTab === 'users' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('users')}
                >
                    사용자
                </Button>
                {adminRole !== 'CustomerSupport' && (
                    <Button
                        variant={activeTab === 'revenue' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('revenue')}
                    >
                        매출 (예정)
                    </Button>
                )}
                <Button
                    variant={activeTab === 'faq' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('faq')}
                >
                    FAQ/문의
                </Button>
            </div>

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
                            <div className="space-y-3 text-sm text-gray-700">
                                {overview.recentTrips.map((trip) => (
                                    <div key={trip.id} className="rounded border p-3">
                                        <div className="font-medium">
                                            {trip.origin} → {trip.destination}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            승객: {trip.passenger.email}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg border p-4">
                            <h2 className="text-lg font-semibold mb-3">최근 입찰</h2>
                            <div className="space-y-3 text-sm text-gray-700">
                                {overview.recentBids.map((bid) => (
                                    <div key={bid.id} className="rounded border p-3">
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
                                        onClick={() => loadUserDetails(user.id)}
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
                                        생성한 여정:
                                    </span>{' '}
                                    {selectedUser._count.tripsAsPassenger}
                                </div>
                                <div>
                                    <span className="font-medium">입찰 수:</span>{' '}
                                    {selectedUser._count.bids}
                                </div>
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
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {adminRole === 'Super' && (
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                    관리자 계정 생성
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAdminFormOpen((prev) => !prev)}
                                >
                                    {adminFormOpen ? '닫기' : '열기'}
                                </Button>
                            </div>
                            {adminFormOpen && (
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
                                            <option value="CustomerSupport">
                                                고객지원
                                            </option>
                                            <option value="Operations">운영</option>
                                            <option value="Finance">재무</option>
                                        </select>
                                    </div>
                                    <Button onClick={handleCreateAdmin}>
                                        관리자 생성
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

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
                <div className="rounded-lg border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">FAQ / 1:1 문의 (예정)</h2>
                    <p className="text-sm text-gray-600">
                        FAQ 업데이트와 1:1 문의 응대를 위한 탭입니다. 문의 유형별
                        분류, 상태 추적, 답변 히스토리를 관리할 수 있습니다.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border p-4 text-sm text-gray-600">
                            FAQ 관리 (작성/수정/노출 순서)
                        </div>
                        <div className="rounded-lg border p-4 text-sm text-gray-600">
                            1:1 문의 처리 (대기/처리중/완료)
                        </div>
                    </div>
                    <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
                        문의 리스트/상세/답변 UI가 들어올 자리입니다.
                    </div>
                </div>
            )}
        </div>
    );
}

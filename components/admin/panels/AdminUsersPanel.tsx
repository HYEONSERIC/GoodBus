'use client';

import { useEffect } from 'react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import {
    formatBidStatusLabel,
    formatTripStatusLabel,
} from '@/lib/adminStatusLabels';
import { AdminFilterBar, AdminFilterField, ADMIN_SELECT_CLASS } from '@/components/admin/AdminFilterBar';
import { AdminActivitySectionFooter } from '@/components/admin/AdminActivitySectionFooter';
import { AdminDeepLink } from '@/components/admin/AdminDeepLink';
import { AdminLoadingSkeleton } from '@/components/admin/AdminLoadingSkeleton';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { formatManWon } from '@/lib/adminRevenueDisplay';
import { adminPersonLabel } from '@/lib/adminPersonLabel';

export function AdminUsersPanel() {
  const {
    users,
    selectedUser,
    passengerTripSummary,
    bidderStats,
    reviewSummary,
    selectedUserActivity,
    detailLoading,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    adminRole,
    activityTake,
    setActivityTake,
    setPreviewUrl,
    handleFilter,
    toggleUserStatus,
    loadUserDetails,
    openBidsForBidder,
    openBidsForTrip,
    handleActivityMore,
    uploadBaseUrl,
} = useAdminDashboard();

    const isBidderRole =
        selectedUser?.role === 'Driver' ||
        selectedUser?.role === 'BusCompany';

    const tripActivityTotal =
        selectedUser?.role === 'Passenger' && passengerTripSummary
            ? passengerTripSummary.totalGrouped
            : selectedUser?._count.tripsAsPassenger;

    useEffect(() => {
        if (!selectedUser || detailLoading) return;
        document
            .getElementById('admin-user-detail')
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [selectedUser?.id, detailLoading]);

  return (
<AdminPanelCard>
<AdminFilterBar>
                        <AdminFilterField label="역할">
                            <select
                                className={ADMIN_SELECT_CLASS}
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                            <option value="all">전체</option>
                            <option value="Passenger">승객</option>
                            <option value="Driver">기사</option>
                            <option value="BusCompany">버스회사</option>
                            <option value="Admin">관리자</option>
                            </select>
                        </AdminFilterField>
                        <AdminFilterField label="상태">
                            <select
                                className={ADMIN_SELECT_CLASS}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                            <option value="all">전체</option>
                            <option value="Active">활성</option>
                            <option value="Blocked">차단</option>
                            </select>
                        </AdminFilterField>
                        <AdminFilterField label="이메일">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            placeholder="이름·이메일·전화번호 검색"
                            />
                        </AdminFilterField>
                        <Button variant="outline" onClick={handleFilter}>
                        적용
                        </Button>
                    </AdminFilterBar>

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                                    <th className="py-2.5 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-slate-500">이메일</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">역할</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">상태</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">가입일</th>
                                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 text-center text-sm text-slate-500"
                                        >
                                            조건에 맞는 회원이 없습니다. 역할·상태 필터나 검색어를 조정해 보세요.
                                        </td>
                                    </tr>
                                ) : null}
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
                                        onClick={() => {
                                            setActivityTake(10);
                                            loadUserDetails(user.id, 10);
                                        }}
                                    >
                                        <td className="py-3 pr-4 pl-4 text-slate-900">{adminPersonLabel(user)}</td>
                                        <td className="py-3 pr-4 text-slate-600">{user.role}</td>
                                        <td className="py-3 pr-4">
                                            <AdminStatusBadge
                                                tone={
                                                    user.status === 'Active'
                                                        ? 'success'
                                                        : 'danger'
                                                }
                                            >
                                                {user.status}
                                            </AdminStatusBadge>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-500">
                                            {new Date(
                                                user.createdAt
                                            ).toLocaleDateString()}
                                        </td>
                                        <td
                                            className="py-3 pr-4"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                        {user.role === 'Admin' &&
                                        adminRole !== 'Super' ? (
                                            <span className="text-xs text-slate-500">
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

                    <div id="admin-user-detail" className="rounded-xl border border-slate-200 p-4">
                        <h3 className="text-lg font-semibold mb-2 text-slate-900">사용자 상세</h3>
                        {detailLoading ? (
                            <AdminLoadingSkeleton variant="detail" />
                        ) : null}
                        {!detailLoading && !selectedUser && (
                            <p className="text-sm text-slate-500">
                                사용자를 선택하면 상세가 표시됩니다.
                            </p>
                        )}
                        {selectedUser && (
                            <div className="space-y-2 text-sm">
                                {selectedUser.email ? (
                                    <div>
                                        <span className="font-medium">
                                            이메일:
                                        </span>{' '}
                                        {selectedUser.email}
                                    </div>
                                ) : (
                                    <div className="text-slate-500">
                                        전화번호 전용 가입 계정 (이메일 없음)
                                    </div>
                                )}
                                {(selectedUser.displayName ||
                                    selectedUser.companyName ||
                                    selectedUser.phoneNumber ||
                                    selectedUser.garageAddress ||
                                    selectedUser.busNumber ||
                                    selectedUser.busType ||
                                    selectedUser.busYear ||
                                    selectedUser.capacity !== null) && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="grid gap-1 text-xs text-slate-700">
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
                                        <p className="mt-1 text-xs text-slate-500">
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
                                        <span className="ml-1 text-xs text-slate-500">
                                            (취소·삭제 제외)
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium">입찰 수:</span>{' '}
                                    {selectedUser._count.bids}
                                    {isBidderRole && selectedUser._count.bids > 0 ? (
                                        <span className="ml-2">
                                            <AdminDeepLink
                                                onNavigate={() =>
                                                    openBidsForBidder({
                                                        bidderId: selectedUser.id,
                                                        email: selectedUser.email,
                                                    })
                                                }
                                            >
                                                입찰 탭에서 보기
                                            </AdminDeepLink>
                                        </span>
                                    ) : null}
                                </div>
                                {isBidderRole && bidderStats ? (
                                    <div className="rounded-md border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-sm">
                                        <span className="font-medium text-emerald-900">
                                            낙찰 {bidderStats.awardedCount}건
                                        </span>
                                        <span className="text-emerald-800">
                                            {' '}
                                            · 총 거래액{' '}
                                            {formatManWon(bidderStats.gmvManWon)}
                                        </span>
                                        {bidderStats.awardedCount > 0 ? (
                                            <span className="ml-2">
                                                <AdminDeepLink
                                                    onNavigate={() =>
                                                        openBidsForBidder({
                                                            bidderId:
                                                                selectedUser.id,
                                                            email: selectedUser.email,
                                                            bidStatus: 'awarded',
                                                        })
                                                    }
                                                >
                                                    낙찰 목록
                                                </AdminDeepLink>
                                            </span>
                                        ) : null}
                                    </div>
                                ) : null}
                                {reviewSummary && reviewSummary.count > 0 ? (
                                    <div className="text-sm text-slate-700">
                                        <span className="font-medium">
                                            {reviewSummary.as === 'received'
                                                ? '받은 리뷰'
                                                : '작성한 리뷰'}
                                            :
                                        </span>{' '}
                                        평균 {reviewSummary.avgRating ?? '-'}점
                                        · {reviewSummary.count}건
                                    </div>
                                ) : null}
                                {selectedUser.role === 'Driver' && (
                                    <div className="pt-2 space-y-2">
                                        <span className="font-medium">
                                            운전자격증
                                        </span>
                                        <p className="text-xs text-slate-500">
                                            상태: {selectedUser.driverLicenseStatus || '없음'}
                                        </p>
                                        {selectedUser.driverLicenseNote && (
                                            <p className="text-xs text-slate-500">
                                                사유: {selectedUser.driverLicenseNote}
                                            </p>
                                        )}
                                        {selectedUser.driverLicenseUrl ? (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                                    <button
                                                        type="button"
                                                        className="aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50"
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
                                                    className="text-sm text-sky-700 hover:underline"
                                                >
                                                    파일 다운로드
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500">
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
                                        <p className="text-xs text-slate-500">
                                            상태:{' '}
                                            {selectedUser.companyRegistrationStatus ||
                                                '없음'}
                                        </p>
                                        {selectedUser.companyRegistrationNote && (
                                            <p className="text-xs text-slate-500">
                                                사유: {selectedUser.companyRegistrationNote}
                                            </p>
                                        )}
                                        {selectedUser.companyRegistrationUrl ? (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                                    <button
                                                        type="button"
                                                        className="aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50"
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
                                                    className="text-sm text-sky-700 hover:underline"
                                                >
                                                    파일 다운로드
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500">
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
                                                    <p className="text-xs text-slate-500">
                                                        여정 기록이 없습니다.
                                                    </p>
                                                ) : (
                                                    selectedUserActivity.trips.map(
                                                        (trip) => (
                                                            <div
                                                                key={trip.id}
                                                                className="rounded-lg border border-slate-200 p-2 text-xs space-y-1"
                                                            >
                                                                <div>
                                                                    {trip.origin} →{' '}
                                                                    {trip.destination}{' '}
                                                                    (
                                                                    {formatTripStatusLabel(
                                                                        trip.status,
                                                                    )}
                                                                    )
                                                                </div>
                                                                <AdminDeepLink
                                                                    className="text-xs"
                                                                    onNavigate={() =>
                                                                        openBidsForTrip(
                                                                            trip.id,
                                                                        )
                                                                    }
                                                                >
                                                                    이 여정 입찰 보기
                                                                </AdminDeepLink>
                                                            </div>
                                                        )
                                                    )
                                                )}
                                            </div>
                                            <AdminActivitySectionFooter
                                                shownCount={
                                                    selectedUserActivity.trips
                                                        .length
                                                }
                                                totalCount={tripActivityTotal}
                                                activityTake={activityTake}
                                                onLoadMore={handleActivityMore}
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <span className="font-medium">
                                                최근 입찰
                                            </span>
                                            <div className="mt-2 space-y-2">
                                                {selectedUserActivity.bids.length ===
                                                0 ? (
                                                    <p className="text-xs text-slate-500">
                                                        입찰 기록이 없습니다.
                                                    </p>
                                                ) : (
                                                    selectedUserActivity.bids.map(
                                                        (bid) => (
                                                            <div
                                                                key={bid.id}
                                                                className="rounded-lg border border-slate-200 p-2 text-xs space-y-1"
                                                            >
                                                                <div>
                                                                    {bid.trip.origin} →{' '}
                                                                    {bid.trip.destination}{' '}
                                                                    /{' '}
                                                                    {formatManWon(
                                                                        Number(
                                                                            bid.price,
                                                                        ),
                                                                    )}{' '}
                                                                    (
                                                                    {formatBidStatusLabel(
                                                                        bid.status,
                                                                    )}
                                                                    ·{' '}
                                                                    {formatTripStatusLabel(
                                                                        bid.trip.status,
                                                                    )}
                                                                    )
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <AdminDeepLink
                                                                        className="text-xs"
                                                                        onNavigate={() =>
                                                                            openBidsForBidder(
                                                                                {
                                                                                    bidderId:
                                                                                        selectedUser.id,
                                                                                    email: selectedUser.email,
                                                                                    highlightBidId:
                                                                                        bid.id,
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        입찰 탭
                                                                    </AdminDeepLink>
                                                                    <AdminDeepLink
                                                                        className="text-xs"
                                                                        onNavigate={() =>
                                                                            openBidsForTrip(
                                                                                bid.trip.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        여정 입찰
                                                                    </AdminDeepLink>
                                                                </div>
                                                            </div>
                                                        )
                                                    )
                                                )}
                                            </div>
                                            <AdminActivitySectionFooter
                                                shownCount={
                                                    selectedUserActivity.bids
                                                        .length
                                                }
                                                totalCount={
                                                    selectedUser._count.bids
                                                }
                                                activityTake={activityTake}
                                                onLoadMore={handleActivityMore}
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <span className="font-medium">
                                                최근 리뷰
                                            </span>
                                            <div className="mt-2 space-y-2">
                                                {selectedUserActivity.reviews
                                                    .length === 0 ? (
                                                    <p className="text-xs text-slate-500">
                                                        리뷰 기록이 없습니다.
                                                    </p>
                                                ) : (
                                                    selectedUserActivity.reviews.map(
                                                        (review) => (
                                                            <div
                                                                key={review.id}
                                                                className="rounded-lg border border-slate-200 p-2 text-xs space-y-1"
                                                            >
                                                                <div>
                                                                    ★{review.rating}{' '}
                                                                    {review.trip.origin}{' '}
                                                                    →{' '}
                                                                    {
                                                                        review.trip
                                                                            .destination
                                                                    }
                                                                </div>
                                                                <div className="text-gray-500">
                                                                    상대:{' '}
                                                                    {
                                                                        review.counterpartyEmail
                                                                    }
                                                                </div>
                                                                {review.comment ? (
                                                                    <p className="text-gray-600 line-clamp-2">
                                                                        {
                                                                            review.comment
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                                <AdminDeepLink
                                                                    className="text-xs"
                                                                    onNavigate={() =>
                                                                        openBidsForTrip(
                                                                            review.trip.id,
                                                                        )
                                                                    }
                                                                >
                                                                    여정 입찰 보기
                                                                </AdminDeepLink>
                                                            </div>
                                                        ),
                                                    )
                                                )}
                                            </div>
                                            <AdminActivitySectionFooter
                                                shownCount={
                                                    selectedUserActivity.reviews
                                                        .length
                                                }
                                                totalCount={
                                                    reviewSummary?.count
                                                }
                                                activityTake={activityTake}
                                                onLoadMore={handleActivityMore}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
</AdminPanelCard>
  );
}

'use client';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';

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
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminFilterBar, AdminFilterField, ADMIN_SELECT_CLASS } from '@/components/admin/AdminFilterBar';

export function AdminUsersPanel() {
  const {
    users,
    selectedUser,
    passengerTripSummary,
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
    handleActivityMore,
    uploadBaseUrl,
} = useAdminDashboard();
  return (
<AdminPanelCard>
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
</AdminPanelCard>
  );
}

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
import { AdminAsyncContent } from '@/components/admin/AdminAsyncContent';
import {
    VERIFICATION_STATUS_FILTER_OPTIONS,
    formatVerificationStatusLabel,
} from '@/lib/adminStatusLabels';
import { verificationDisplayForUser } from '@/lib/adminVerification';

export function AdminVerificationPanel() {
  const {
    verificationType,
    setVerificationType,
    verificationStatus,
    setVerificationStatus,
    verificationList,
    verificationLoading,
    verificationReason,
    setVerificationReason,
    setPreviewUrl,
    loadVerifications,
    updateVerificationStatus,
    uploadBaseUrl,
} = useAdminDashboard();
  return (
<AdminPanelCard>
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
                                {VERIFICATION_STATUS_FILTER_OPTIONS.map(
                                    (opt) => (
                                        <option
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                        <Button variant="outline" onClick={loadVerifications}>
                            새로고침
                        </Button>
                    </div>

                    <AdminAsyncContent
                        loading={verificationLoading}
                        skeletonVariant="cards"
                        skeletonRows={4}
                        hasData={verificationList.length > 0}
                        empty={!verificationLoading && verificationList.length === 0}
                        emptyMessage="해당 상태의 요청이 없습니다."
                    >
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
                                                            {formatVerificationStatusLabel(
                                                                status,
                                                            )}
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
                    </AdminAsyncContent>
</AdminPanelCard>
  );
}

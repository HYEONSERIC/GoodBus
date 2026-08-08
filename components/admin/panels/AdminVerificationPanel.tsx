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
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import {
    VERIFICATION_STATUS_FILTER_OPTIONS,
    formatVerificationStatusLabel,
    verificationStatusTone,
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
<AdminFilterBar>
                        <AdminFilterField label="구분">
                            <select
                                className={ADMIN_SELECT_CLASS}
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
                        </AdminFilterField>
                        <AdminFilterField label="상태">
                            <select
                                className={ADMIN_SELECT_CLASS}
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
                        </AdminFilterField>
                        <Button variant="outline" onClick={loadVerifications}>
                            새로고침
                        </Button>
                    </AdminFilterBar>

                    <AdminAsyncContent
                        loading={verificationLoading}
                        skeletonVariant="cards"
                        skeletonRows={4}
                        hasData={verificationList.length > 0}
                        empty={!verificationLoading && verificationList.length === 0}
                        emptyMessage="선택한 구분·상태에 해당하는 승인 요청이 없습니다."
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
                                        className="rounded-xl border border-slate-200 p-4 space-y-4"
                                    >
                                        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-1.5 min-w-0">
                                                        <p className="break-all text-sm font-medium text-slate-900">
                                                            {user.email}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {roleLabel} ·{' '}
                                                            {docLabel}
                                                        </p>
                                                        <AdminStatusBadge tone={verificationStatusTone(status)}>
                                                            {formatVerificationStatusLabel(
                                                                status,
                                                            )}
                                                        </AdminStatusBadge>
                                                    </div>
                                                    <div className="flex shrink-0 gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-sky-700 hover:bg-sky-800"
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
                                                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
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
                                                        <p className="text-xs text-slate-500">
                                                            이전 사유: {note}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {imagePath ? (
                                                    <>
                                                        <div className="rounded-lg border border-slate-200 bg-white p-2">
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
                                                            <span className="text-slate-500">
                                                                클릭하면 확대됩니다.
                                                            </span>
                                                            <a
                                                                href={`/api/admin/verifications/${user.id}/download?type=${kind}`}
                                                                download
                                                                className="text-sky-700 hover:underline"
                                                            >
                                                                파일 다운로드
                                                            </a>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-slate-500">
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

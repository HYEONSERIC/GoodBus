'use client';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { Button } from '@/components/ui/button';
import { AdminPanelCard } from '@/components/admin/AdminPanelCard';
import { AdminAsyncContent } from '@/components/admin/AdminAsyncContent';
import type { AdminAuditLogRow } from '@/types/admin';

const ACTION_LABELS: Record<string, string> = {
    'user.status.update': '사용자 차단/해제',
    'verification.review': '서류 심사',
    'admin.create': '관리자 계정 생성',
    'supportPost.create': '공지/FAQ 작성',
    'supportPost.update': '공지/FAQ 수정',
    'supportPost.delete': '공지/FAQ 삭제',
    'supportInquiry.reply': '문의 답변',
};

function formatAction(action: string) {
    return ACTION_LABELS[action] ?? action;
}

function formatTarget(row: AdminAuditLogRow) {
    if (!row.targetType) return '-';
    return row.targetId ? `${row.targetType} · ${row.targetId}` : row.targetType;
}

function formatMetadata(metadata: AdminAuditLogRow['metadata']) {
    if (!metadata || Object.keys(metadata).length === 0) return '-';
    return Object.entries(metadata)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
}

export function AdminAuditLogPanel() {
    const {
        auditLogs,
        auditLogMeta,
        auditLogPage,
        auditLogLoading,
        auditLogError,
        loadAuditLog,
    } = useAdminDashboard();

    const totalPages = auditLogMeta
        ? Math.max(Math.ceil(auditLogMeta.total / auditLogMeta.pageSize), 1)
        : 1;

    return (
        <AdminPanelCard>
            <p className="text-sm text-slate-500">
                사용자 차단/해제, 서류 승인/반려, 서브관리자 생성, 공지·FAQ
                작성/수정/삭제, 문의 답변 행위를 기록합니다. 최근 순으로
                표시됩니다.
            </p>

            <AdminAsyncContent
                loading={auditLogLoading}
                error={auditLogError}
                onRetry={() => void loadAuditLog(auditLogPage)}
                skeletonVariant="table"
                skeletonRows={6}
                skeletonColumns={5}
                hasData={auditLogs.length > 0}
                empty={!auditLogLoading && auditLogs.length === 0}
                emptyMessage="기록된 감사 로그가 없습니다."
            >
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-left">
                                <th className="py-2.5 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    시각
                                </th>
                                <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    관리자
                                </th>
                                <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    행위
                                </th>
                                <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    대상
                                </th>
                                <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    메모
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                >
                                    <td className="py-3 pr-4 pl-4 whitespace-nowrap text-slate-500">
                                        {new Date(row.createdAt).toLocaleString()}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <p className="text-slate-900">
                                            {row.actor.email}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {row.actor.adminRole ?? '-'}
                                        </p>
                                    </td>
                                    <td className="py-3 pr-4 text-slate-700">
                                        {formatAction(row.action)}
                                    </td>
                                    <td className="py-3 pr-4 text-slate-600">
                                        {formatTarget(row)}
                                    </td>
                                    <td className="py-3 pr-4 text-xs text-slate-500">
                                        {formatMetadata(row.metadata)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span>
                        {auditLogPage} / {totalPages}
                        {auditLogMeta ? ` (전체 ${auditLogMeta.total}건)` : ''}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={auditLogPage <= 1}
                            onClick={() => void loadAuditLog(auditLogPage - 1)}
                        >
                            이전
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={auditLogPage >= totalPages}
                            onClick={() => void loadAuditLog(auditLogPage + 1)}
                        >
                            다음
                        </Button>
                    </div>
                </div>
            </AdminAsyncContent>
        </AdminPanelCard>
    );
}

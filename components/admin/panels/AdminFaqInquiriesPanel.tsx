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
import {
    AdminFilterBar,
    AdminFilterField,
    ADMIN_SELECT_CLASS,
} from '@/components/admin/AdminFilterBar';
import {
    INQUIRY_SORT_OPTIONS,
    INQUIRY_STATUS_FILTER_OPTIONS,
} from '@/components/admin/adminFaqConstants';
import { adminAPI } from '@/lib/api';
import { AdminAsyncContent } from '@/components/admin/AdminAsyncContent';
import { AdminActivitySectionFooter } from '@/components/admin/AdminActivitySectionFooter';
import { AdminLoadingSkeleton } from '@/components/admin/AdminLoadingSkeleton';
import { getErrorMessage } from '@/lib/errors';
import { adminPersonLabel } from '@/lib/adminPersonLabel';

const SUPPORT_INQUIRY_LIST_MAX = 500;

export function AdminFaqInquiriesPanel() {
    const {
        supportInquiries,
        supportInquiryMeta,
        supportInquiryTake,
        handleSupportInquiryLoadMore,
        supportInquiriesLoading,
        inquirySearch,
        setInquirySearch,
        inquiryStatusFilter,
        setInquiryStatusFilter,
        inquirySort,
        setInquirySort,
        loadSupportInquiries,
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
        setError,
        refreshOverview,
    } = useAdminDashboard();

    async function openInquiryDetail(id: string) {
        setSupportInquiryDetailOpen(true);
        setSupportInquiryDetail(null);
        setSupportInquiryDetailLoading(true);
        try {
            const data = await adminAPI.getSupportInquiry(id);
            setSupportInquiryDetail(data.inquiry);
        } catch (err: unknown) {
            setError(getErrorMessage(err, '문의를 불러오지 못했습니다.'));
            setSupportInquiryDetailOpen(false);
        } finally {
            setSupportInquiryDetailLoading(false);
        }
    }

    return (
        <>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        1:1 문의
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        답변 대기 건을 먼저 확인하고, 제목·작성자·내용으로
                        검색할 수 있습니다.
                    </p>
                </div>

                {supportInquiryMeta ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-100 bg-amber-50/90 px-4 py-3 text-sm">
                        <span className="font-semibold text-amber-950">
                            답변 대기{' '}
                            {supportInquiryMeta.unansweredTotal.toLocaleString(
                                'ko-KR',
                            )}
                            건
                        </span>
                        {inquirySearch.trim() ||
                        inquiryStatusFilter !== 'all' ? (
                            <span className="text-amber-900/90">
                                · 조회 결과{' '}
                                {supportInquiryMeta.totalMatching.toLocaleString(
                                    'ko-KR',
                                )}
                                건 (대기{' '}
                                {supportInquiryMeta.pendingInFilter.toLocaleString(
                                    'ko-KR',
                                )}
                                건)
                            </span>
                        ) : null}
                    </div>
                ) : null}

                <AdminFilterBar>
                    <AdminFilterField label="검색">
                        <Input
                            value={inquirySearch}
                            onChange={(e) => setInquirySearch(e.target.value)}
                            placeholder="제목·내용·이메일·이름·전화번호"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    void loadSupportInquiries({ take: 300 });
                                }
                            }}
                        />
                    </AdminFilterField>
                    <AdminFilterField label="상태">
                        <select
                            className={ADMIN_SELECT_CLASS}
                            value={inquiryStatusFilter}
                            onChange={(e) =>
                                setInquiryStatusFilter(
                                    e.target
                                        .value as typeof inquiryStatusFilter,
                                )
                            }
                        >
                            {INQUIRY_STATUS_FILTER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </AdminFilterField>
                    <AdminFilterField label="정렬">
                        <select
                            className={ADMIN_SELECT_CLASS}
                            value={inquirySort}
                            onChange={(e) =>
                                setInquirySort(
                                    e.target.value as typeof inquirySort,
                                )
                            }
                        >
                            {INQUIRY_SORT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </AdminFilterField>
                    <Button
                        variant="outline"
                        onClick={() => void loadSupportInquiries({ take: 300 })}
                    >
                        조회
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="text-slate-600"
                        onClick={() => {
                            setInquirySearch('');
                            setInquiryStatusFilter('pending');
                            setInquirySort('unanswered_first');
                            void loadSupportInquiries({
                                search: '',
                                status: 'pending',
                                sort: 'unanswered_first',
                                take: 300,
                            });
                        }}
                    >
                        미답변만
                    </Button>
                </AdminFilterBar>

                <AdminAsyncContent
                    loading={supportInquiriesLoading}
                    skeletonVariant="table"
                    skeletonRows={6}
                    skeletonColumns={5}
                    hasData={supportInquiries.length > 0}
                    empty={
                        !supportInquiriesLoading &&
                        supportInquiries.length === 0
                    }
                    emptyMessage="조건에 맞는 문의가 없습니다. 검색어나 상태 필터를 조정해 보세요."
                >
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <th className="py-2.5 pr-2 pl-4">제목</th>
                                    <th className="py-2.5 pr-2">유형</th>
                                    <th className="py-2.5 pr-2">작성자</th>
                                    <th className="py-2.5 pr-2">상태</th>
                                    <th className="py-2.5 pr-4">접수일</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supportInquiries.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-slate-100 last:border-0 ${
                                            !row.repliedAt
                                                ? 'bg-amber-50/40'
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <td className="max-w-[200px] py-2.5 pr-2 pl-4">
                                            <button
                                                type="button"
                                                className="w-full truncate text-left font-medium text-slate-900 underline-offset-2 hover:underline"
                                                onClick={() =>
                                                    void openInquiryDetail(
                                                        row.id,
                                                    )
                                                }
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
                                        <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">
                                            {row.createdAt.slice(0, 10)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <AdminActivitySectionFooter
                            shownCount={supportInquiries.length}
                            totalCount={supportInquiryMeta?.totalMatching}
                            activityTake={supportInquiryTake}
                            onLoadMore={handleSupportInquiryLoadMore}
                            max={SUPPORT_INQUIRY_LIST_MAX}
                            step={100}
                        />
                    </div>
                </AdminAsyncContent>
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
                <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-lg md:translate-x-[7rem]">
                    {supportInquiryDetailLoading && !supportInquiryDetail ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="sr-only">
                                    문의 상세
                                </DialogTitle>
                            </DialogHeader>
                            <AdminLoadingSkeleton variant="detail" />
                        </>
                    ) : supportInquiryDetail ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-left leading-snug">
                                    {supportInquiryDetail.title}
                                </DialogTitle>
                                <DialogDescription className="text-left text-slate-600">
                                    {supportInquiryDetail.categoryLabel} ·{' '}
                                    {supportInquiryDetail.createdAt.slice(0, 10)}
                                    {supportInquiryDetail.repliedAt
                                        ? ' · 답변 완료'
                                        : ' · 답변 대기'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                                <div className="rounded-md border border-slate-100 bg-slate-50/80 p-3 text-slate-700">
                                    <p className="text-xs font-medium text-slate-500">
                                        작성자
                                    </p>
                                    <p className="mt-0.5 break-all">
                                        {adminPersonLabel(
                                            supportInquiryDetail.user,
                                        )}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        역할: {supportInquiryDetail.user.role}
                                        {supportInquiryDetail.user.phoneNumber
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
                                        value={supportInquiryReplyDraft}
                                        onChange={(e) => {
                                            setSupportInquiryReplyDraft(
                                                e.target.value,
                                            );
                                            if (supportInquiryReplyError) {
                                                setSupportInquiryReplyError('');
                                            }
                                        }}
                                        disabled={supportInquiryReplySaving}
                                    />
                                    {supportInquiryReplyError ? (
                                        <p className="text-xs text-red-600">
                                            {supportInquiryReplyError}
                                        </p>
                                    ) : null}
                                    <Button
                                        type="button"
                                        className="w-full bg-sky-700 hover:bg-sky-800 sm:w-auto"
                                        disabled={supportInquiryReplySaving}
                                        onClick={async () => {
                                            if (!supportInquiryDetail) return;
                                            const text =
                                                supportInquiryReplyDraft.trim();
                                            if (!text) {
                                                setSupportInquiryReplyError(
                                                    '답변 내용을 입력해주세요.',
                                                );
                                                return;
                                            }
                                            setSupportInquiryReplySaving(true);
                                            setSupportInquiryReplyError('');
                                            try {
                                                const data =
                                                    await adminAPI.replySupportInquiry(
                                                        supportInquiryDetail.id,
                                                        { adminReply: text },
                                                    );
                                                setSupportInquiryDetail(
                                                    data.inquiry,
                                                );
                                                await loadSupportInquiries();
                                                await refreshOverview();
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
    );
}

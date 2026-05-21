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
import { Flag } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

export function AdminFaqInquiriesPanel() {
  const {
    supportInquiries,
    supportInquiriesLoading,
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
    setSupportInquiries,
    setError,
  } = useAdminDashboard();
  return (
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
  );
}

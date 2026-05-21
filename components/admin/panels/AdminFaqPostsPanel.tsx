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

export function AdminFaqPostsPanel() {
  const {
    supportPosts,
    supportPostsLoading,
    newPostDialogOpen,
    setNewPostDialogOpen,
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
    setSupportPosts,
    setError,
  } = useAdminDashboard();
  return (
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
</>
  );
}

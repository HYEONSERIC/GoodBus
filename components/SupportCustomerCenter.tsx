'use client';

import { useCallback, useEffect, useState } from 'react';
import { Flag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { supportAPI } from '@/lib/api';

export type SupportBoardTab = 'notice' | 'faq';

type ListPost = {
    id: string;
    kind: string;
    title: string;
    pinned: boolean;
    authorLabel: string;
    createdAt: string;
    listNo: number | null;
};

type DetailPost = {
    id: string;
    kind: string;
    title: string;
    body: string;
    pinned: boolean;
    authorLabel: string;
    createdAt: string;
};

function formatListDate(iso: string) {
    return iso.slice(0, 10);
}

export function SupportCustomerCenter({
    heading,
    showInquiry = true,
    onInquiryClick,
}: {
    heading: string;
    showInquiry?: boolean;
    onInquiryClick?: () => void;
}) {
    const [tab, setTab] = useState<SupportBoardTab>('notice');
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [posts, setPosts] = useState<ListPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState<DetailPost | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
        return () => clearTimeout(t);
    }, [query]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const data = await supportAPI.listPosts({
                kind: tab,
                q: debouncedQuery || undefined,
            });
            setPosts(data.posts || []);
        } catch (e) {
            setLoadError(
                e instanceof Error
                    ? e.message
                    : '목록을 불러오지 못했습니다.',
            );
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [tab, debouncedQuery]);

    useEffect(() => {
        load();
    }, [load]);

    async function openDetail(id: string) {
        setDetailOpen(true);
        setDetail(null);
        setDetailLoading(true);
        try {
            const data = await supportAPI.getPost(id);
            setDetail(data.post);
        } catch {
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    }

    const searchBlock = (
        <div className="relative w-full">
            <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목 검색"
                className="h-9 w-full pr-9 text-sm"
                aria-label="게시글 검색"
            />
            <Search
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                strokeWidth={2}
                aria-hidden
            />
        </div>
    );

    return (
        <div className="mx-auto w-full max-w-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <h2 className="border-b border-gray-200 py-4 text-center text-lg font-bold tracking-tight text-gray-900">
                {heading}
            </h2>
            <div className="grid grid-cols-2 border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => setTab('notice')}
                    className={`border-b-2 py-3 text-center text-sm transition-colors ${
                        tab === 'notice'
                            ? 'border-gray-900 font-semibold text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    공지사항
                </button>
                <button
                    type="button"
                    onClick={() => setTab('faq')}
                    className={`border-b-2 py-3 text-center text-sm transition-colors ${
                        tab === 'faq'
                            ? 'border-gray-900 font-semibold text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    자주 하는 질문
                </button>
            </div>

            <div className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.75rem] gap-x-1 border-b border-gray-200 px-2 py-2.5 text-[11px] font-medium text-gray-500 sm:grid-cols-[2.25rem_minmax(0,1fr)_5rem_5.25rem] sm:text-xs">
                <span className="text-center">No</span>
                <span>제목</span>
                <span className="text-right">글쓴이</span>
                <span className="text-right">작성일</span>
            </div>

            {loadError ? (
                <p className="px-3 py-4 text-center text-sm text-red-600">
                    {loadError}
                </p>
            ) : null}

            <ul className="divide-y divide-gray-100">
                {loading && posts.length === 0 ? (
                    <li className="px-3 py-8 text-center text-sm text-gray-500">
                        불러오는 중…
                    </li>
                ) : posts.length === 0 ? (
                    <li className="px-3 py-8 text-center text-sm text-gray-500">
                        {debouncedQuery
                            ? '검색 결과가 없습니다.'
                            : '등록된 글이 없습니다.'}
                    </li>
                ) : (
                    posts.map((row) => (
                        <li key={row.id}>
                            <button
                                type="button"
                                className="grid w-full grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.75rem] gap-x-1 px-2 py-2.5 text-left text-[11px] text-gray-800 transition-colors hover:bg-gray-50 sm:grid-cols-[2.25rem_minmax(0,1fr)_5rem_5.25rem] sm:text-xs"
                                onClick={() => void openDetail(row.id)}
                            >
                                <div className="flex justify-center">
                                    {row.pinned ? (
                                        <Flag
                                            className="h-3.5 w-3.5 text-amber-600"
                                            strokeWidth={2}
                                            aria-label="중요"
                                        />
                                    ) : (
                                        <span className="tabular-nums text-gray-600">
                                            {row.listNo ?? '—'}
                                        </span>
                                    )}
                                </div>
                                <span className="min-w-0 truncate font-medium text-gray-900">
                                    {row.title}
                                </span>
                                <span className="truncate text-right text-gray-600">
                                    {row.authorLabel}
                                </span>
                                <span className="truncate text-right text-gray-500">
                                    {formatListDate(row.createdAt)}
                                </span>
                            </button>
                        </li>
                    ))
                )}
            </ul>

            {showInquiry ? (
                <div className="space-y-3 border-t border-gray-200 p-3">
                    {searchBlock}
                    <div className="space-y-2">
                        <p className="text-center text-sm text-gray-600">
                            추가로 궁금하신 점이 있으신가요?
                        </p>
                        <Button
                            type="button"
                            className="h-10 w-full rounded-md bg-gray-900 text-sm font-semibold text-white hover:bg-black"
                            onClick={() => onInquiryClick?.()}
                        >
                            문의하기
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="border-t border-gray-200 p-3">{searchBlock}</div>
            )}

            <Dialog
                open={detailOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetailOpen(false);
                        setDetail(null);
                    }
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    {detail ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-left leading-snug">
                                    {detail.title}
                                </DialogTitle>
                                <DialogDescription className="text-left text-gray-600">
                                    {detail.authorLabel} ·{' '}
                                    {formatListDate(detail.createdAt)}
                                    {detail.pinned ? ' · 중요' : ''}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="whitespace-pre-wrap break-words text-sm text-gray-800">
                                {detail.body}
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="sr-only">
                                    게시글 상세
                                </DialogTitle>
                            </DialogHeader>
                            {detailLoading ? (
                                <p className="py-8 text-center text-sm text-gray-500">
                                    불러오는 중…
                                </p>
                            ) : null}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

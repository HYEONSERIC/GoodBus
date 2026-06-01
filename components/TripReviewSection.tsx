'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { reviewsAPI } from '@/lib/api';
import {
    formatOwnReviewHeadline,
    formatReviewHeadline,
} from '@/lib/reviewDisplay';
import { Camera, Star, X } from 'lucide-react';

const MAX_REVIEW_PHOTOS = 4;

export type TripReviewRecord = {
    id: string;
    tripId: string;
    rating: number;
    comment: string | null;
    imageUrls?: string[];
    createdAt: string;
    passenger?: {
        id: string;
        displayName: string | null;
        email: string;
    };
    trip?: {
        origin: string;
        destination: string;
        dateTime: string;
        servicePurpose?: string | null;
    };
};

function StarPicker({
    value,
    onChange,
    disabled,
}: {
    value: number;
    onChange: (n: number) => void;
    disabled?: boolean;
}) {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= (hover || value);
                return (
                    <button
                        key={n}
                        type="button"
                        disabled={disabled}
                        className="p-0.5 disabled:opacity-50"
                        onMouseEnter={() => !disabled && setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => onChange(n)}
                        aria-label={`${n}점`}
                    >
                        <Star
                            className={`h-8 w-8 ${
                                filled
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-none text-gray-300'
                            }`}
                            strokeWidth={1.5}
                        />
                    </button>
                );
            })}
        </div>
    );
}

function StarDisplay({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={`h-4 w-4 ${
                        n <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-none text-gray-300'
                    }`}
                    strokeWidth={1.5}
                />
            ))}
        </div>
    );
}

function ReviewPhotoGrid({
    urls,
    resolveImageUrl,
    variant = 'thumb',
}: {
    urls: string[];
    resolveImageUrl?: (url: string) => string;
    variant?: 'thumb' | 'card';
}) {
    const uniqueUrls = [...new Set(urls.filter(Boolean))];
    if (!uniqueUrls.length) return null;
    const resolve = resolveImageUrl ?? ((u) => u);
    if (variant === 'card') {
        const gridClass =
            uniqueUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
        return (
            <div className="border-t bg-gray-50 p-1">
                <div className={`grid gap-1 ${gridClass}`}>
                    {uniqueUrls.map((url, i) => (
                        <a
                            key={`${url}-${i}`}
                            href={resolve(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-sm bg-gray-100"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={resolve(url)}
                                alt={`리뷰 사진 ${i + 1}`}
                                className="aspect-[4/3] w-full object-cover"
                            />
                        </a>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="mt-2 flex flex-wrap gap-2">
            {uniqueUrls.map((url, i) => (
                <a
                    key={`${url}-${i}`}
                    href={resolve(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative h-16 w-16 overflow-hidden rounded-md border bg-gray-100"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={resolve(url)}
                        alt={`리뷰 사진 ${i + 1}`}
                        className="h-full w-full object-cover"
                    />
                </a>
            ))}
        </div>
    );
}

export function TripReviewSection({
    tripId,
    existing,
    servicePurpose,
    onSubmitted,
    resolveImageUrl,
}: {
    tripId: string;
    existing?: TripReviewRecord | null;
    servicePurpose?: string | null;
    onSubmitted?: () => void;
    resolveImageUrl?: (url: string) => string;
}) {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    function resetForm() {
        setRating(0);
        setComment('');
        setPhotoFiles([]);
        photoPreviews.forEach((p) => URL.revokeObjectURL(p));
        setPhotoPreviews([]);
        setError('');
    }

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (!next) {
            resetForm();
        }
    }

    function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(e.target.files ?? []);
        if (!picked.length) return;
        const remaining = MAX_REVIEW_PHOTOS - photoFiles.length;
        const toAdd = picked.slice(0, remaining);
        if (toAdd.length < picked.length) {
            setError(`사진은 최대 ${MAX_REVIEW_PHOTOS}장까지 등록할 수 있습니다.`);
        }
        setPhotoFiles((prev) => [...prev, ...toAdd]);
        setPhotoPreviews((prev) => [
            ...prev,
            ...toAdd.map((f) => URL.createObjectURL(f)),
        ]);
        e.target.value = '';
    }

    function removePhoto(index: number) {
        setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
        setPhotoPreviews((prev) => {
            const next = [...prev];
            const removed = next.splice(index, 1)[0];
            if (removed) URL.revokeObjectURL(removed);
            return next;
        });
    }

    async function handleSubmit() {
        if (rating < 1) {
            setError('별점을 선택해 주세요.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('tripId', tripId);
            formData.append('rating', String(rating));
            if (comment.trim()) {
                formData.append('comment', comment.trim());
            }
            photoFiles.forEach((file) => formData.append('photos', file));
            await reviewsAPI.create(formData);
            handleOpenChange(false);
            onSubmitted?.();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : '리뷰 등록에 실패했습니다.',
            );
        } finally {
            setSubmitting(false);
        }
    }

    const purposeForDisplay =
        existing?.trip?.servicePurpose ?? servicePurpose ?? null;

    if (existing) {
        return (
            <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-3">
                <p className="text-sm font-bold text-gray-900">
                    {formatOwnReviewHeadline(purposeForDisplay)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <StarDisplay rating={existing.rating} />
                    <span className="text-sm font-medium text-gray-700">
                        {existing.rating}.0
                    </span>
                </div>
                {existing.comment?.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                        {existing.comment}
                    </p>
                ) : (
                    <p className="mt-2 text-sm text-gray-500">
                        코멘트 없이 별점만 남기셨습니다.
                    </p>
                )}
                <ReviewPhotoGrid
                    urls={existing.imageUrls ?? []}
                    resolveImageUrl={resolveImageUrl}
                    variant="card"
                />
            </div>
        );
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-lg border-gray-300 bg-white text-sm font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => setOpen(true)}
            >
                리뷰 남기기
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader className="pr-8">
                        <DialogTitle>기사님 리뷰 남기기</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">
                        운행은 어떠셨나요? 별점과 후기를 남겨 주세요.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <StarPicker
                            value={rating}
                            onChange={setRating}
                            disabled={submitting}
                        />
                    </div>
                    <Textarea
                        className="mt-4 min-h-24 resize-none border-gray-200 text-sm"
                        placeholder="친절했어요, 시간을 잘 지켜주셨어요 등 (선택)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={submitting}
                    />

                    <div className="mt-4">
                        <p className="text-sm font-medium text-gray-900">
                            사진 (선택, 최대 {MAX_REVIEW_PHOTOS}장)
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePhotoSelect}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {photoPreviews.map((preview, i) => (
                                <div
                                    key={preview}
                                    className="relative h-20 w-20 overflow-hidden rounded-md border bg-gray-100"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={preview}
                                        alt={`미리보기 ${i + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                                        onClick={() => removePhoto(i)}
                                        aria-label="사진 삭제"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                            {photoFiles.length < MAX_REVIEW_PHOTOS ? (
                                <button
                                    type="button"
                                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={submitting}
                                >
                                    <Camera className="h-5 w-5" />
                                    <span className="text-[10px]">추가</span>
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {error ? (
                        <p className="mt-3 text-center text-xs text-red-600">
                            {error}
                        </p>
                    ) : null}

                    <Button
                        type="button"
                        className="mt-4 h-11 w-full rounded-lg bg-black text-sm font-semibold text-white hover:bg-black/90"
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {submitting ? '등록 중…' : '리뷰 등록하기'}
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function DriverReviewsList({
    reviews,
    resolveImageUrl,
    showRating,
}: {
    reviews: TripReviewRecord[];
    resolveImageUrl?: (url: string) => string;
    showRating?: boolean;
}) {
    if (reviews.length === 0) {
        return (
            <div className="rounded-lg border p-4 text-sm text-gray-600">
                아직 등록된 리뷰가 없습니다.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map((r) => (
                <article
                    key={r.id}
                    className="rounded-lg border border-gray-200 bg-white"
                >
                    <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-bold leading-snug text-gray-900">
                                    {formatReviewHeadline(
                                        r.passenger,
                                        r.trip?.servicePurpose,
                                    )}
                                </h3>
                                {showRating ? (
                                    <div className="mt-1 flex items-center gap-1">
                                        <StarDisplay rating={r.rating} />
                                        <span className="text-xs text-gray-500">
                                            {r.rating}.0
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                            <span className="shrink-0 text-xs text-gray-500">
                                {new Date(r.createdAt).toLocaleDateString(
                                    'ko-KR',
                                )}
                            </span>
                        </div>
                        {r.comment?.trim() ? (
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                                {r.comment}
                            </p>
                        ) : null}
                    </div>
                    {(r.imageUrls?.length ?? 0) > 0 ? (
                        <ReviewPhotoGrid
                            urls={r.imageUrls ?? []}
                            resolveImageUrl={resolveImageUrl}
                            variant="card"
                        />
                    ) : null}
                </article>
            ))}
        </div>
    );
}

/** 승객 입찰 목록·견적 상세용 (평균 점수 + 후기 건수) */
export function formatPassengerBidderRating(
    avgRating: number | null,
    count: number,
) {
    if (count === 0) {
        return '후기 없음';
    }
    const { stars, label } = formatDriverRatingStars(avgRating, count);
    return `${stars} ${label} · 후기 ${count}건`;
}

export function formatDriverRatingStars(avg: number | null, count: number) {
    if (avg == null || count === 0) {
        return { stars: '☆☆☆☆☆', label: '후기 없음' };
    }
    const rounded = Math.round(avg * 10) / 10;
    const full = Math.floor(avg);
    const half = avg - full >= 0.5 ? 1 : 0;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= full) stars += '★';
        else if (i === full + 1 && half) stars += '★';
        else stars += '☆';
    }
    return { stars, label: `(${rounded})` };
}

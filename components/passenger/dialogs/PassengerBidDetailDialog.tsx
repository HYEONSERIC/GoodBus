'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { bidderDisplayName, parseVehicleCountFromNote } from '@/lib/passengerQuoteBids';
import type { PassengerBidDetailState, BidderProfile } from '@/components/passenger/passengerDashboardTypes';

export function PassengerBidDetailDialog({
    open,
    bidDetail,
    onClose,
    bidGalleryIndex,
    setBidGalleryIndex,
    resolveMediaUrl,
    verificationLabel,
    onOpenChat,
    onAward,
}: {
    open: boolean;
    bidDetail: PassengerBidDetailState | null;
    onClose: () => void;
    bidGalleryIndex: number;
    setBidGalleryIndex: React.Dispatch<React.SetStateAction<number>>;
    resolveMediaUrl: (url?: string | null) => string | null;
    verificationLabel: (bidder: BidderProfile) => string;
    onOpenChat: () => void;
    onAward: () => void;
}) {
    if (!bidDetail) {
        return (
            <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="scrollbar-none max-h-[min(92vh,720px)] w-[calc(100vw-1.25rem)] max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg" />
            </Dialog>
        );
    }
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="scrollbar-none max-h-[min(92vh,720px)] w-[calc(100vw-1.25rem)] max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg">
                {(() => {
                                const { bid, bidTrip } = bidDetail!;
                                const bidder = bid.bidder;
                                const galleryUrls = (
                                    bidder.vehicleImageUrls || []
                                )
                                    .map((u) => resolveMediaUrl(u))
                                    .filter(Boolean) as string[];
                                const fallbackProfile = resolveMediaUrl(
                                    bidder.profileImageUrl,
                                );
                                const showImg =
                                    galleryUrls[bidGalleryIndex] ||
                                    fallbackProfile;
                                const imgCount = Math.max(
                                    galleryUrls.length,
                                    showImg ? 1 : 0,
                                );
                                const units = parseVehicleCountFromNote(
                                    bid.note,
                                );
                                const priceText = `${Number(
                                    bid.price,
                                ).toLocaleString()}만원${units ? ` (${units}대)` : ''}`;
                                return (
                                    <>
                                        <DialogHeader className="sr-only">
                                            <DialogTitle>
                                                견적 상세
                                            </DialogTitle>
                                            <DialogDescription>
                                                입찰자 프로필 및 제안 내용입니다.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="relative bg-gray-900">
                                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-200">
                                                {showImg ? (
                                                    <img
                                                        src={showImg}
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex size-full items-center justify-center text-sm text-gray-500">
                                                        등록된 차량 사진이 없습니다
                                                    </div>
                                                )}
                                                {imgCount > 1 && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-white"
                                                            onClick={() =>
                                                                setBidGalleryIndex(
                                                                    (i) =>
                                                                        (i -
                                                                            1 +
                                                                            imgCount) %
                                                                        imgCount,
                                                                )
                                                            }
                                                        >
                                                            ‹
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-white"
                                                            onClick={() =>
                                                                setBidGalleryIndex(
                                                                    (i) =>
                                                                        (i + 1) %
                                                                        imgCount,
                                                                )
                                                            }
                                                        >
                                                            ›
                                                        </button>
                                                        <span className="absolute bottom-3 right-3 rounded bg-black/55 px-2 py-0.5 text-xs text-white">
                                                            {bidGalleryIndex + 1} /{' '}
                                                            {imgCount}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="relative flex flex-col items-center border-b border-gray-200 bg-white pb-4 pt-10">
                                                <div className="absolute -top-9 left-1/2 size-20 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow">
                                                    {fallbackProfile ? (
                                                        <img
                                                            src={fallbackProfile}
                                                            alt=""
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-full items-center justify-center text-xs text-gray-400">
                                                            프로필
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-lg font-bold">
                                                    {bidderDisplayName(bidder)}
                                                </p>
                                                <p className="mt-1 text-sm text-amber-600">
                                                    ⭐ 준비중 (0.0)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-px border-b border-gray-200 bg-gray-100">
                                            <div className="bg-white p-3 text-center">
                                                <p className="text-[11px] text-gray-400">
                                                    차종
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-gray-900">
                                                    {bidder.busType?.trim() ||
                                                        '—'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 text-center">
                                                <p className="text-[11px] text-gray-400">
                                                    연식
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-gray-900">
                                                    {bidder.busYear?.trim()
                                                        ? `${bidder.busYear}년식`
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 text-center">
                                                <p className="text-[11px] text-gray-400">
                                                    서류
                                                </p>
                                                <p className="mt-1 text-xs font-medium text-gray-900">
                                                    {verificationLabel(bidder)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 p-4">
                                            {bidder.driverComment?.trim() && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-700">
                                                        기사님의 한마디
                                                    </p>
                                                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                                                        {bidder.driverComment}
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs font-semibold text-gray-700">
                                                    제안 견적
                                                </p>
                                                <p className="mt-1 text-xl font-bold tracking-tight">
                                                    {priceText}
                                                </p>
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    세금·수수료 포함 여부는 현장
                                                    협의 전제입니다.
                                                </p>
                                            </div>
                                            {bid.note?.trim() && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-700">
                                                        상세 제안
                                                    </p>
                                                    <p className="mt-1 whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                                                        {bid.note}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {((bidTrip.status === 'open' &&
                                            bid.status === 'open') ||
                                            (bidTrip.status === 'awarded' &&
                                                bid.status === 'awarded')) && (
                                                <div className="sticky bottom-0 flex gap-2 border-t border-gray-200 bg-white p-4">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className={`h-11 shrink-0 rounded-lg border-gray-300 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-100 ${
                                                            !(
                                                                bidTrip.status ===
                                                                    'open' &&
                                                                bid.status ===
                                                                    'open'
                                                            )
                                                                ? 'w-full'
                                                                : ''
                                                        }`}
                                                        onClick={() =>
                                                            onOpenChat()
                                                        }
                                                    >
                                                        채팅하기
                                                    </Button>
                                                    {bidTrip.status ===
                                                        'open' &&
                                                        bid.status ===
                                                            'open' && (
                                                            <Button
                                                                type="button"
                                                                className="h-11 min-w-0 flex-1 rounded-lg bg-[#ffcd00] text-sm font-semibold text-black hover:bg-[#f0c200]"
                                                                onClick={onAward}
                                                            >
                                                                이 견적으로
                                                                낙찰하기
                                                            </Button>
                                                        )}
                                                </div>
                                            )}
                                    </>
                                );
                })()}
            </DialogContent>
        </Dialog>
    );
}

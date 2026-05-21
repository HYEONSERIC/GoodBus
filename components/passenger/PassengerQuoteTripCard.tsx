'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PassengerTripRouteBadges } from '@/components/passenger/PassengerTripRouteBadges';
import {
    bidderDisplayName,
    parseVehicleCountFromNote,
    vehicleSpecLine,
    type OpenBidRow,
} from '@/lib/passengerQuoteBids';
import {
    formatTripDateLine,
    formatTripTime,
    getBusLabel,
    getServicePurposeLabel,
} from '@/lib/tripDisplay';
import type { PassengerBid, PassengerTrip } from '@/types/passenger';

export function PassengerQuoteTripCard({
    trip,
    partner,
    isRound,
    distance,
    expanded,
    quotesExpanded,
    cancelMenuOpen,
    openBidRows,
    openBidCount,
    awardedBid,
    onToggleDetail,
    onToggleCancelMenu,
    onOpenCancelDialog,
    onToggleQuotes,
    onSelectBid,
    resolveMediaUrl,
}: {
    trip: PassengerTrip;
    partner?: PassengerTrip;
    isRound: boolean;
    distance: number | null;
    expanded: boolean;
    quotesExpanded: boolean;
    cancelMenuOpen: boolean;
    openBidRows: OpenBidRow[];
    openBidCount: number;
    awardedBid?: PassengerBid;
    onToggleDetail: () => void;
    onToggleCancelMenu: () => void;
    onOpenCancelDialog: () => void;
    onToggleQuotes: () => void;
    onSelectBid: (bid: PassengerBid, bidTrip: PassengerTrip) => void;
    resolveMediaUrl: (url?: string | null) => string | null;
}) {
    return (
        <Card className="rounded-none border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                        <PassengerTripRouteBadges
                            isRound={isRound}
                            distanceKm={distance}
                        />
                    <CardTitle className="text-[16px] font-semibold leading-snug">
                        {trip.origin}
                    </CardTitle>
                    <CardTitle className="text-[16px] font-semibold leading-snug">
                        {
                            trip.destination
                        }
                    </CardTitle>
                </div>
                <div className="relative">
                    <button
                        type="button"
                        className="px-2 py-1 text-xl leading-none text-gray-500 hover:text-black"
                        onClick={onToggleCancelMenu}
                    >
                        ⋮
                    </button>
                    {cancelMenuOpen ? (
                        <div className="absolute right-0 top-9 z-20 min-w-[130px] rounded-md border bg-white p-1 shadow-lg">
                            <button
                                type="button"
                                className="w-full rounded px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                                onClick={onOpenCancelDialog}
                            >
                                주문 취소
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        출발
                    </span>
                    <span>
                        {formatTripDateLine(
                            trip.dateTime,
                        )}{' '}
                        {formatTripTime(
                            trip.dateTime,
                        )}{' '}
                        탑승
                    </span>
                </div>
                {isRound && partner && (
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            귀환
                        </span>
                        <span>
                            {formatTripDateLine(
                                partner.dateTime,
                            )}{' '}
                            {formatTripTime(
                                partner.dateTime,
                            )}{' '}
                            탑승
                        </span>
                    </div>
                )}
            </div>

            {expanded && (
                <div className="space-y-3 border-t pt-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded border px-2 py-1">
                            {isRound
                                ? '1박2일'
                                : '당일'}
                        </span>
                        <span className="rounded border px-2 py-1">
                            {trip.companionType ===
                            'with_schedule'
                                ? '일정 동행'
                                : '출발/귀환 운송만'}
                        </span>
                        <span className="rounded border px-2 py-1">
                            {trip.paxCount}명
                        </span>
                        <span className="rounded border px-2 py-1">
                            {getBusLabel(
                                trip.busSize,
                            )}
                        </span>
                        {getServicePurposeLabel(
                            trip.servicePurpose,
                        ) && (
                            <span className="rounded border px-2 py-1">
                                {
                                    getServicePurposeLabel(
                                        trip.servicePurpose,
                                    )!
                                }
                            </span>
                        )}
                        {trip.paymentMethod && (
                            <span className="rounded border px-2 py-1">
                                {trip.paymentMethod ===
                                'cash'
                                    ? '만나서 현금결제'
                                    : '카드결제'}
                            </span>
                        )}
                    </div>
                    <div className="rounded-md border border-sky-400 bg-sky-50/50 p-3">
                        <p className="mb-1 text-sm font-semibold text-gray-800">
                            경유지 및 세부사항
                        </p>
                        <p className="text-sm text-gray-700">
                            {trip.stopoverDetail?.trim() ||
                                '없음'}
                        </p>
                    </div>
                    {trip.additionalRequest && (
                        <div className="rounded-md border p-3">
                            <p className="mb-1 text-sm font-semibold text-gray-800">
                                추가 사항
                            </p>
                            <p className="text-sm text-gray-700">
                                {
                                    trip.additionalRequest
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}

            <button
                type="button"
                className="mx-auto block text-sm text-gray-500 hover:text-gray-800"
                onClick={onToggleDetail}
            >
                {expanded
                    ? '간단히 ▲'
                    : '자세히 ▼'}
            </button>

            <div className="border-t pt-4">
                {trip.status ===
                    'awarded' && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-center">
                        <p className="text-lg font-semibold text-green-800">
                            낙찰 완료
                        </p>
                        {awardedBid ? (
                            <p className="mt-1 text-sm font-medium text-green-900">
                                낙찰가{' '}
                                <span className="tabular-nums">
                                    {Number(
                                        awardedBid.price,
                                    ).toLocaleString()}
                                    만원
                                </span>
                            </p>
                        ) : null}
                    </div>
                )}
                {trip.status === 'open' &&
                    openBidCount === 0 && (
                        <div className="text-center">
                            <p className="text-xl font-semibold text-gray-800 sm:text-2xl">
                                견적을 받는
                                중입니다.
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                                기사님들이
                                견적을
                                올리면 확인할
                                수 있어요.
                            </p>
                        </div>
                    )}
                {trip.status === 'open' &&
                    openBidCount > 0 && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-base font-semibold text-gray-900">
                                        들어온
                                        입찰{' '}
                                        <span className="text-blue-600">
                                            {
                                                openBidCount
                                            }
                                        </span>
                                        건
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        최저
                                        제시가
                                        순으로
                                        표시합니다.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="shrink-0 rounded-lg border-gray-900 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                                    onClick={onToggleQuotes}
                                >
                                    견적
                                    보기
                                    {quotesExpanded
                                        ? ' ▲'
                                        : ' ▼'}
                                </Button>
                            </div>
                            {quotesExpanded && (
                                <div className="space-y-2">
                                    {openBidRows.map(
                                        ({
                                            bid,
                                            bidTrip,
                                            segment,
                                        }) => {
                                            const bidder =
                                                bid.bidder;
                                            const thumb =
                                                resolveMediaUrl(
                                                    bidder
                                                        .vehicleImageUrls?.[0],
                                                ) ||
                                                resolveMediaUrl(
                                                    bidder.profileImageUrl,
                                                );
                                            const units =
                                                parseVehicleCountFromNote(
                                                    bid.note,
                                                );
                                            const priceLine =
                                                Number.isFinite(
                                                    Number(
                                                        bid.price,
                                                    ),
                                                )
                                                    ? `${Number(
                                                          bid.price,
                                                      ).toLocaleString()}만원${units ? ` (${units}대)` : ''}`
                                                    : `${bid.price}만원`;
                                            return (
                                                <button
                                                    key={
                                                        bid.id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        onSelectBid(
                                                            bid,
                                                            bidTrip,
                                                        )
                                                    }
                                                    className="flex w-full items-stretch gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                                                >
                                                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                        {thumb ? (
                                                            <img
                                                                src={
                                                                    thumb
                                                                }
                                                                alt=""
                                                                className="size-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex size-full items-center justify-center text-xs text-gray-400">
                                                                사진
                                                                없음
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="truncate text-[15px] font-bold text-gray-900">
                                                                {bidderDisplayName(
                                                                    bidder,
                                                                )}
                                                            </p>
                                                            <p className="shrink-0 text-[15px] font-bold tabular-nums text-gray-900">
                                                                {
                                                                    priceLine
                                                                }
                                                            </p>
                                                        </div>
                                                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                                            {vehicleSpecLine(
                                                                bidder,
                                                            )}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                                            <span className="text-[11px] text-gray-400">
                                                                ⭐
                                                                준비중
                                                                · 후기
                                                                준비중
                                                            </span>
                                                            {segment && (
                                                                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                                                                    {
                                                                        segment
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            )}
                        </div>
                    )}
            </div>

            </CardContent>
        </Card>
    );
}

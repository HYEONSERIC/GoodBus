'use client';

import {
    formatBoardingLine,
    getBusLabel,
    getServicePurposeLabel,
    paymentMethodLabel,
} from '@/lib/tripDisplay';
import type { OpenTripBidTrip } from '@/types/openTripBid';

export function OpenTripBidTripSummarySection({
    trip,
    partner,
    tripRound,
    distanceKm,
    membershipLabel,
}: {
    trip: OpenTripBidTrip;
    partner?: OpenTripBidTrip;
    tripRound: boolean;
    distanceKm?: number | null;
    membershipLabel: string;
}) {
    return (
                    <div className="space-y-3 border-b border-gray-100 pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded px-2 py-0.5 text-xs font-semibold text-white ${
                                    tripRound
                                        ? 'bg-sky-600'
                                        : 'bg-gray-600'
                                }`}
                            >
                                {tripRound
                                    ? '왕복'
                                    : '편도'}
                            </span>
                            {typeof distanceKm ===
                                'number' && (
                                <span className="text-xs font-medium text-gray-500">
                                    {distanceKm}
                                    km
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-semibold leading-snug text-gray-900">
                            {trip.origin}
                        </p>
                        <p className="text-sm font-semibold leading-snug text-gray-900">
                            {trip.destination}
                        </p>
                        <div className="space-y-1 text-xs text-gray-700">
                            <p>
                                출발{' '}
                                {formatBoardingLine(
                                    trip.dateTime
                                )}
                            </p>
                            {partner && (
                                <p>
                                    귀환{' '}
                                    {formatBoardingLine(
                                        partner.dateTime
                                    )}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                                멤버십{' '}
                                {membershipLabel}
                            </span>
                            <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                당일 일정
                            </span>
                            <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                {trip.paxCount}
                                명
                            </span>
                            <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                {getBusLabel(
                                    trip.busSize
                                )}
                            </span>
                            {getServicePurposeLabel(
                                trip.servicePurpose
                            ) && (
                                <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                    {getServicePurposeLabel(
                                        trip.servicePurpose
                                    )}
                                </span>
                            )}
                            {paymentMethodLabel(
                                trip.paymentMethod
                            ) && (
                                <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                    {paymentMethodLabel(
                                        trip.paymentMethod
                                    )}
                                </span>
                            )}
                            {trip.paymentMethod ===
                                'card' && (
                                <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                    세금계산서·카드
                                </span>
                            )}
                            {trip.companionType ===
                                'with_schedule' && (
                                <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                    일정 동행
                                </span>
                            )}
                        </div>
                        <div className="rounded border border-sky-200 bg-sky-50/80 p-3">
                            <p className="text-xs font-semibold text-sky-900">
                                경유지 및 세부사항
                            </p>
                            <p className="mt-1 text-xs text-gray-700">
                                {trip.stopoverDetail?.trim() ||
                                    '없음'}
                            </p>
                            {trip.itineraryDetail?.trim() && (
                                <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                                    {trip.itineraryDetail}
                                </p>
                            )}
                        </div>
                    </div>


    );
}

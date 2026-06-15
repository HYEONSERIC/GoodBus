'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type BidQuoteTrip = {
    id: string;
    origin: string;
    destination: string;
    dateTime: string;
    paxCount: number;
    busSize: string;
    servicePurpose?: string | null;
    paymentMethod?: string | null;
    additionalRequest?: string | null;
    companionType?: string | null;
    itineraryDetail?: string | null;
    stopoverDetail?: string | null;
};

export type BidQuoteBid = {
    price: number;
    note?: string | null;
};

function parseVehicleCountFromNote(note?: string | null): number | null {
    if (!note) return null;
    const m = note.match(/×\s*(\d+)\s*대/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function parseBracketSection(note: string | null | undefined, title: string) {
    if (!note) return '';
    const tag = `[${title}]`;
    const idx = note.indexOf(tag);
    if (idx === -1) return '';
    let rest = note.slice(idx + tag.length).replace(/^\s*\n?/, '');
    const nextIdx = rest.search(/\n\n\[/);
    if (nextIdx === -1) return rest.trim();
    return rest.slice(0, nextIdx).trim();
}

function parseIncludedCosts(note?: string | null) {
    const base = {
        toll: false,
        parking: false,
        accommodation: false,
        meals: false,
    };
    if (!note) return base;
    const m = note.match(/\[포함 부대비용\]\s*(.+)/);
    if (!m) return base;
    const line = m[1].trim().split('\n')[0].trim();
    if (line === '없음') return base;
    const parts = line.split(/[·・]/).map((s) => s.trim());
    return {
        toll: parts.includes('통행료'),
        parking: parts.includes('주차료'),
        accommodation: parts.includes('숙박비'),
        meals: parts.includes('식사비'),
    };
}

function driverQuotePitch(note?: string | null) {
    const proactive = parseBracketSection(note, '먼저 말걸기');
    const customer = parseBracketSection(note, '고객님께 남기실 말씀');
    return [proactive, customer].filter(Boolean).join('\n\n').trim();
}

function formatTripBoardingSentence(dateTime: string) {
    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) return '';
    const dayPart = date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });
    const timePart = date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
    return `${dayPart} ${timePart} 탑승 후 출발`;
}

function paymentTag(method?: string | null) {
    if (method === 'cash') return '만나서 현금결제';
    if (method === 'card') return '카드결제';
    return null;
}

function CostRow({
    label,
    included,
}: {
    label: string;
    included: boolean;
}) {
    return (
        <div className="flex items-center justify-between rounded border border-sky-100 bg-sky-50/40 px-3 py-2.5 text-sm">
            <span className="text-gray-800">{label}</span>
            <span
                className={
                    included
                        ? 'font-medium text-blue-600'
                        : 'font-medium text-gray-500'
                }
            >
                {included ? '포함 ✓' : '미포함 ✕'}
            </span>
        </div>
    );
}

export type MyBidQuoteDetailRole = 'driver' | 'company';

export interface MyBidQuoteDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** 기사·회사 대시보드 구분(현재 UI 동일, 확장용) */
    role?: MyBidQuoteDetailRole;
    trip: BidQuoteTrip;
    partnerTrip?: BidQuoteTrip | null;
    km: number | null;
    myBid: BidQuoteBid;
    busPreferenceLabel: string;
    onChatWithPassenger: () => void | Promise<void>;
    onWithdrawBid: () => void | Promise<void>;
    onHome?: () => void;
    showWithdrawButton?: boolean;
}

export function MyBidQuoteDetailDialog({
    open,
    onOpenChange,
    role: _role,
    trip,
    partnerTrip,
    km,
    myBid,
    busPreferenceLabel,
    onChatWithPassenger,
    onWithdrawBid,
    onHome,
    showWithdrawButton = true,
}: MyBidQuoteDetailDialogProps) {
    const [pitchExpanded, setPitchExpanded] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        if (open) setPitchExpanded(false);
    }, [open, trip.id]);

    const note = myBid.note;
    const costs = parseIncludedCosts(note);
    const pitch = driverQuotePitch(note);
    const units = parseVehicleCountFromNote(note);
    const priceLabel = `${Number(myBid.price).toLocaleString()}만원${
        units ? `(${units}대)` : ''
    }`;

    const isRound = Boolean(partnerTrip);
    const passengerNote = trip.additionalRequest?.trim();
    const pitchLong = pitch.length > 160;

    const extraTags = [
        paymentTag(trip.paymentMethod),
        busPreferenceLabel,
        trip.stopoverDetail?.trim() || null,
    ].filter(Boolean) as string[];

    async function handleChat() {
        setChatLoading(true);
        try {
            await onChatWithPassenger();
        } finally {
            setChatLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="scrollbar-none max-h-[min(92vh,720px)] w-[calc(100vw-1.25rem)] max-w-lg gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-lg">
                <DialogHeader className="sr-only">
                    <DialogTitle>견적 상세</DialogTitle>
                    <DialogDescription>
                        내가 입찰한 여정의 견적 정보입니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="sticky top-0 z-10 flex items-center justify-center border-b border-gray-200 bg-white px-3 py-3">
                    <button
                        type="button"
                        className="absolute left-3 text-gray-600"
                        onClick={() => onOpenChange(false)}
                    >
                        ←
                    </button>
                    <span className="text-sm font-semibold">견적 상세</span>
                    {onHome ? (
                        <button
                            type="button"
                            className="absolute right-3 text-gray-600"
                            onClick={() => {
                                onHome();
                                onOpenChange(false);
                            }}
                        >
                            ⌂
                        </button>
                    ) : (
                        <span className="absolute right-3 w-6" aria-hidden />
                    )}
                </div>

                <div className="space-y-0 divide-y divide-gray-100">
                    <div className="bg-white px-4 py-4">
                        <div className="flex gap-3">
                            <div className="flex w-[4.25rem] shrink-0 flex-col items-center border-r border-gray-100 pr-3 text-center">
                                <span className="text-xs font-semibold text-gray-800">
                                    {isRound ? '왕복' : '편도'}
                                </span>
                                {km != null ? (
                                    <span className="mt-0.5 text-[11px] text-gray-500">
                                        {km}km
                                    </span>
                                ) : (
                                    <span className="mt-0.5 text-[11px] text-gray-400">
                                        —
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2 text-sm">
                                <p className="text-xs leading-relaxed text-gray-600">
                                    {formatTripBoardingSentence(trip.dateTime)}
                                </p>
                                <p className="font-medium leading-snug text-gray-900">
                                    {trip.origin}
                                </p>
                                <p className="font-medium leading-snug text-gray-900">
                                    {trip.destination}
                                </p>
                                {isRound && partnerTrip ? (
                                    <p className="text-xs text-gray-500">
                                        귀편 일정:{' '}
                                        {new Date(
                                            partnerTrip.dateTime
                                        ).toLocaleString('ko-KR', {
                                            month: 'long',
                                            day: 'numeric',
                                            weekday: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                        })}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-500">인원수</span>
                                <span className="font-medium text-gray-900">
                                    {trip.paxCount}명
                                </span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-500">목적</span>
                                <span className="text-right font-medium text-gray-900">
                                    {trip.servicePurpose?.trim() || '—'}
                                </span>
                            </div>
                            {trip.itineraryDetail?.trim() ? (
                                <div className="border-t border-gray-50 pt-2">
                                    <p className="text-xs text-gray-500">
                                        일정 상세
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                        {trip.itineraryDetail.trim()}
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        {extraTags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {extraTags.map((t) => (
                                    <span
                                        key={t}
                                        className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        ) : null}

                        <div className="mt-4">
                            <p className="text-xs font-medium text-gray-600">
                                남기신 말씀
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                                {passengerNote || '없음'}
                            </p>
                        </div>

                        <Button
                            type="button"
                            className="mt-4 h-11 w-full gap-2 rounded-md border-0 bg-amber-300 text-sm font-semibold text-gray-900 shadow-sm hover:bg-amber-400 disabled:opacity-70"
                            disabled={chatLoading}
                            onClick={() => void handleChat()}
                        >
                            <MessageCircle
                                className="h-4 w-4 shrink-0"
                                strokeWidth={2}
                                aria-hidden
                            />
                            승객과 대화
                        </Button>
                    </div>

                    <div className="bg-gray-50/80 px-4 py-4">
                        <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3">
                            <span className="text-sm text-gray-700">
                                가격 (부가세 미포함)
                            </span>
                            <span className="text-right text-base font-bold text-gray-900">
                                {priceLabel}
                            </span>
                        </div>
                        <p className="mb-2 mt-3 text-xs font-medium text-gray-600">
                            포함된 비용
                        </p>
                        <div className="space-y-2">
                            <CostRow label="통행료" included={costs.toll} />
                            <CostRow label="주차료" included={costs.parking} />
                            <CostRow
                                label="숙박비"
                                included={costs.accommodation}
                            />
                            <CostRow label="식사비" included={costs.meals} />
                            <CostRow label="부가세 10%" included={false} />
                        </div>

                        <div className="mt-4 rounded-md border border-gray-200 bg-white p-3">
                            <p className="text-xs font-medium text-gray-600">
                                기사님 한마디
                            </p>
                            <p
                                className={`mt-1 whitespace-pre-wrap text-sm text-gray-800 ${
                                    pitchLong && !pitchExpanded
                                        ? 'line-clamp-4'
                                        : ''
                                }`}
                            >
                                {pitch || '—'}
                            </p>
                            {pitchLong ? (
                                <button
                                    type="button"
                                    className="mt-2 flex items-center gap-0.5 text-xs text-blue-600"
                                    onClick={() =>
                                        setPitchExpanded(!pitchExpanded)
                                    }
                                >
                                    {pitchExpanded ? '접기' : '자세히 보기'}
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${
                                            pitchExpanded ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {showWithdrawButton ? (
                        <div className="bg-white px-4 py-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full rounded-md border-gray-300 text-sm font-medium text-gray-800"
                                onClick={() => void onWithdrawBid()}
                            >
                                입찰 취소
                            </Button>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

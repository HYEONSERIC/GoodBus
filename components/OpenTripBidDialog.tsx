'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type OpenTripBidTrip = {
    id: string;
    origin: string;
    destination: string;
    dateTime: string;
    paxCount: number;
    busSize: string;
    servicePurpose?: string | null;
    stopoverDetail?: string | null;
    companionType?: 'depart_return' | 'with_schedule' | null;
    itineraryDetail?: string | null;
    paymentMethod?: 'cash' | 'card' | null;
};

export type BidProfileForm = {
    busType: string;
    capacity: string;
    busYear: string;
};

type ExtendedBidForm = {
    priceManwon: string;
    vehicleCount: number;
    toll: boolean;
    parking: boolean;
    accommodation: boolean;
    meals: boolean;
    vehicleChoice: string;
    vehicleYear: string;
    customerMsg: string;
    proactiveMsg: string;
    addons: {
        water: boolean;
        dropoff: boolean;
        cleaning: boolean;
        escort: boolean;
    };
    addonOptOut: boolean;
};

function getServicePurposeLabel(purpose?: string | null) {
    if (!purpose) return null;
    if (purpose === 'MT/학교') return '학교 행사/MT';
    return purpose;
}

function getBusLabel(busSize: string) {
    if (busSize === 'large') return '대형버스 선호';
    if (busSize === 'medium') return '우등버스 선호';
    return '미니버스/밴 선호';
}

function formatBoardingLine(dateTime: string) {
    const d = new Date(dateTime);
    return `${d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    })} ${d.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })} 탑승`;
}

function paymentMethodLabel(pm?: string | null) {
    if (!pm) return null;
    if (pm === 'cash') return '만나서 현금결제';
    if (pm === 'card') return '카드 결제';
    return null;
}

function defaultExtendedBidForm(profileForm: BidProfileForm): ExtendedBidForm {
    const cap = profileForm.capacity ? `${profileForm.capacity}인승` : '';
    const typeLine =
        profileForm.busType && cap
            ? `${profileForm.busType} (${cap})`
            : profileForm.busType || cap || '프로필에서 차량 정보 등록';
    return {
        priceManwon: '',
        vehicleCount: 1,
        toll: true,
        parking: true,
        accommodation: false,
        meals: false,
        vehicleChoice: `내 차량 — ${typeLine}`,
        vehicleYear: profileForm.busYear || String(new Date().getFullYear()),
        customerMsg: '',
        proactiveMsg: '',
        addons: {
            water: false,
            dropoff: false,
            cleaning: false,
            escort: false,
        },
        addonOptOut: false,
    };
}

function assembleBidNote(
    extendedBid: ExtendedBidForm,
    pricePerVehicle: number,
    vehicleCount: number,
    photoCount: number,
) {
    const lines: string[] = [];
    lines.push(
        `[입찰가(부가세 별도)] 1대당 ${pricePerVehicle}만원 × ${vehicleCount}대`,
    );
    const inc: string[] = [];
    if (extendedBid.toll) inc.push('통행료');
    if (extendedBid.parking) inc.push('주차료');
    if (extendedBid.accommodation) inc.push('숙박비');
    if (extendedBid.meals) inc.push('식사비');
    lines.push(`[포함 부대비용] ${inc.length ? inc.join('·') : '없음'}`);
    lines.push(`[차종] ${extendedBid.vehicleChoice}`);
    lines.push(`[연식] ${extendedBid.vehicleYear}년`);
    if (extendedBid.customerMsg.trim()) {
        lines.push(`[고객님께 남기실 말씀]\n${extendedBid.customerMsg.trim()}`);
    }
    if (extendedBid.proactiveMsg.trim()) {
        lines.push(`[먼저 말걸기]\n${extendedBid.proactiveMsg.trim()}`);
    }
    if (extendedBid.addonOptOut) {
        lines.push('[부가 서비스] 수익 포기');
    } else {
        const addonNames: string[] = [];
        if (extendedBid.addons.water) addonNames.push('생수');
        if (extendedBid.addons.dropoff) addonNames.push('하차지 추가');
        if (extendedBid.addons.cleaning) addonNames.push('스마일 청소비');
        if (extendedBid.addons.escort) addonNames.push('하객 인솔 서비스');
        if (addonNames.length) {
            lines.push(`[부가 서비스] ${addonNames.join(', ')}`);
        }
    }
    if (photoCount > 0) {
        lines.push(
            `[추가 사진] ${photoCount}장 (채팅으로 상세 전달 예정)`,
        );
    }
    return lines.join('\n\n');
}

export function OpenTripBidDialog({
    open,
    onOpenChange,
    trip,
    partner,
    distanceKm,
    membershipLabel,
    profileForm,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: OpenTripBidTrip | null;
    partner?: OpenTripBidTrip;
    distanceKm?: number | null;
    membershipLabel: string;
    profileForm: BidProfileForm;
    onSubmit: (args: {
        tripId: string;
        totalManwon: number;
        note: string;
    }) => Promise<void>;
}) {
    type BidUiStep = 'fee' | 'form';
    const [uiStep, setUiStep] = useState<BidUiStep>('fee');
    const [extendedBid, setExtendedBid] = useState<ExtendedBidForm>(() =>
        defaultExtendedBidForm(profileForm),
    );
    const [bidPhotoFiles, setBidPhotoFiles] = useState<File[]>([]);
    const [bidPhotoUrls, setBidPhotoUrls] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const tripRound = Boolean(partner);

    useEffect(() => {
        if (open && trip) {
            setUiStep('fee');
            setExtendedBid(defaultExtendedBidForm(profileForm));
            setBidPhotoFiles([]);
        }
    }, [open, trip?.id, profileForm.busType, profileForm.capacity, profileForm.busYear]);

    useEffect(() => {
        const urls = bidPhotoFiles.map((f) => URL.createObjectURL(f));
        setBidPhotoUrls(urls);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [bidPhotoFiles]);

    function handleOpenChange(next: boolean) {
        if (!next) {
            setUiStep('fee');
            setBidPhotoFiles([]);
        }
        onOpenChange(next);
    }

    function onBidPhotosPicked(e: ChangeEvent<HTMLInputElement>) {
        const incoming = Array.from(e.target.files || []);
        if (incoming.length === 0) return;
        setBidPhotoFiles((prev) => [...prev, ...incoming].slice(0, 3));
        e.target.value = '';
    }

    function removeBidPhoto(slot: number) {
        setBidPhotoFiles((prev) => prev.filter((_, i) => i !== slot));
    }

    async function handleSubmit() {
        if (!trip) return;
        const raw = String(extendedBid.priceManwon).replace(/,/g, '').trim();
        const per = parseFloat(raw);
        if (!Number.isFinite(per) || per <= 0) {
            alert('입찰가(1대당)를 만원 단위로 입력해 주세요.');
            return;
        }
        const vehicleCount = Math.max(1, Math.floor(extendedBid.vehicleCount));
        const totalManwon = per * vehicleCount;
        if (!Number.isFinite(totalManwon) || totalManwon <= 0) {
            alert('합산 입찰가를 확인해 주세요.');
            return;
        }
        setSubmitting(true);
        try {
            const note = assembleBidNote(
                extendedBid,
                per,
                vehicleCount,
                bidPhotoFiles.length,
            );
            await onSubmit({ tripId: trip.id, totalManwon, note });
            handleOpenChange(false);
        } catch (e) {
            alert(
                e instanceof Error ? e.message : '입찰 생성에 실패했습니다',
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
<Dialog
    open={open}
    onOpenChange={handleOpenChange}
>
    <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,720px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-lg [&>button]:top-3"
    >
        {trip && uiStep === 'fee' && (
            <div className="flex flex-col items-stretch gap-4 px-5 py-8">
                <DialogHeader className="sr-only">
                    <DialogTitle>
                        광고 수수료 안내
                    </DialogTitle>
                    <DialogDescription>
                        확인 후 입찰 양식으로 이동합니다.
                    </DialogDescription>
                </DialogHeader>
                <p className="text-center text-base font-bold text-gray-900">
                    GOODBUS 광고 수수료 안내
                </p>
                <p className="text-center text-sm text-gray-800">
                    전세버스 주문 : 10%
                </p>
                <p className="text-center text-xs leading-relaxed text-gray-600">
                    기사님 사유로 인한 취소 시 수수료는
                    환불되지 않습니다.
                </p>
                <Button
                    type="button"
                    className="h-11 w-full rounded-md bg-[#e08030] font-semibold text-white hover:bg-[#d07526]"
                    onClick={() => setUiStep('form')}
                >
                    확인
                </Button>
            </div>
        )}

        {trip && uiStep === 'form' && (
            <>
                <DialogHeader className="sr-only">
                    <DialogTitle>입찰하기</DialogTitle>
                    <DialogDescription>
                        입찰가와 차량 정보를 입력합니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3">
                    <button
                        type="button"
                        className="min-w-[4rem] text-left text-sm text-gray-700 hover:text-black"
                        onClick={() =>
                            setUiStep('fee')
                        }
                    >
                        &lt; 이전
                    </button>
                    <span className="text-base font-semibold">
                        입찰하기
                    </span>
                    <span className="min-w-[4rem]" />
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
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

                    <div className="space-y-2 border-b border-gray-100 py-4">
                        <Label className="text-sm font-semibold">
                            입찰가 (부가세 제외)
                        </Label>
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="flex min-w-[140px] flex-1 items-center gap-1 border-b border-gray-300 pb-1">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="1대당 가격"
                                    className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                                    value={
                                        extendedBid.priceManwon
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                priceManwon:
                                                    e
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                />
                                <span className="text-sm text-gray-600">
                                    만원
                                </span>
                            </div>
                            <div className="flex items-center gap-1 rounded border border-gray-300 bg-white px-1">
                                <button
                                    type="button"
                                    className="h-8 w-8 text-lg leading-none text-gray-600 hover:bg-gray-100"
                                    onClick={() =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                vehicleCount:
                                                    Math.max(
                                                        1,
                                                        p.vehicleCount -
                                                            1
                                                    ),
                                            })
                                        )
                                    }
                                >
                                    −
                                </button>
                                <span className="min-w-[2.5rem] text-center text-sm font-medium">
                                    {extendedBid.vehicleCount}{' '}
                                    대
                                </span>
                                <button
                                    type="button"
                                    className="h-8 w-8 text-lg leading-none text-gray-600 hover:bg-gray-100"
                                    onClick={() =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                vehicleCount:
                                                    p.vehicleCount +
                                                    1,
                                            })
                                        )
                                    }
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <p className="text-xs leading-relaxed text-red-600">
                            ⚠ 1대당 가격 입력 후 인원에
                            맞춰 차량 대수를
                            조정하세요. 낙찰 시 부가
                            서비스 수익은 협의에 따라
                            달라질 수 있습니다.
                        </p>
                    </div>

                    <div className="grid gap-3 border-b border-gray-100 py-4 sm:grid-cols-2">
                        <div>
                            <Label className="text-xs text-gray-600">
                                차종
                            </Label>
                            <select
                                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm"
                                value={
                                    extendedBid.vehicleChoice
                                }
                                onChange={(e) =>
                                    setExtendedBid(
                                        (p) => ({
                                            ...p,
                                            vehicleChoice:
                                                e.target
                                                    .value,
                                        })
                                    )
                                }
                            >
                                {[
                                    ...new Set([
                                        defaultExtendedBidForm(profileForm)
                                            .vehicleChoice,
                                        '대형버스 (45인승)',
                                        '우등버스 (28~33인승)',
                                        '미니버스·밴 (12~15인승)',
                                    ]),
                                ].map((opt) => (
                                    <option
                                        key={opt}
                                        value={opt}
                                    >
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs text-gray-600">
                                연식
                            </Label>
                            <select
                                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm"
                                value={
                                    extendedBid.vehicleYear
                                }
                                onChange={(e) =>
                                    setExtendedBid(
                                        (p) => ({
                                            ...p,
                                            vehicleYear:
                                                e.target
                                                    .value,
                                        })
                                    )
                                }
                            >
                                {Array.from(
                                    { length: 14 },
                                    (_, i) => 2016 + i
                                ).map((y) => (
                                    <option
                                        key={y}
                                        value={String(y)}
                                    >
                                        {y}년
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2 border-b border-gray-100 py-4">
                        <p className="text-sm font-semibold">
                            포함된 부대비용
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.toll
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                toll: e
                                                    .target
                                                    .checked,
                                            })
                                        )
                                    }
                                />
                                통행료
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.parking
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                parking:
                                                    e
                                                        .target
                                                        .checked,
                                            })
                                        )
                                    }
                                />
                                주차료
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.accommodation
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                accommodation:
                                                    e
                                                        .target
                                                        .checked,
                                            })
                                        )
                                    }
                                />
                                숙박비
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.meals
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                meals: e
                                                    .target
                                                    .checked,
                                            })
                                        )
                                    }
                                />
                                식사비
                            </label>
                        </div>
                    </div>

                    <div className="rounded border border-red-200 bg-red-50/50 p-3 text-xs leading-relaxed text-red-800">
                        <ul className="list-disc space-y-1 pl-4">
                            <li>
                                낙찰 시 플랫폼
                                수수료(예: 10%)가
                                정산에서 차감될 수
                                있습니다. 잔액·정산
                                조건을 확인해 주세요.
                            </li>
                            <li>
                                약속되지 않은 비용(봉사료
                                등)을 별도 요구할 경우
                                서비스 이용이 제한될 수
                                있습니다.
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-2 py-4">
                        <Label className="text-sm font-semibold">
                            고객님께 남기실 말씀
                        </Label>
                        <Textarea
                            rows={3}
                            placeholder="차량 사진은 프로필에서 확인하실 수 있다는 안내 등"
                            value={
                                extendedBid.customerMsg
                            }
                            onChange={(e) =>
                                setExtendedBid((p) => ({
                                    ...p,
                                    customerMsg:
                                        e.target.value,
                                }))
                            }
                            className="resize-none text-sm"
                        />
                    </div>

                    <div className="space-y-2 border-t border-gray-100 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                먼저 말걸기로 낙찰률 ↑
                            </span>
                            <Label className="text-sm font-semibold">
                                고객님께 먼저 말걸기
                            </Label>
                        </div>
                        <Textarea
                            rows={2}
                            placeholder="입찰 직후 고객에게 전달되는 한 마디입니다."
                            value={
                                extendedBid.proactiveMsg
                            }
                            onChange={(e) =>
                                setExtendedBid((p) => ({
                                    ...p,
                                    proactiveMsg:
                                        e.target.value,
                                }))
                            }
                            className="resize-none text-sm"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            id="bid-photo-input"
                            onChange={onBidPhotosPicked}
                        />
                        <div className="flex gap-2">
                            {[0, 1, 2].map((slot) => (
                                <div
                                    key={slot}
                                    className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-gray-300 bg-gray-50"
                                >
                                    {bidPhotoUrls[
                                        slot
                                    ] ? (
                                        <>
                                            <img
                                                alt=""
                                                src={
                                                    bidPhotoUrls[
                                                        slot
                                                    ]
                                                }
                                                className="size-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-xs text-white"
                                                onClick={() =>
                                                    removeBidPhoto(
                                                        slot
                                                    )
                                                }
                                            >
                                                −
                                            </button>
                                        </>
                                    ) : (
                                        <label
                                            htmlFor="bid-photo-input"
                                            className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 text-[10px] text-gray-500"
                                        >
                                            <span>
                                                📷
                                            </span>
                                            추가
                                        </label>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-100 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                            판매할 부가 서비스 (낙찰률
                            향상)
                        </p>
                        <div className="rounded border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
                            <ul className="list-disc space-y-1 pl-4">
                                <li>
                                    예약 이후 추가
                                    구매에 따른 불이익은
                                    없습니다.
                                </li>
                                <li>
                                    부가 서비스 제공 시
                                    낙찰 가능성이
                                    높아집니다.
                                </li>
                                <li>
                                    실제 제공 후
                                    정산되는 구조입니다
                                    (운영 정책에 따름).
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-3">
                            {(
                                [
                                    {
                                        key: 'water',
                                        title: '생수',
                                        tag: '인기',
                                        price: '3만원~4만원',
                                        desc:
                                            '탑승 인원에 맞춘 생수 준비.',
                                    },
                                    {
                                        key: 'dropoff',
                                        title:
                                            '하차지 추가',
                                        tag: '추천',
                                        price: '5만원',
                                        desc:
                                            '복수 하차(거리 한도 내) 제안.',
                                    },
                                    {
                                        key: 'cleaning',
                                        title:
                                            '스마일 청소비',
                                        tag: '인기',
                                        price: '3만원',
                                        desc:
                                            '운행 후 정리·청결.',
                                    },
                                    {
                                        key: 'escort',
                                        title:
                                            '하객 인솔 서비스',
                                        tag: '프리미엄',
                                        price: '10만원',
                                        desc:
                                            '집결·안내 등 현장 인솔.',
                                    },
                                ] as const
                            ).map((row) => (
                                <label
                                    key={row.key}
                                    className="flex cursor-pointer gap-2 border-b border-gray-100 pb-3 last:border-0"
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-1 size-4 rounded border-gray-300"
                                        disabled={
                                            extendedBid.addonOptOut
                                        }
                                        checked={
                                            extendedBid
                                                .addons[
                                                row.key
                                            ]
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setExtendedBid(
                                                (
                                                    p
                                                ) => ({
                                                    ...p,
                                                    addons:
                                                        {
                                                            ...p.addons,
                                                            [row.key]:
                                                                e
                                                                    .target
                                                                    .checked,
                                                        },
                                                })
                                            )
                                        }
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <span className="text-sm font-medium">
                                                {
                                                    row.title
                                                }
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {
                                                    row.price
                                                }
                                            </span>
                                        </div>
                                        <span className="mt-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">
                                            {row.tag} ·
                                            다수 선택
                                            가능
                                        </span>
                                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                                            {row.desc}
                                        </p>
                                    </div>
                                </label>
                            ))}
                            <label className="flex cursor-pointer gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    className="mt-1 size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.addonOptOut
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                addonOptOut:
                                                    e
                                                        .target
                                                        .checked,
                                                addons: e
                                                    .target
                                                    .checked
                                                    ? {
                                                          water:
                                                              false,
                                                          dropoff:
                                                              false,
                                                          cleaning:
                                                              false,
                                                          escort:
                                                              false,
                                                      }
                                                    : p.addons,
                                            })
                                        )
                                    }
                                />
                                <span className="text-xs text-gray-700">
                                    부가 서비스 수익을
                                    포기하겠습니다
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                    <Button
                        type="button"
                        className="h-11 w-full rounded-md bg-[#e08030] text-sm font-semibold text-white hover:bg-[#d07526]"
                        disabled={submitting}
                        onClick={() => void handleSubmit()}
                    >
                        {submitting ? '등록 중…' : '입찰하기'}
                    </Button>
                </div>
                </div>
            </>
        )}
    </DialogContent>
</Dialog>
    );
}

'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { OpenTripBidFeeStep } from '@/components/openTripBid/OpenTripBidFeeStep';
import { OpenTripBidFormBody } from '@/components/openTripBid/OpenTripBidFormBody';
import { OpenTripBidTripSummarySection } from '@/components/openTripBid/OpenTripBidTripSummarySection';
import { OpenTripBidMinPricePanel } from '@/components/openTripBid/OpenTripBidMinPricePanel';
import { Button } from '@/components/ui/button';
import {
    assembleBidNote,
    defaultExtendedBidForm,
    type BidProfileForm,
    type ExtendedBidForm,
} from '@/lib/openTripBidForm';
import type { OpenTripBidTrip } from '@/types/openTripBid';

export type { OpenTripBidTrip, BidProfileForm };

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
    const [submitting, setSubmitting] = useState(false);

    const tripRound = Boolean(partner);

    useEffect(() => {
        if (open && trip) {
            setUiStep('fee');
            setExtendedBid(defaultExtendedBidForm(profileForm));
        }
    }, [open, trip?.id, profileForm.busType, profileForm.capacity, profileForm.busYear]);

    function handleOpenChange(next: boolean) {
        if (!next) {
            setUiStep('fee');
        }
        onOpenChange(next);
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
            const note = assembleBidNote(extendedBid, per, vehicleCount);
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton
                className="flex max-h-[min(90vh,720px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-lg [&>button]:top-3"
            >
                {trip && uiStep === 'fee' && (
                    <OpenTripBidFeeStep onConfirm={() => setUiStep('form')} />
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
                                onClick={() => setUiStep('fee')}
                            >
                                &lt; 이전
                            </button>
                            <span className="text-base font-semibold">
                                입찰하기
                            </span>
                            <span className="min-w-[4rem]" />
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="scrollbar-none min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-3 pb-4">
                                <OpenTripBidTripSummarySection
                                    trip={trip}
                                    partner={partner}
                                    tripRound={tripRound}
                                    distanceKm={distanceKm}
                                    membershipLabel={membershipLabel}
                                />
                                <div className="mt-3">
                                    <OpenTripBidMinPricePanel />
                                </div>
                                <OpenTripBidFormBody
                                    extendedBid={extendedBid}
                                    setExtendedBid={setExtendedBid}
                                    profileForm={profileForm}
                                />
                            </div>

                            <div className="flex shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                                <Button
                                    type="button"
                                    className="h-11 w-full rounded-md bg-[#2563eb] text-sm font-semibold text-white hover:bg-[#1d4ed8]"
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

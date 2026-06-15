'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
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
                            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
                                <OpenTripBidTripSummarySection
                                    trip={trip}
                                    partner={partner}
                                    tripRound={tripRound}
                                    distanceKm={distanceKm}
                                    membershipLabel={membershipLabel}
                                />
                                <OpenTripBidFormBody
                                    extendedBid={extendedBid}
                                    setExtendedBid={setExtendedBid}
                                    profileForm={profileForm}
                                    bidPhotoUrls={bidPhotoUrls}
                                    onBidPhotosPicked={onBidPhotosPicked}
                                    removeBidPhoto={removeBidPhoto}
                                />
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

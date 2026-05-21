'use client';

import { useRef, useState } from 'react';
import { tripsAPI } from '@/lib/api';
import type { KakaoPlace } from '@/components/passenger/passengerDashboardTypes';

export function toDatetimeLocalInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
}

export function usePassengerTripForm({ onCreated }: { onCreated: () => void }) {
    const [openDialog, setOpenDialog] = useState(false);
    const [newTrip, setNewTrip] = useState({
        origin: '',
        originX: null as number | null,
        originY: null as number | null,
        destination: '',
        destinationX: null as number | null,
        destinationY: null as number | null,
        tripType: 'oneway' as 'oneway' | 'round',
        goingDateTime: '',
        returnDateTime: '',
        stopoverDetail: '',
        companionType: 'depart_return' as 'depart_return' | 'with_schedule',
        itineraryDetail: '',
        servicePurpose: '',
        paymentMethod: 'cash' as 'cash' | 'card',
        additionalRequest: '',
        paxCount: '',
        busSize: 'small',
    });
    const [stopoverOpen, setStopoverOpen] = useState(false);
    const [companionInfoOpen, setCompanionInfoOpen] = useState(false);
    const [companionInfoConfirmed, setCompanionInfoConfirmed] = useState(false);
    const goingDateTimeRef = useRef<HTMLInputElement | null>(null);
    const returnDateTimeRef = useRef<HTMLInputElement | null>(null);
    const [kakaoStatusMessage, setKakaoStatusMessage] = useState('');
    const [originResults, setOriginResults] = useState<KakaoPlace[]>([]);
    const [destinationResults, setDestinationResults] = useState<KakaoPlace[]>(
        [],
    );

    const goingScheduleMin = toDatetimeLocalInputValue(new Date());
    const returnScheduleMin =
        newTrip.goingDateTime && newTrip.goingDateTime >= goingScheduleMin
            ? newTrip.goingDateTime
            : goingScheduleMin;

    function searchPlaces(
        query: string,
        setResults: (data: KakaoPlace[]) => void,
    ) {
        if (!query.trim()) {
            setResults([]);
            setKakaoStatusMessage('');
            return;
        }

        setKakaoStatusMessage('검색 중...');
        fetch(`/api/kakao/places?query=${encodeURIComponent(query)}`)
            .then(async (response) => {
                if (!response.ok) {
                    const data = await response.json().catch(() => null);
                    throw new Error(data?.error || 'Kakao API error');
                }
                return response.json();
            })
            .then((data) => {
                const places = (data.places || []) as KakaoPlace[];
                setResults(places);
                if (places.length === 0) {
                    setKakaoStatusMessage('검색 결과 없음');
                } else {
                    setKakaoStatusMessage(`${places.length}건 조회됨`);
                }
            })
            .catch(() => {
                setResults([]);
                setKakaoStatusMessage('검색 오류');
            });
    }

    async function createTrip() {
        try {
            if (
                !newTrip.origin.trim() ||
                !newTrip.destination.trim() ||
                (newTrip.tripType === 'oneway' && !newTrip.goingDateTime) ||
                (newTrip.tripType === 'round' &&
                    (!newTrip.goingDateTime || !newTrip.returnDateTime))
            ) {
                alert('출발지, 도착지, 날짜 및 시간을 입력해주세요');
                return;
            }

            if (
                newTrip.companionType === 'with_schedule' &&
                !newTrip.itineraryDetail.trim()
            ) {
                alert('일정 동행을 선택하신 경우 전체 일정을 입력해주세요.');
                return;
            }

            const paxCount = parseInt(
                String(newTrip.paxCount).replace(/\D/g, ''),
                10,
            );
            if (!Number.isFinite(paxCount) || paxCount < 1) {
                alert('승객 수를 입력해주세요.');
                return;
            }

            const goingAt = new Date(newTrip.goingDateTime);
            if (Number.isNaN(goingAt.getTime())) {
                alert('가는날 시간을 올바르게 입력해주세요.');
                return;
            }
            if (goingAt.getTime() < Date.now()) {
                alert(
                    '가는날 시간은 현재 시각 이후여야 합니다.\n다른 날짜·시간을 입력해 주세요.',
                );
                return;
            }
            if (newTrip.tripType === 'round') {
                const returnAt = new Date(newTrip.returnDateTime);
                if (Number.isNaN(returnAt.getTime())) {
                    alert('오는날 시간을 올바르게 입력해주세요.');
                    return;
                }
                if (returnAt.getTime() < goingAt.getTime()) {
                    alert(
                        '오는날 시간은 가는날 시간 이후여야 합니다.\n다른 날짜·시간을 입력해 주세요.',
                    );
                    return;
                }
            }

            const goingTripPayload = {
                origin: newTrip.origin,
                originX: newTrip.originX ?? undefined,
                originY: newTrip.originY ?? undefined,
                destination: newTrip.destination,
                destinationX: newTrip.destinationX ?? undefined,
                destinationY: newTrip.destinationY ?? undefined,
                dateTime: new Date(newTrip.goingDateTime).toISOString(),
                paxCount,
                busSize: newTrip.busSize,
                stopoverDetail: newTrip.stopoverDetail.trim() || undefined,
                companionType: newTrip.companionType,
                itineraryDetail:
                    newTrip.companionType === 'with_schedule'
                        ? newTrip.itineraryDetail.trim()
                        : undefined,
                servicePurpose: newTrip.servicePurpose || undefined,
                paymentMethod: newTrip.paymentMethod,
                additionalRequest:
                    newTrip.additionalRequest.trim() || undefined,
            };

            if (newTrip.tripType === 'oneway') {
                await tripsAPI.create(goingTripPayload);
            } else {
                await tripsAPI.create(goingTripPayload);
                await tripsAPI.create({
                    origin: newTrip.destination,
                    originX: newTrip.destinationX ?? undefined,
                    originY: newTrip.destinationY ?? undefined,
                    destination: newTrip.origin,
                    destinationX: newTrip.originX ?? undefined,
                    destinationY: newTrip.originY ?? undefined,
                    dateTime: new Date(newTrip.returnDateTime).toISOString(),
                    paxCount,
                    busSize: newTrip.busSize,
                    stopoverDetail: newTrip.stopoverDetail.trim() || undefined,
                    companionType: newTrip.companionType,
                    itineraryDetail:
                        newTrip.companionType === 'with_schedule'
                            ? newTrip.itineraryDetail.trim()
                            : undefined,
                    servicePurpose: newTrip.servicePurpose || undefined,
                    paymentMethod: newTrip.paymentMethod,
                    additionalRequest:
                        newTrip.additionalRequest.trim() || undefined,
                });
            }

            setOpenDialog(false);
            onCreated();
        } catch (error) {
            console.error('Error creating trip:', error);
            const message =
                error instanceof Error
                    ? error.message
                    : '알 수 없는 오류가 발생했습니다.';
            alert(`여정 생성에 실패했습니다: ${message}`);
        }
    }

    return {
        openDialog,
        setOpenDialog,
        newTrip,
        setNewTrip,
        stopoverOpen,
        setStopoverOpen,
        companionInfoOpen,
        setCompanionInfoOpen,
        companionInfoConfirmed,
        setCompanionInfoConfirmed,
        goingDateTimeRef,
        returnDateTimeRef,
        kakaoStatusMessage,
        originResults,
        setOriginResults,
        destinationResults,
        setDestinationResults,
        searchPlaces,
        createTrip,
        goingScheduleMin,
        returnScheduleMin,
    };
}

export type PassengerTripFormApi = ReturnType<typeof usePassengerTripForm>;

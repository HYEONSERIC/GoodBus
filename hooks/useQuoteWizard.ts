'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, tripsAPI } from '@/lib/api';
import { toDatetimeLocalInputValue } from '@/hooks/usePassengerTripForm';
import type { KakaoPlace } from '@/types/dashboard';

export const QUOTE_WIZARD_STEPS = [
    'customer',
    'route',
    'schedule',
    'headcount',
    'bus',
    'phone',
] as const;

export type QuoteWizardStep = (typeof QUOTE_WIZARD_STEPS)[number];

export type RequesterType = 'individual' | 'corporate' | 'agency';
export type BusSizeValue = 'large' | 'medium' | 'small';

// 체크박스로 "정확한 인원을 모릅니다"를 고르면 DB의 paxCount(양의 정수 필수)에
// 넣을 임시 추정치. 나중에 조율 가능하도록 한 곳에 모아둠.
const UNKNOWN_HEADCOUNT_ESTIMATE = 40;

const RESEND_COOLDOWN_SECONDS = 60;

function createInitialWizardState() {
    return {
        requesterType: 'individual' as RequesterType,
        servicePurpose: '',
        tripType: 'oneway' as 'oneway' | 'round',
        origin: '',
        originX: null as number | null,
        originY: null as number | null,
        destination: '',
        destinationX: null as number | null,
        destinationY: null as number | null,
        goingDateTime: '',
        returnDateTime: '',
        paxCount: '',
        paxUnknown: false,
        busSize: 'large' as BusSizeValue,
    };
}

export function useQuoteWizard() {
    const router = useRouter();
    const [stepIndex, setStepIndex] = useState(0);
    const [form, setForm] = useState(createInitialWizardState());
    const [kakaoStatusMessage, setKakaoStatusMessage] = useState('');
    const [originResults, setOriginResults] = useState<KakaoPlace[]>([]);
    const [destinationResults, setDestinationResults] = useState<
        KakaoPlace[]
    >([]);

    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneCode, setPhoneCode] = useState('');
    const [phoneOtpRequested, setPhoneOtpRequested] = useState(false);
    const [phoneRequestLoading, setPhoneRequestLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [phoneNotice, setPhoneNotice] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((seconds) => Math.max(0, seconds - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const step = QUOTE_WIZARD_STEPS[stepIndex];
    const goingScheduleMin = toDatetimeLocalInputValue(new Date());
    const returnScheduleMin =
        form.goingDateTime && form.goingDateTime >= goingScheduleMin
            ? form.goingDateTime
            : goingScheduleMin;

    function update(patch: Partial<ReturnType<typeof createInitialWizardState>>) {
        setForm((prev) => ({ ...prev, ...patch }));
    }

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
                setKakaoStatusMessage(
                    places.length === 0 ? '검색 결과 없음' : `${places.length}건 조회됨`,
                );
            })
            .catch(() => {
                setResults([]);
                setKakaoStatusMessage('검색 오류');
            });
    }

    function canProceed(): boolean {
        switch (step) {
            case 'customer':
                return form.servicePurpose.trim().length > 0;
            case 'route':
                return form.origin.trim().length > 0 && form.destination.trim().length > 0;
            case 'schedule': {
                // 네이티브 date picker의 min 속성은 참고용일 뿐 모든 브라우저/OS에서
                // 강제되지 않으므로(특히 모바일), 과거 날짜를 그대로 제출하면
                // GET /trips가 호출될 때마다 도는 expireExpiredOpenTripsForPassenger가
                // 생성 직후 바로 하드 삭제해버려 "견적이 사라짐" 처럼 보이는
                // 버그가 난다 — usePassengerTripForm.ts의 createTrip()과 동일하게
                // 여기서도 명시적으로 막는다.
                if (!form.goingDateTime) return false;
                const going = new Date(form.goingDateTime).getTime();
                if (Number.isNaN(going) || going < Date.now()) return false;
                if (form.tripType === 'oneway') return true;
                if (!form.returnDateTime) return false;
                const back = new Date(form.returnDateTime).getTime();
                return !Number.isNaN(back) && back >= going;
            }
            case 'headcount':
                if (form.paxUnknown) return true;
                return /^\d+$/.test(form.paxCount) && Number(form.paxCount) > 0;
            case 'bus':
                return Boolean(form.busSize);
            default:
                return true;
        }
    }

    function goNext() {
        if (!canProceed()) return;
        setStepIndex((i) => Math.min(i + 1, QUOTE_WIZARD_STEPS.length - 1));
    }

    function goBack() {
        setStepIndex((i) => Math.max(i - 1, 0));
    }

    async function requestOtp() {
        setError('');
        setPhoneNotice('');
        setPhoneRequestLoading(true);
        try {
            const result = await authAPI.requestPhoneOtp(
                phoneNumber,
                'signup',
                'passenger',
            );
            setPhoneOtpRequested(true);
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setPhoneNotice(
                result?.devMode
                    ? '개발 모드: 서버 콘솔에서 인증번호를 확인해주세요'
                    : '인증번호가 발송되었습니다',
            );
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : '인증번호 발송에 실패했습니다',
            );
        } finally {
            setPhoneRequestLoading(false);
        }
    }

    // OTP 검증 한 번으로 "계정 생성/로그인 + 견적 제출"을 끝낸다 — 콜버스처럼
    // 지금까지 로컬에만 쌓아둔 위저드 입력값을, signup 성공 직후(세션 쿠키가
    // 막 발급된 시점) tripsAPI.create로 그대로 제출한다. 왕복은 기존
    // usePassengerTripForm.ts와 같은 패턴으로 2번 호출.
    async function verifyAndSubmit() {
        setError('');
        setSubmitLoading(true);
        try {
            await authAPI.signup({
                role: 'Passenger',
                phoneNumber,
                phoneOtpCode: phoneCode,
            });

            const paxCount = form.paxUnknown
                ? UNKNOWN_HEADCOUNT_ESTIMATE
                : parseInt(form.paxCount, 10);

            const goingTripPayload = {
                origin: form.origin,
                originX: form.originX ?? undefined,
                originY: form.originY ?? undefined,
                destination: form.destination,
                destinationX: form.destinationX ?? undefined,
                destinationY: form.destinationY ?? undefined,
                dateTime: new Date(form.goingDateTime).toISOString(),
                paxCount,
                busSize: form.busSize,
                requesterType: form.requesterType,
                servicePurpose: form.servicePurpose,
            };

            if (form.tripType === 'oneway') {
                await tripsAPI.create(goingTripPayload);
            } else {
                await tripsAPI.create(goingTripPayload);
                await tripsAPI.create({
                    origin: form.destination,
                    originX: form.destinationX ?? undefined,
                    originY: form.destinationY ?? undefined,
                    destination: form.origin,
                    destinationX: form.originX ?? undefined,
                    destinationY: form.originY ?? undefined,
                    dateTime: new Date(form.returnDateTime).toISOString(),
                    paxCount,
                    busSize: form.busSize,
                    requesterType: form.requesterType,
                    servicePurpose: form.servicePurpose,
                });
            }

            router.push('/dashboard/passenger');
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : '제출에 실패했습니다. 다시 시도해주세요.',
            );
        } finally {
            setSubmitLoading(false);
        }
    }

    return {
        step,
        stepIndex,
        totalSteps: QUOTE_WIZARD_STEPS.length,
        goNext,
        goBack,
        canProceed: canProceed(),
        form,
        update,
        kakaoStatusMessage,
        originResults,
        setOriginResults,
        destinationResults,
        setDestinationResults,
        searchPlaces,
        goingScheduleMin,
        returnScheduleMin,
        phoneNumber,
        setPhoneNumber,
        phoneCode,
        setPhoneCode,
        phoneOtpRequested,
        phoneRequestLoading,
        submitLoading,
        phoneNotice,
        resendCooldown,
        setResendCooldown,
        error,
        requestOtp,
        verifyAndSubmit,
    };
}

export type QuoteWizardApi = ReturnType<typeof useQuoteWizard>;

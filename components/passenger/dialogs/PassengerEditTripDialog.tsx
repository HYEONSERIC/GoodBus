'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PassengerTrip } from '@/types/passenger';

const BUS_SIZE_OPTIONS = [
    { value: 'small', label: '미니버스/밴' },
    { value: 'medium', label: '우등버스' },
    { value: 'large', label: '대형버스' },
] as const;

const PAYMENT_METHOD_OPTIONS = [
    { value: 'cash', label: '만나서 현금결제' },
    { value: 'card', label: '카드 결제' },
] as const;

export type PassengerEditTripValues = {
    dateTime: string;
    paxCount: number;
    busSize: string;
    stopoverDetail: string;
    additionalRequest: string;
    paymentMethod: 'cash' | 'card';
};

function toDateTimeLocalValue(dateTime: string) {
    const d = new Date(dateTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
    )}:${pad(d.getMinutes())}`;
}

function initialValues(trip: PassengerTrip): PassengerEditTripValues {
    return {
        dateTime: toDateTimeLocalValue(trip.dateTime),
        paxCount: trip.paxCount,
        busSize: trip.busSize,
        stopoverDetail: trip.stopoverDetail ?? '',
        additionalRequest: trip.additionalRequest ?? '',
        paymentMethod: trip.paymentMethod ?? 'cash',
    };
}

/** trip이 바뀔 때마다 부모가 key={trip?.id}로 이 컴포넌트를 새로 마운트해 폼 상태를 초기화합니다. */
export function PassengerEditTripDialog({
    trip,
    submitting,
    onClose,
    onSubmit,
}: {
    trip: PassengerTrip | null;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (values: PassengerEditTripValues) => void;
}) {
    const [values, setValues] = useState<PassengerEditTripValues | null>(() =>
        trip ? initialValues(trip) : null,
    );

    if (!trip || !values) {
        return (
            <Dialog open={false} onOpenChange={() => {}}>
                <DialogContent />
            </Dialog>
        );
    }

    return (
        <Dialog
            open={Boolean(trip)}
            onOpenChange={(next) => {
                if (!next) onClose();
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        여정 수정
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        {trip.origin} → {trip.destination}
                        <p className="mt-0.5 text-xs text-gray-400">
                            출발지·도착지는 변경할 수 없습니다. 경로를
                            바꾸려면 여정을 취소하고 새로 등록해주세요.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-800">
                            탑승 일시
                        </label>
                        <input
                            type="datetime-local"
                            value={values.dateTime}
                            onChange={(e) =>
                                setValues({
                                    ...values,
                                    dateTime: e.target.value,
                                })
                            }
                            className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-800">
                            탑승 인원
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={values.paxCount}
                            onChange={(e) =>
                                setValues({
                                    ...values,
                                    paxCount: Number(e.target.value) || 1,
                                })
                            }
                            className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-800">
                            선호 차량
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {BUS_SIZE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() =>
                                        setValues({
                                            ...values,
                                            busSize: opt.value,
                                        })
                                    }
                                    className={`h-10 rounded-md border text-sm ${
                                        values.busSize === opt.value
                                            ? 'border-black bg-black text-white'
                                            : 'border-gray-300 text-gray-700'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-800">
                            결제 방법
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() =>
                                        setValues({
                                            ...values,
                                            paymentMethod: opt.value,
                                        })
                                    }
                                    className={`h-10 rounded-md border text-sm ${
                                        values.paymentMethod === opt.value
                                            ? 'border-black bg-black text-white'
                                            : 'border-gray-300 text-gray-700'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-800">
                            경유지 및 세부사항
                        </label>
                        <textarea
                            value={values.stopoverDetail}
                            onChange={(e) =>
                                setValues({
                                    ...values,
                                    stopoverDetail: e.target.value,
                                })
                            }
                            rows={2}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-800">
                            추가 요청사항
                        </label>
                        <textarea
                            value={values.additionalRequest}
                            onChange={(e) =>
                                setValues({
                                    ...values,
                                    additionalRequest: e.target.value,
                                })
                            }
                            rows={2}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <p className="text-xs text-gray-500">
                        수정하면 현재 들어온 입찰은 모두 취소되고, 기사님들이
                        새로 견적을 올릴 수 있게 됩니다.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        닫기
                    </Button>
                    <Button
                        type="button"
                        className="h-11 bg-black text-white hover:bg-black/90"
                        onClick={() => onSubmit(values)}
                        disabled={submitting}
                    >
                        {submitting ? '저장 중...' : '수정 완료'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

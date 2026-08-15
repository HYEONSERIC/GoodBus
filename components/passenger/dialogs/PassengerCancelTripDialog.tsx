'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export const PASSENGER_CANCEL_REASONS = [
    '일정 변경',
    '다른 전세버스 이용',
    '다른 교통수단 이용',
    '기타',
] as const;

// 백엔드 server/src/routes/trips.ts의 DRIVER_FAULT_CANCEL_REASON과 문구 동기화 유지
// — 이 사유로 취소하면 수수료가 환불되지 않음(그 외 사유는 자동 환불).
export const DRIVER_FAULT_CANCEL_REASON = '기사님 사유로 취소';

export function PassengerCancelTripDialog({
    open,
    cancelReason,
    onCancelReasonChange,
    onClose,
    onConfirm,
    isAwarded,
}: {
    open: boolean;
    cancelReason: string;
    onCancelReasonChange: (reason: string) => void;
    onClose: () => void;
    onConfirm: () => void;
    isAwarded?: boolean;
}) {
    const reasons = isAwarded
        ? [...PASSENGER_CANCEL_REASONS, DRIVER_FAULT_CANCEL_REASON]
        : PASSENGER_CANCEL_REASONS;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onClose();
            }}
        >
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-semibold">
                        취소 사유를 선택하세요
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    {reasons.map((reason) => (
                        <label
                            key={reason}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 hover:bg-gray-50"
                        >
                            <input
                                type="radio"
                                name="cancelReason"
                                value={reason}
                                checked={cancelReason === reason}
                                onChange={(e) =>
                                    onCancelReasonChange(e.target.value)
                                }
                                className="h-5 w-5"
                            />
                            <span className="text-base text-gray-700">
                                {reason}
                                {reason === DRIVER_FAULT_CANCEL_REASON && (
                                    <span className="ml-1 text-xs text-gray-400">
                                        (수수료 미환불)
                                    </span>
                                )}
                            </span>
                        </label>
                    ))}
                </div>
                <div className="grid grid-cols-2 overflow-hidden rounded-md border">
                    <button
                        type="button"
                        className="h-12 bg-gray-100 text-base text-gray-700"
                        onClick={onClose}
                    >
                        닫기
                    </button>
                    <button
                        type="button"
                        className="h-12 bg-yellow-400 text-base font-semibold text-gray-900"
                        onClick={onConfirm}
                    >
                        주문 취소
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

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

export function PassengerCancelTripDialog({
    open,
    cancelReason,
    onCancelReasonChange,
    onClose,
    onConfirm,
}: {
    open: boolean;
    cancelReason: string;
    onCancelReasonChange: (reason: string) => void;
    onClose: () => void;
    onConfirm: () => void;
}) {
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
                    {PASSENGER_CANCEL_REASONS.map((reason) => (
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

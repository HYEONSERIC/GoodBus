'use client';

import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function OpenTripBidFeeStep({ onConfirm }: { onConfirm: () => void }) {
    return (
        <div className="flex flex-col items-stretch gap-4 px-5 py-8">
            <DialogHeader className="sr-only">
                <DialogTitle>광고 수수료 안내</DialogTitle>
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
                기사님 사유로 인한 취소 시 수수료는 환불되지 않습니다.
            </p>
            <Button
                type="button"
                className="h-11 w-full rounded-md bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]"
                onClick={onConfirm}
            >
                확인
            </Button>
        </div>
    );
}

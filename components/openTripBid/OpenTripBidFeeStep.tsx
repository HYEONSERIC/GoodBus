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
                버스대절 광고 수수료 안내
            </p>
            <p className="text-center text-sm text-gray-800">
                전세버스 주문 : 10%
            </p>
            <p className="text-center text-xs leading-relaxed text-gray-600">
                기사님 사유로 인한 취소 시 수수료는 환불되지 않습니다.
            </p>
            <div className="mt-1 border-t border-gray-200 pt-4">
                <p className="text-center text-sm font-bold text-gray-900">
                    버스 이용대금 결제 안내
                </p>
                <div className="mt-2 space-y-1 text-center text-xs leading-relaxed text-gray-700">
                    <p>버스 이용대금은 버스대절 주식회사가 수납하지 않습니다.</p>
                    <p>
                        고객은 배차가 확정된 버스업체 또는 버스기사에게 버스
                        이용대금을 직접 지급합니다.
                    </p>
                    <p>
                        버스대절 주식회사는 고객에게 버스 이용대금에 대한
                        현금입금·계좌이체를 요구하지 않습니다.
                    </p>
                    <p>
                        당사는 버스업체/버스기사에게 중개서비스 이용에 따른
                        수수료를 별도로 정산받습니다.
                    </p>
                </div>
            </div>
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

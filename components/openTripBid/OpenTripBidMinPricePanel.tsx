'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { bidsAPI, paymentsAPI } from '@/lib/api';
import { MIN_BID_ADDON_PRICE_WON } from '@/lib/paymentPricing';

type MinByVehicleType = {
    small: number | null;
    medium: number | null;
    large: number | null;
};

type MinByVehicleTypeResponse = {
    purchased: boolean;
    minByVehicleType?: MinByVehicleType;
};

const VEHICLE_TYPE_LABELS: Record<keyof MinByVehicleType, string> = {
    small: '미니버스/밴',
    medium: '우등버스',
    large: '대형버스',
};

export function OpenTripBidMinPricePanel() {
    const [data, setData] = useState<MinByVehicleTypeResponse | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        bidsAPI
            .getMinByVehicleType()
            .then((res: MinByVehicleTypeResponse) => {
                if (!cancelled) setData(res);
            })
            .catch(() => {
                if (!cancelled) setData({ purchased: false });
            });
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSubscribe() {
        setBusy(true);
        try {
            await paymentsAPI.subscribeMinBidAddon();
            alert('구독이 완료되었습니다.');
            window.location.reload();
        } catch (e) {
            alert(
                e instanceof Error
                    ? e.message
                    : '구독에 실패했습니다. 카드가 등록되어 있는지 확인해주세요.',
            );
        } finally {
            setBusy(false);
        }
    }

    if (!data) return null;

    return (
        <div className="rounded border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-xs font-semibold text-amber-900">
                차량별 최저 입찰금액 확인
            </p>
            {data.purchased && data.minByVehicleType ? (
                <ul className="mt-2 space-y-1 text-xs text-gray-700">
                    {(Object.keys(VEHICLE_TYPE_LABELS) as Array<
                        keyof MinByVehicleType
                    >).map((vehicleType) => (
                        <li key={vehicleType}>
                            {VEHICLE_TYPE_LABELS[vehicleType]}{' '}
                            {data.minByVehicleType![vehicleType] !== null
                                ? `${data.minByVehicleType![vehicleType]}만원~`
                                : '데이터 없음'}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="mt-2 space-y-2">
                    <p className="text-xs text-gray-600">
                        {MIN_BID_ADDON_PRICE_WON.toLocaleString()}원/월 구독 시
                        차량별 최근 낙찰 최저금액을 확인할 수 있습니다.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full text-xs"
                        disabled={busy}
                        onClick={() => void handleSubscribe()}
                    >
                        {busy ? '처리 중…' : '구독하기'}
                    </Button>
                </div>
            )}
        </div>
    );
}

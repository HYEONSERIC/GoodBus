'use client';

import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { paymentsAPI } from '@/lib/api';
import { getTossPaymentInstance } from '@/lib/toss';

type BillingKeyStatus = {
    registered: boolean;
    cardBrand?: string | null;
    cardLast4?: string | null;
};

export function PaymentCardsPanel({ userId }: { userId?: string }) {
    const [status, setStatus] = useState<BillingKeyStatus | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!userId) return;
        paymentsAPI
            .getBillingKeyStatus()
            .then((res: BillingKeyStatus) => setStatus(res))
            .catch(() => setStatus({ registered: false }));
    }, [userId]);

    async function handleRegisterCard() {
        if (!userId) return;
        setBusy(true);
        try {
            const payment = await getTossPaymentInstance(userId);
            await payment.requestBillingAuth({
                method: 'CARD',
                successUrl: `${window.location.origin}/payments/billing-key/callback`,
                failUrl: `${window.location.origin}/payments/billing-key/callback`,
            });
        } catch (e) {
            alert(e instanceof Error ? e.message : '카드 등록에 실패했습니다.');
            setBusy(false);
        }
    }

    async function handleDelete() {
        if (!confirm('이 카드를 삭제하시겠습니까?')) return;
        setBusy(true);
        try {
            await paymentsAPI.deleteBillingKey();
            setStatus({ registered: false });
        } catch (e) {
            alert(e instanceof Error ? e.message : '카드 삭제에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-xl space-y-0">
            <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">
                {status?.registered ? (
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3.5 last:border-b-0">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Check
                                className="h-4 w-4 shrink-0 text-gray-400"
                                strokeWidth={2.5}
                            />
                            <span className="truncate text-sm text-gray-900">
                                {status.cardBrand || '카드'} **** - **** - **** -{' '}
                                {status.cardLast4 || '****'}
                            </span>
                        </div>
                        <button
                            type="button"
                            disabled={busy}
                            className="shrink-0 rounded border border-red-300 px-2 py-0.5 text-xs font-medium text-red-500 hover:bg-red-50"
                            onClick={handleDelete}
                        >
                            삭제
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={busy}
                        className="flex w-full items-center gap-2 px-4 py-3.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={handleRegisterCard}
                    >
                        <Plus className="h-4 w-4 text-gray-500" strokeWidth={2} />
                        새로운 카드
                    </button>
                )}
            </div>

            <div className="mt-4 rounded border border-sky-200 bg-sky-50/90 px-3 py-3 text-xs leading-relaxed text-sky-900">
                신용/체크카드 정보는 당사 서버에 저장되지 않으며 명기된 목적
                외에는 사용되지 않습니다.
            </div>
        </div>
    );
}

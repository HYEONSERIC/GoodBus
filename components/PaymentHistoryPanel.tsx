'use client';

import { useEffect, useState } from 'react';
import { paymentsAPI } from '@/lib/api';

type PaymentTransaction = {
    id: string;
    kind: 'membership_subscription' | 'min_bid_addon' | 'platform_commission';
    status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
    amount: number;
    tripId: string | null;
    bidId: string | null;
    failReason: string | null;
    createdAt: string;
};

const KIND_LABEL: Record<PaymentTransaction['kind'], string> = {
    platform_commission: '중개 수수료',
    membership_subscription: '멤버십 구독료',
    min_bid_addon: '최저입찰가 확인 추가상품',
};

const STATUS_LABEL: Record<
    PaymentTransaction['status'],
    { label: string; className: string }
> = {
    succeeded: { label: '결제완료', className: 'text-gray-900' },
    pending: { label: '결제대기', className: 'text-gray-500' },
    failed: { label: '결제실패', className: 'text-red-500' },
    cancelled: { label: '결제취소', className: 'text-gray-500' },
};

export function PaymentHistoryPanel() {
    const [transactions, setTransactions] = useState<PaymentTransaction[] | null>(
        null,
    );

    useEffect(() => {
        paymentsAPI
            .getTransactions()
            .then((res: { transactions: PaymentTransaction[] }) =>
                setTransactions(res.transactions),
            )
            .catch(() => setTransactions([]));
    }, []);

    return (
        <div className="mx-auto w-full max-w-xl space-y-0">
            <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">
                {transactions === null ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                        불러오는 중...
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                        결제 내역이 없습니다.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                                <th className="px-4 py-2 font-medium">일시</th>
                                <th className="px-4 py-2 font-medium">항목</th>
                                <th className="px-4 py-2 font-medium">금액</th>
                                <th className="px-4 py-2 font-medium">상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx) => (
                                <tr
                                    key={tx.id}
                                    className="border-b border-gray-100 last:border-b-0"
                                >
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {new Date(tx.createdAt).toLocaleString(
                                            'ko-KR',
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">
                                        {KIND_LABEL[tx.kind]}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">
                                        {tx.amount.toLocaleString('ko-KR')}원
                                    </td>
                                    <td
                                        className={`px-4 py-3 ${STATUS_LABEL[tx.status].className}`}
                                    >
                                        {STATUS_LABEL[tx.status].label}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="mt-4 rounded border border-sky-200 bg-sky-50/90 px-3 py-3 text-xs leading-relaxed text-sky-900">
                결제 내역은 당사가 버스업체/버스기사에게 정산받는 중개서비스
                수수료입니다. 버스 이용대금은 당사가 수납하지 않습니다.
            </div>
        </div>
    );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { paymentsAPI } from '@/lib/api';

function BillingKeyCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const authKey = searchParams.get('authKey');
        const failMessage = searchParams.get('message');

        if (!authKey) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorMessage(failMessage || '카드 등록에 실패했습니다.');
            return;
        }

        paymentsAPI
            .confirmBillingKey(authKey)
            .then(() => {
                router.replace('/dashboard');
            })
            .catch((e) => {
                setErrorMessage(
                    e instanceof Error ? e.message : '카드 등록에 실패했습니다.',
                );
            });
    }, [searchParams, router]);

    if (errorMessage) {
        return (
            <div className="p-8 text-center">
                <p className="text-sm text-red-600">{errorMessage}</p>
                <button
                    type="button"
                    className="mt-4 text-sm text-sky-700 underline"
                    onClick={() => router.replace('/dashboard')}
                >
                    대시보드로 돌아가기
                </button>
            </div>
        );
    }

    return <div className="p-8 text-center text-sm text-gray-600">카드 등록 처리 중…</div>;
}

export default function BillingKeyCallbackPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-600">로딩 중…</div>}>
            <BillingKeyCallbackContent />
        </Suspense>
    );
}

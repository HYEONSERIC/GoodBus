'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useQuoteWizard } from '@/hooks/useQuoteWizard';
import { StepCustomerType } from '@/components/quote/StepCustomerType';
import { StepRoute } from '@/components/quote/StepRoute';
import { StepSchedule } from '@/components/quote/StepSchedule';
import { StepHeadcount } from '@/components/quote/StepHeadcount';
import { StepBusSize } from '@/components/quote/StepBusSize';
import { StepPhoneVerify } from '@/components/quote/StepPhoneVerify';

export default function QuotePage() {
    const wizard = useQuoteWizard();
    const { step, stepIndex, totalSteps, goBack } = wizard;

    return (
        <div className="flex min-h-screen flex-col bg-stone-50">
            <div className="h-1 w-full bg-stone-200">
                <div
                    className="h-full bg-[#2563eb] transition-all"
                    style={{
                        width: `${((stepIndex + 1) / totalSteps) * 100}%`,
                    }}
                />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
                <button
                    type="button"
                    onClick={goBack}
                    disabled={stepIndex === 0}
                    className="min-w-[4rem] text-left text-sm text-stone-600 hover:text-stone-900 disabled:opacity-0"
                >
                    &lt; 이전
                </button>
                <span className="text-base font-semibold text-stone-900">
                    무료 견적 등록
                </span>
                <Link
                    href="/"
                    className="flex min-w-[4rem] justify-end text-stone-500 hover:text-stone-900"
                    aria-label="닫기"
                >
                    <X className="size-5" />
                </Link>
            </div>

            {step === 'customer' && <StepCustomerType wizard={wizard} />}
            {step === 'route' && <StepRoute wizard={wizard} />}
            {step === 'schedule' && <StepSchedule wizard={wizard} />}
            {step === 'headcount' && <StepHeadcount wizard={wizard} />}
            {step === 'bus' && <StepBusSize wizard={wizard} />}
            {step === 'phone' && <StepPhoneVerify wizard={wizard} />}
        </div>
    );
}

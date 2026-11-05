'use client';

import { Button } from '@/components/ui/button';
import type { QuoteWizardApi, RequesterType } from '@/hooks/useQuoteWizard';

const REQUESTER_TYPES: { value: RequesterType; label: string }[] = [
    { value: 'individual', label: '개인' },
    { value: 'corporate', label: '법인' },
    { value: 'agency', label: '여행사' },
];

const SERVICE_PURPOSES = [
    '결혼식 하객버스',
    '기업행사/워크샵',
    '웨딩카',
    '통근버스 정기운행',
    '단체여행',
    '학교 행사/MT',
    '현장학습',
    '동호회',
    '콘서트/페스티벌',
    '골프모임',
    '산악회',
    '종교행사',
    '공항이용',
    '기타',
];

export function StepCustomerType({ wizard }: { wizard: QuoteWizardApi }) {
    const { form, update, goNext, canProceed } = wizard;

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-8 px-5 pt-8 pb-24">
                <div className="space-y-3">
                    <h2 className="text-center text-lg font-bold text-stone-900">
                        고객님은 누구신가요?
                    </h2>
                    <div className="mx-auto grid max-w-sm grid-cols-3 overflow-hidden rounded-lg border border-stone-300">
                        {REQUESTER_TYPES.map((item, index) => (
                            <button
                                key={item.value}
                                type="button"
                                className={`h-11 text-sm font-semibold transition ${
                                    index > 0 ? 'border-l border-stone-300' : ''
                                } ${
                                    form.requesterType === item.value
                                        ? 'bg-[#2563eb] text-white'
                                        : 'bg-white text-stone-600 hover:bg-stone-50'
                                }`}
                                onClick={() => update({ requesterType: item.value })}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-center text-lg font-bold text-stone-900">
                        어떤 목적으로 이용하시나요?
                    </h2>
                    <div className="mx-auto grid max-w-sm grid-cols-2 gap-2.5">
                        {SERVICE_PURPOSES.map((purpose) => (
                            <button
                                key={purpose}
                                type="button"
                                onClick={() => update({ servicePurpose: purpose })}
                                className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                                    form.servicePurpose === purpose
                                        ? 'border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]'
                                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                                }`}
                            >
                                {purpose}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-5 py-3">
                <div className="mx-auto max-w-lg">
                    <Button
                        type="button"
                        disabled={!canProceed}
                        onClick={goNext}
                        className="h-12 w-full rounded-full bg-[#2563eb] text-base font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-40"
                    >
                        다음
                    </Button>
                </div>
            </div>
        </div>
    );
}

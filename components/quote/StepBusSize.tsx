'use client';

import { Button } from '@/components/ui/button';
import type { BusSizeValue, QuoteWizardApi } from '@/hooks/useQuoteWizard';

const BUS_SIZES: { value: BusSizeValue; label: string; detail: string }[] = [
    { value: 'large', label: '대형버스', detail: '45인승' },
    { value: 'medium', label: '우등버스', detail: '28인승' },
    { value: 'small', label: '미니버스·밴', detail: '14인승' },
];

export function StepBusSize({ wizard }: { wizard: QuoteWizardApi }) {
    const { form, update, goNext, canProceed } = wizard;

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-6 px-5 pt-8 pb-24">
                <h2 className="text-center text-lg font-bold text-stone-900">
                    어떤 버스가 필요하신가요?
                </h2>
                <div className="mx-auto max-w-sm grid grid-cols-3 overflow-hidden rounded-lg border border-stone-300">
                    {BUS_SIZES.map((item, index) => (
                        <button
                            key={item.value}
                            type="button"
                            className={`px-2 py-4 text-center text-sm font-semibold transition ${
                                index > 0 ? 'border-l border-stone-300' : ''
                            } ${
                                form.busSize === item.value
                                    ? 'bg-[#2563eb] text-white'
                                    : 'bg-white text-stone-600 hover:bg-stone-50'
                            }`}
                            onClick={() => update({ busSize: item.value })}
                        >
                            {item.label}
                            <div
                                className={`mt-1 text-xs font-normal ${
                                    form.busSize === item.value
                                        ? 'text-white/80'
                                        : 'text-stone-500'
                                }`}
                            >
                                ({item.detail})
                            </div>
                        </button>
                    ))}
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

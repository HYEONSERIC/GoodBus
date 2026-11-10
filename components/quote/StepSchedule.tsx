'use client';

import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/quote/DateTimeField';
import type { QuoteWizardApi } from '@/hooks/useQuoteWizard';

export function StepSchedule({ wizard }: { wizard: QuoteWizardApi }) {
    const { form, update, goNext, canProceed } = wizard;

    const goingMin = new Date();
    const returnMin = form.goingDateTime
        ? new Date(form.goingDateTime)
        : goingMin;

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-6 px-5 pt-8 pb-24">
                <h2 className="text-center text-lg font-bold text-stone-900">
                    일정을 알려주세요
                </h2>
                <div className="mx-auto max-w-sm space-y-6">
                    <DateTimeField
                        label="가는날 시간"
                        value={form.goingDateTime}
                        minDateTime={goingMin}
                        onChange={(value) => update({ goingDateTime: value })}
                    />
                    {form.tripType === 'round' && (
                        <DateTimeField
                            label="오는날 시간"
                            value={form.returnDateTime}
                            minDateTime={returnMin}
                            onChange={(value) => update({ returnDateTime: value })}
                        />
                    )}
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

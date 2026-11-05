'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuoteWizardApi } from '@/hooks/useQuoteWizard';

function DateTimeField({
    label,
    value,
    min,
    onChange,
}: {
    label: string;
    value: string;
    min: string;
    onChange: (value: string) => void;
}) {
    const ref = useRef<HTMLInputElement | null>(null);
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="relative">
                <Input
                    ref={ref}
                    type="datetime-local"
                    min={min}
                    value={value}
                    className={`peer h-11 pr-10 ${!value ? 'text-transparent' : ''}`}
                    onClick={() => {
                        if (ref.current?.showPicker) {
                            ref.current.showPicker();
                            return;
                        }
                        ref.current?.focus();
                    }}
                    onChange={(e) => onChange(e.target.value)}
                />
                {!value && (
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-500 peer-focus:hidden">
                        날짜를 선택하세요
                    </span>
                )}
            </div>
        </div>
    );
}

export function StepSchedule({ wizard }: { wizard: QuoteWizardApi }) {
    const { form, update, goNext, canProceed, goingScheduleMin, returnScheduleMin } =
        wizard;

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-6 px-5 pt-8 pb-24">
                <h2 className="text-center text-lg font-bold text-stone-900">
                    일정을 알려주세요
                </h2>
                <div className="mx-auto max-w-sm space-y-4">
                    <DateTimeField
                        label="가는날 시간"
                        value={form.goingDateTime}
                        min={goingScheduleMin}
                        onChange={(value) => update({ goingDateTime: value })}
                    />
                    {form.tripType === 'round' && (
                        <DateTimeField
                            label="오는날 시간"
                            value={form.returnDateTime}
                            min={returnScheduleMin}
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

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuoteWizardApi } from '@/hooks/useQuoteWizard';

export function StepHeadcount({ wizard }: { wizard: QuoteWizardApi }) {
    const { form, update, goNext, canProceed } = wizard;

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-6 px-5 pt-8 pb-24">
                <h2 className="text-center text-lg font-bold text-stone-900">
                    인원은 몇 명인가요?
                </h2>
                <div className="mx-auto max-w-sm space-y-3">
                    <Input
                        className="h-12 text-center text-base"
                        type="text"
                        inputMode="numeric"
                        placeholder="숫자만 입력"
                        disabled={form.paxUnknown}
                        value={form.paxCount}
                        onChange={(e) =>
                            update({ paxCount: e.target.value.replace(/\D/g, '') })
                        }
                    />
                    <label className="flex items-center gap-2 text-sm text-stone-600">
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#2563eb]"
                            checked={form.paxUnknown}
                            onChange={(e) =>
                                update({ paxUnknown: e.target.checked, paxCount: '' })
                            }
                        />
                        정확한 인원을 모릅니다.
                    </label>
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

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuoteWizardApi } from '@/hooks/useQuoteWizard';

// 콜버스의 "블러 처리된 견적 리스트" 연출 — 실제 데이터 없이 지금까지 입력한
// 경로/인원만 반영해 "입찰이 들어오는 중" 느낌을 준다.
function DummyQuotePreview({ wizard }: { wizard: QuoteWizardApi }) {
    const { form } = wizard;
    const headcount = form.paxUnknown ? '약 40명' : `${form.paxCount}명`;

    return (
        <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-700">
                {form.origin || '출발지'} → {form.destination || '도착지'} · {headcount}
            </div>
            <div className="space-y-3 px-4 py-4 blur-[3px] select-none">
                {[1, 2, 3].map((row) => (
                    <div key={row} className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="h-3 w-24 rounded bg-stone-200" />
                            <div className="h-2.5 w-16 rounded bg-stone-100" />
                        </div>
                        <div className="h-4 w-14 rounded bg-stone-200" />
                    </div>
                ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-white via-white/70 to-transparent pb-3">
                <span className="rounded-full bg-stone-900/80 px-3 py-1 text-xs font-medium text-white">
                    입찰이 들어오는 중...
                </span>
            </div>
        </div>
    );
}

export function StepPhoneVerify({ wizard }: { wizard: QuoteWizardApi }) {
    const {
        phoneNumber,
        setPhoneNumber,
        phoneCode,
        setPhoneCode,
        phoneOtpRequested,
        phoneRequestLoading,
        submitLoading,
        phoneNotice,
        resendCooldown,
        error,
        requestOtp,
        verifyAndSubmit,
    } = wizard;

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-6 px-5 pt-6 pb-28">
                <DummyQuotePreview wizard={wizard} />

                <div className="mx-auto max-w-sm space-y-1 text-center">
                    <h2 className="text-lg font-bold text-stone-900">
                        내 폰으로 5분만에 견적 받기
                    </h2>
                    <p className="text-sm text-stone-500">당장 예약하지 않으셔도 됩니다.</p>
                </div>

                <div className="mx-auto max-w-sm space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="quote-phone">휴대폰 번호</Label>
                        <div className="flex gap-2">
                            <Input
                                id="quote-phone"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="01012345678"
                                disabled={phoneRequestLoading}
                            />
                            <Button
                                type="button"
                                className="shrink-0 bg-[#2563eb] hover:bg-[#1d4ed8]"
                                onClick={requestOtp}
                                disabled={
                                    !phoneNumber || phoneRequestLoading || resendCooldown > 0
                                }
                            >
                                {resendCooldown > 0
                                    ? `재전송 ${resendCooldown}초`
                                    : phoneOtpRequested
                                      ? '재전송'
                                      : '인증번호 전송'}
                            </Button>
                        </div>
                    </div>

                    {phoneOtpRequested && (
                        <div className="space-y-2">
                            <Label htmlFor="quote-code">인증번호</Label>
                            <Input
                                id="quote-code"
                                value={phoneCode}
                                onChange={(e) => setPhoneCode(e.target.value)}
                                placeholder="4자리 인증번호"
                                inputMode="numeric"
                            />
                        </div>
                    )}

                    {phoneNotice && <p className="text-sm text-stone-500">{phoneNotice}</p>}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-5 py-3">
                <div className="mx-auto max-w-lg">
                    <Button
                        type="button"
                        onClick={verifyAndSubmit}
                        disabled={!phoneOtpRequested || !phoneCode || submitLoading}
                        className="h-12 w-full rounded-full bg-[#2563eb] text-base font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-40"
                    >
                        {submitLoading ? '견적 등록 중...' : '견적 받기'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

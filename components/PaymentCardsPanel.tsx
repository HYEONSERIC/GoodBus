'use client';

import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { paymentsAPI } from '@/lib/api';

type BillingKeyStatus = {
    registered: boolean;
    cardBrand?: string | null;
    cardLast4?: string | null;
};

type CardFormState = {
    cardNo: string;
    expMonth: string;
    expYear: string;
    idNo: string;
    cardPw: string;
    otpCode: string;
};

const EMPTY_FORM: CardFormState = {
    cardNo: '',
    expMonth: '',
    expYear: '',
    idNo: '',
    cardPw: '',
    otpCode: '',
};

function isValidLuhn(cardNo: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = cardNo.length - 1; i >= 0; i--) {
        let digit = Number(cardNo[i]);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
}

export function PaymentCardsPanel({
    userId,
    role,
}: {
    userId?: string;
    role: 'Driver' | 'BusCompany';
}) {
    const [status, setStatus] = useState<BillingKeyStatus | null>(null);
    const [busy, setBusy] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<CardFormState>(EMPTY_FORM);
    const [otpSent, setOtpSent] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (!userId) return;
        paymentsAPI
            .getBillingKeyStatus()
            .then((res: BillingKeyStatus) => setStatus(res))
            .catch(() => setStatus({ registered: false }));
    }, [userId]);

    useEffect(() => {
        if (otpCooldown <= 0) return;
        const timer = setInterval(() => {
            setOtpCooldown((s) => Math.max(0, s - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [otpCooldown]);

    // 폼을 닫을 때 카드정보가 메모리에 남지 않도록 상태를 즉시 비운다.
    function resetForm() {
        setForm(EMPTY_FORM);
        setOtpSent(false);
        setOtpCooldown(0);
        setFormError('');
        setShowForm(false);
    }

    async function handleRequestOtp() {
        setFormError('');
        setBusy(true);
        try {
            await paymentsAPI.requestBillingKeyOtp();
            setOtpSent(true);
            setOtpCooldown(60);
        } catch (e) {
            setFormError(e instanceof Error ? e.message : '인증번호 발송에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');

        const cardNo = form.cardNo.replace(/[^0-9]/g, '');
        const idNo = form.idNo.replace(/[^0-9]/g, '');
        const expectedIdNoLength = role === 'Driver' ? 6 : 10;

        if (cardNo.length < 15 || cardNo.length > 16 || !isValidLuhn(cardNo)) {
            setFormError('카드번호를 다시 확인해주세요.');
            return;
        }
        if (!/^(0[1-9]|1[0-2])$/.test(form.expMonth)) {
            setFormError('유효기간(월)을 다시 확인해주세요.');
            return;
        }
        if (!/^[0-9]{2}$/.test(form.expYear)) {
            setFormError('유효기간(년)을 다시 확인해주세요.');
            return;
        }
        if (idNo.length !== expectedIdNoLength) {
            setFormError(
                role === 'Driver'
                    ? '생년월일 6자리를 입력해주세요.'
                    : '사업자등록번호 10자리를 입력해주세요.',
            );
            return;
        }
        if (!/^[0-9]{2}$/.test(form.cardPw)) {
            setFormError('카드 비밀번호 앞 2자리를 입력해주세요.');
            return;
        }
        if (!form.otpCode.trim()) {
            setFormError('인증번호를 입력해주세요.');
            return;
        }

        setBusy(true);
        try {
            await paymentsAPI.registerBillingKey({
                cardNo,
                expMonth: form.expMonth,
                expYear: form.expYear,
                idNo,
                cardPw: form.cardPw,
                otpCode: form.otpCode.trim(),
            });
            resetForm();
            const res = await paymentsAPI.getBillingKeyStatus();
            setStatus(res);
        } catch (e) {
            setFormError(e instanceof Error ? e.message : '카드 등록에 실패했습니다.');
        } finally {
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
                ) : showForm ? (
                    <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
                        <div>
                            <label className="mb-1 block text-xs text-gray-600">
                                카드번호
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="cc-number"
                                data-sentry-mask
                                maxLength={16}
                                placeholder="0000000000000000"
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                value={form.cardNo}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        cardNo: e.target.value.replace(/[^0-9]/g, ''),
                                    }))
                                }
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="mb-1 block text-xs text-gray-600">
                                    유효기간(월)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="cc-exp-month"
                                    maxLength={2}
                                    placeholder="MM"
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                    value={form.expMonth}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            expMonth: e.target.value.replace(/[^0-9]/g, ''),
                                        }))
                                    }
                                />
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-xs text-gray-600">
                                    유효기간(년)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="cc-exp-year"
                                    maxLength={2}
                                    placeholder="YY"
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                    value={form.expYear}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            expYear: e.target.value.replace(/[^0-9]/g, ''),
                                        }))
                                    }
                                />
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-xs text-gray-600">
                                    비밀번호 앞 2자리
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    data-sentry-mask
                                    maxLength={2}
                                    placeholder="**"
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                    value={form.cardPw}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            cardPw: e.target.value.replace(/[^0-9]/g, ''),
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-gray-600">
                                {role === 'Driver'
                                    ? '생년월일 (6자리, 예: 900101)'
                                    : '사업자등록번호 (10자리)'}
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                data-sentry-mask
                                maxLength={role === 'Driver' ? 6 : 10}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                value={form.idNo}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        idNo: e.target.value.replace(/[^0-9]/g, ''),
                                    }))
                                }
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="mb-1 block text-xs text-gray-600">
                                    인증번호
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={4}
                                    disabled={!otpSent}
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                                    value={form.otpCode}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            otpCode: e.target.value.replace(/[^0-9]/g, ''),
                                        }))
                                    }
                                />
                            </div>
                            <button
                                type="button"
                                disabled={busy || otpCooldown > 0}
                                onClick={handleRequestOtp}
                                className="shrink-0 rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                {otpCooldown > 0
                                    ? `재전송 ${otpCooldown}s`
                                    : otpSent
                                      ? '재전송'
                                      : '인증번호 요청'}
                            </button>
                        </div>

                        {formError && (
                            <p className="text-xs text-red-600">{formError}</p>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={busy}
                                className="flex-1 rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                            >
                                카드 등록
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={resetForm}
                                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                            >
                                취소
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        type="button"
                        disabled={busy}
                        className="flex w-full items-center gap-2 px-4 py-3.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="h-4 w-4 text-gray-500" strokeWidth={2} />
                        새로운 카드
                    </button>
                )}
            </div>

            <div className="mt-4 rounded border border-sky-200 bg-sky-50/90 px-3 py-3 text-xs leading-relaxed text-sky-900">
                신용/체크카드 정보는 암호화되어 결제대행사(나이스페이먼츠)에
                안전하게 전달되며, 명기된 목적 외에는 사용되지 않습니다.
            </div>
        </div>
    );
}

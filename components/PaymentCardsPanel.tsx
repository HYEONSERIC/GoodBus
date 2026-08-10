'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Plus } from 'lucide-react';

export type PaymentCard = {
    id: string;
    brand: string;
    last4: string;
    isCorporate: boolean;
};

type AddCardForm = {
    cardNumber: string;
    expiry: string;
    birthOrBiz: string;
    password: string;
    isCorporate: boolean;
};

const STORAGE_PREFIX = 'goodbus_payment_cards_';

function storageKey(userId?: string) {
    return `${STORAGE_PREFIX}${userId || 'guest'}`;
}

function detectBrand(digits: string): string {
    if (digits.startsWith('4')) return 'VISA';
    if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Master';
    if (digits.startsWith('3')) return 'AMEX';
    if (digits.startsWith('9')) return '신한';
    return '카드';
}

function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1-').replace(/-$/, '');
}

function maskCardNumber(last4: string, brand: string) {
    return `${brand} **** - **** - **** - ${last4}`;
}

function emptyForm(): AddCardForm {
    return {
        cardNumber: '',
        expiry: '',
        birthOrBiz: '',
        password: '',
        isCorporate: false,
    };
}

export function PaymentCardsPanel({ userId }: { userId?: string }) {
    const [cards, setCards] = useState<PaymentCard[]>([]);
    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState<AddCardForm>(emptyForm);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(storageKey(userId));
            if (raw) {
                const parsed = JSON.parse(raw) as PaymentCard[];
                // 의도적: userId는 로그인 직후 undefined -> 인증 완료 후 실제
                // 값으로 바뀌고, 그 변화에 반응해 해당 사용자의 카드 목록을
                // 다시 읽어야 한다. useState 지연 초기화로 바꾸면 마운트
                // 시점(userId 미확정)의 빈 값에 영영 고정된다.
                // (BUGFIXES_2026-08-09.md 참고)
                // eslint-disable-next-line react-hooks/set-state-in-effect
                if (Array.isArray(parsed)) setCards(parsed);
            }
        } catch {
            /* ignore */
        }
    }, [userId]);

    const persist = useCallback(
        (next: PaymentCard[]) => {
            setCards(next);
            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey(userId), JSON.stringify(next));
            }
        },
        [userId],
    );

    function openAddDialog() {
        setForm(emptyForm());
        setFormError('');
        setAddOpen(true);
    }

    function handleConfirmAdd() {
        const digits = form.cardNumber.replace(/\D/g, '');
        if (digits.length < 15) {
            setFormError('카드번호를 올바르게 입력해주세요.');
            return;
        }
        if (!/^\d{2}\/\d{2}$/.test(form.expiry.trim())) {
            setFormError('유효기간을 MM/YY 형식으로 입력해주세요.');
            return;
        }
        if (form.birthOrBiz.replace(/\D/g, '').length < 6) {
            setFormError(
                form.isCorporate
                    ? '사업자등록번호를 입력해주세요.'
                    : '생년월일 6자리를 입력해주세요.',
            );
            return;
        }
        if (form.password.replace(/\D/g, '').length !== 2) {
            setFormError('카드 비밀번호 앞 2자리를 입력해주세요.');
            return;
        }

        const last4 = digits.slice(-4);
        const brand = detectBrand(digits);
        const newCard: PaymentCard = {
            id: `card_${Date.now()}`,
            brand,
            last4,
            isCorporate: form.isCorporate,
        };
        persist([...cards, newCard]);
        setAddOpen(false);
        setForm(emptyForm());
        alert(
            '카드가 등록되었습니다.\n(데모: 실제 결제·본인인증 연동 전까지 브라우저에만 저장됩니다.)',
        );
    }

    function handleDelete(id: string) {
        if (!confirm('이 카드를 삭제하시겠습니까?')) return;
        persist(cards.filter((c) => c.id !== id));
    }

    return (
        <div className="mx-auto w-full max-w-xl space-y-0">
            <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">
                {cards.map((card) => (
                    <div
                        key={card.id}
                        className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3.5 last:border-b-0"
                    >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Check
                                className="h-4 w-4 shrink-0 text-gray-400"
                                strokeWidth={2.5}
                            />
                            <span className="truncate text-sm text-gray-900">
                                {maskCardNumber(card.last4, card.brand)}
                                {card.isCorporate ? ' (법인)' : ' (개인)'}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="shrink-0 rounded border border-red-300 px-2 py-0.5 text-xs font-medium text-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(card.id)}
                        >
                            삭제
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-3.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={openAddDialog}
                >
                    <Plus className="h-4 w-4 text-gray-500" strokeWidth={2} />
                    새로운 카드
                </button>
            </div>

            <div className="mt-4 rounded border border-sky-200 bg-sky-50/90 px-3 py-3 text-xs leading-relaxed text-sky-900">
                신용/체크카드 정보는 당사 서버에 저장되지 않으며 명기된 목적
                외에는 사용되지 않습니다.
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-md gap-0 overflow-hidden rounded-lg p-0 sm:max-w-md">
                    <DialogHeader className="flex flex-row items-center gap-3 space-y-0 border-b px-4 py-3 pr-12">
                        <DialogTitle className="shrink-0 text-base font-semibold">
                            결제카드 추가
                        </DialogTitle>
                        <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-gray-700">
                            <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-gray-300"
                                checked={form.isCorporate}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        isCorporate: e.target.checked,
                                    }))
                                }
                            />
                            법인카드
                        </label>
                    </DialogHeader>

                    <div className="space-y-4 px-4 py-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600">
                                카드번호
                            </Label>
                            <Input
                                placeholder="••••-••••-••••-••••"
                                value={form.cardNumber}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        cardNumber: formatCardNumber(
                                            e.target.value,
                                        ),
                                    }))
                                }
                                className="h-10 rounded-md border-gray-300"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">
                                    유효기간
                                </Label>
                                <Input
                                    placeholder="MM/YY (예:07/22)"
                                    value={form.expiry}
                                    onChange={(e) => {
                                        let v = e.target.value.replace(
                                            /\D/g,
                                            '',
                                        );
                                        if (v.length > 4) v = v.slice(0, 4);
                                        if (v.length >= 3) {
                                            v = `${v.slice(0, 2)}/${v.slice(2)}`;
                                        }
                                        setForm((f) => ({ ...f, expiry: v }));
                                    }}
                                    className="h-10 rounded-md border-gray-300"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-gray-600">
                                    {form.isCorporate
                                        ? '사업자등록번호'
                                        : '생년월일'}
                                </Label>
                                <Input
                                    placeholder={
                                        form.isCorporate
                                            ? '사업자등록번호'
                                            : '주민번호 앞 6자리'
                                    }
                                    value={form.birthOrBiz}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            birthOrBiz: e.target.value
                                                .replace(/\D/g, '')
                                                .slice(0, 10),
                                        }))
                                    }
                                    className="h-10 rounded-md border-gray-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-600">
                                카드 비밀번호
                            </Label>
                            <Input
                                type="password"
                                placeholder="비밀번호 앞 2자리"
                                maxLength={2}
                                value={form.password}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        password: e.target.value
                                            .replace(/\D/g, '')
                                            .slice(0, 2),
                                    }))
                                }
                                className="h-10 rounded-md border-gray-300"
                            />
                        </div>

                        <div className="rounded border border-red-200 bg-red-50/80 px-3 py-2.5 text-xs leading-relaxed text-red-800">
                            <span className="font-semibold">※</span> 카드 등록을
                            위해 100원의 시범결제가 진행되며, 카드 등록이
                            완료되면 즉시 취소됩니다.
                        </div>

                        {formError ? (
                            <p className="text-center text-xs text-red-600">
                                {formError}
                            </p>
                        ) : null}

                        <Button
                            type="button"
                            className="h-11 w-full rounded-md bg-[#f5c400] text-sm font-semibold text-gray-900 hover:bg-[#e6b800]"
                            onClick={handleConfirmAdd}
                        >
                            확인
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

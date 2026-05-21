'use client';

import { useState } from 'react';
import { supportAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type SupportInquiryCategory =
    | 'quote_amount'
    | 'reservation_progress'
    | 'verification'
    | 'other';

export type SupportInquiryMenuOption = {
    id: SupportInquiryCategory;
    label: string;
};

export function SupportInquiryDialog({
    open,
    onOpenChange,
    menuOptions,
    titleInputId = 'inquiry-title',
    bodyInputId = 'inquiry-body',
    onSubmitted,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    menuOptions: SupportInquiryMenuOption[];
    titleInputId?: string;
    bodyInputId?: string;
    onSubmitted?: () => void;
}) {
    const [step, setStep] = useState<'menu' | 'form' | 'done'>('menu');
    const [category, setCategory] = useState<SupportInquiryCategory | null>(
        null,
    );
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    function handleClose(next: boolean) {
        onOpenChange(next);
        if (!next) {
            setStep('menu');
            setCategory(null);
            setTitle('');
            setBody('');
            setFormError('');
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>문의하기</DialogTitle>
                    <DialogDescription>
                        문의 유형을 선택해주세요.
                    </DialogDescription>
                </DialogHeader>
                {step === 'menu' && (
                    <div className="space-y-3">
                        {menuOptions.map((opt) => (
                            <Button
                                key={opt.id}
                                variant="outline"
                                className="w-full"
                                type="button"
                                onClick={() => {
                                    setCategory(opt.id);
                                    setStep('form');
                                }}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                )}
                {step === 'form' && (
                    <div className="space-y-4">
                        {formError ? (
                            <p className="text-sm text-red-600">{formError}</p>
                        ) : null}
                        <div>
                            <Label htmlFor={titleInputId}>제목</Label>
                            <Input
                                id={titleInputId}
                                className="mt-1"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="문의 제목을 입력하세요"
                                maxLength={200}
                            />
                        </div>
                        <div>
                            <Label htmlFor={bodyInputId}>문의 내용</Label>
                            <Textarea
                                id={bodyInputId}
                                className="mt-1 min-h-[140px]"
                                placeholder="문의 내용을 입력해주세요"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setStep('menu');
                                    setFormError('');
                                }}
                            >
                                이전
                            </Button>
                            <Button
                                type="button"
                                disabled={submitting || !category}
                                onClick={async () => {
                                    const trimmedTitle = title.trim();
                                    const trimmedBody = body.trim();
                                    if (!trimmedTitle) {
                                        setFormError('제목을 입력해주세요.');
                                        return;
                                    }
                                    if (!trimmedBody) {
                                        setFormError(
                                            '문의 내용을 입력해주세요.',
                                        );
                                        return;
                                    }
                                    setSubmitting(true);
                                    setFormError('');
                                    try {
                                        await supportAPI.createInquiry({
                                            category: category!,
                                            title: trimmedTitle,
                                            body: trimmedBody,
                                        });
                                        setTitle('');
                                        setBody('');
                                        setCategory(null);
                                        setStep('done');
                                        onSubmitted?.();
                                    } catch (e) {
                                        setFormError(
                                            e instanceof Error
                                                ? e.message
                                                : '문의 접수에 실패했습니다.',
                                        );
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                            >
                                문의하기
                            </Button>
                        </div>
                    </div>
                )}
                {step === 'done' && (
                    <div className="space-y-4 text-sm text-gray-600">
                        문의가 접수되었습니다. 빠르게 답변드리겠습니다.
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleClose(false)}
                        >
                            닫기
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export const PASSENGER_SUPPORT_MENU: SupportInquiryMenuOption[] = [
    { id: 'quote_amount', label: '견적 금액 문의' },
    { id: 'reservation_progress', label: '예약 진행 문의' },
    { id: 'other', label: '기타 문의' },
];

export const DRIVER_SUPPORT_MENU: SupportInquiryMenuOption[] = [
    { id: 'quote_amount', label: '입찰·견적 문의' },
    { id: 'verification', label: '자격증·인증 문의' },
    { id: 'other', label: '기타 문의' },
];

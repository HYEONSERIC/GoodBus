'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/lib/api';
import { AuthScaffold } from '@/components/auth/AuthScaffold';

const RESEND_COOLDOWN_SECONDS = 60;

type AccountType = 'passenger' | 'business';

export default function LoginPage() {
    const router = useRouter();
    const [accountType, setAccountType] = useState<AccountType>('passenger');
    const [error, setError] = useState('');

    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneCode, setPhoneCode] = useState('');
    const [phoneStep, setPhoneStep] = useState<'enter-phone' | 'enter-code'>(
        'enter-phone'
    );
    const [phoneRequestLoading, setPhoneRequestLoading] = useState(false);
    const [phoneVerifyLoading, setPhoneVerifyLoading] = useState(false);
    const [phoneNotice, setPhoneNotice] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((seconds) => Math.max(0, seconds - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const resetPhoneStep = () => {
        setPhoneStep('enter-phone');
        setPhoneCode('');
        setPhoneNotice('');
        setError('');
    };

    const handleAccountTypeChange = (next: AccountType) => {
        if (next === accountType) return;
        setAccountType(next);
        resetPhoneStep();
    };

    const handlePhoneRequest = async () => {
        setError('');
        setPhoneNotice('');
        setPhoneRequestLoading(true);

        try {
            const result = await authAPI.requestPhoneOtp(
                phoneNumber,
                'login',
                accountType
            );
            setPhoneStep('enter-code');
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setPhoneNotice(
                result?.devMode
                    ? '개발 모드: 서버 콘솔에서 인증번호를 확인해주세요'
                    : '인증번호가 발송되었습니다'
            );
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : '인증번호 발송에 실패했습니다'
            );
        } finally {
            setPhoneRequestLoading(false);
        }
    };

    const handlePhoneVerify = async () => {
        setError('');
        setPhoneVerifyLoading(true);

        try {
            await authAPI.loginWithPhone(phoneNumber, phoneCode, accountType);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '로그인에 실패했습니다');
        } finally {
            setPhoneVerifyLoading(false);
        }
    };

    return (
        <AuthScaffold title="로그인">
            <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
                <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-gray-100 p-1">
                    <button
                        type="button"
                        className={`rounded-full px-3 py-2 text-sm font-semibold ${
                            accountType === 'passenger'
                                ? 'bg-[#2563eb] text-white'
                                : 'text-gray-700'
                        }`}
                        onClick={() => handleAccountTypeChange('passenger')}
                    >
                        승객 로그인
                    </button>
                    <button
                        type="button"
                        className={`rounded-full px-3 py-2 text-sm font-semibold ${
                            accountType === 'business'
                                ? 'bg-[#2563eb] text-white'
                                : 'text-gray-700'
                        }`}
                        onClick={() => handleAccountTypeChange('business')}
                    >
                        기사·회사 로그인
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">휴대전화 번호</Label>
                        <div className="flex gap-2">
                            <Input
                                id="phoneNumber"
                                value={phoneNumber}
                                onChange={(e) => {
                                    setPhoneNumber(e.target.value);
                                    setPhoneStep('enter-phone');
                                    setPhoneCode('');
                                }}
                                placeholder="01012345678"
                                disabled={phoneRequestLoading}
                            />
                            <Button
                                type="button"
                                className="whitespace-nowrap bg-[#2563eb] hover:bg-[#1d4ed8]"
                                onClick={handlePhoneRequest}
                                disabled={
                                    !phoneNumber ||
                                    phoneRequestLoading ||
                                    resendCooldown > 0
                                }
                            >
                                {resendCooldown > 0
                                    ? `재전송 ${resendCooldown}초`
                                    : phoneStep === 'enter-code'
                                      ? '재전송'
                                      : '인증 요청'}
                            </Button>
                        </div>
                    </div>

                    {phoneStep === 'enter-code' && (
                        <div className="space-y-2">
                            <Label htmlFor="phoneCode">인증번호</Label>
                            <Input
                                id="phoneCode"
                                value={phoneCode}
                                onChange={(e) => setPhoneCode(e.target.value)}
                                placeholder="4자리 인증번호"
                                inputMode="numeric"
                            />
                        </div>
                    )}

                    {phoneNotice && (
                        <p className="text-sm text-gray-500">{phoneNotice}</p>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <Button
                        type="button"
                        className="h-11 w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                        onClick={handlePhoneVerify}
                        disabled={
                            phoneStep !== 'enter-code' ||
                            !phoneCode ||
                            phoneVerifyLoading
                        }
                    >
                        {phoneVerifyLoading ? '로그인 중...' : '로그인'}
                    </Button>
                </div>
            </div>
        </AuthScaffold>
    );
}

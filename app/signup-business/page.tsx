'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { authAPI } from '@/lib/api';

const RESEND_COOLDOWN_SECONDS = 60;
// 사이트 키가 없으면(예: 로컬/키 발급 전) TurnstileWidget이 아무것도 렌더링하지
// 않고 서버도 항상 통과시키므로, 이때는 토큰 없이도 제출을 막지 않는다.
const TURNSTILE_ENABLED = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export default function SignupBusinessPage() {
    const router = useRouter();
    const [accountType, setAccountType] = useState<'Driver' | 'BusCompany'>(
        'Driver'
    );
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneCode, setPhoneCode] = useState('');
    const [phoneOtpRequested, setPhoneOtpRequested] = useState(false);
    const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
    const [phoneNotice, setPhoneNotice] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((seconds) => Math.max(0, seconds - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handlePhoneOtpRequest = async () => {
        setError('');
        setPhoneNotice('');
        setPhoneOtpLoading(true);

        try {
            const result = await authAPI.requestPhoneOtp(
                phoneNumber,
                'signup',
                'business'
            );
            setPhoneOtpRequested(true);
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
            setPhoneOtpLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (accountType === 'Driver' && !name.trim()) {
            setError('이름을 입력해주세요.');
            return;
        }
        if (accountType === 'BusCompany' && (!companyName.trim() || !name.trim())) {
            setError('회사명과 담당자 이름을 입력해주세요.');
            return;
        }
        if (!phoneOtpRequested || !phoneCode) {
            setError('휴대전화 인증을 완료해주세요.');
            return;
        }
        if (TURNSTILE_ENABLED && !turnstileToken) {
            setError('보안 인증을 완료해주세요.');
            return;
        }

        setLoading(true);
        try {
            await authAPI.signup({
                role: accountType,
                phoneNumber,
                phoneOtpCode: phoneCode,
                displayName: name.trim(),
                companyName:
                    accountType === 'BusCompany' ? companyName.trim() : undefined,
                turnstileToken: turnstileToken ?? undefined,
            });
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '가입에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthScaffold title="버스/회사 가입">
            <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>가입 유형</Label>
                        <select
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            value={accountType}
                            onChange={(e) => {
                                setAccountType(
                                    e.target.value as 'Driver' | 'BusCompany'
                                );
                                setError('');
                            }}
                        >
                            <option value="Driver">버스 기사</option>
                            <option value="BusCompany">버스 회사</option>
                        </select>
                    </div>

                    {accountType === 'BusCompany' && (
                        <div className="space-y-2">
                            <Label htmlFor="companyName">회사명</Label>
                            <Input
                                id="companyName"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="회사명을 입력하세요"
                                required
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">
                            {accountType === 'BusCompany' ? '담당자 이름' : '이름'}
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={
                                accountType === 'BusCompany'
                                    ? '담당자 실명을 입력하세요'
                                    : '실명을 입력하세요'
                            }
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">
                            {accountType === 'BusCompany'
                                ? '담당자 휴대폰 번호'
                                : '휴대폰 번호'}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="phoneNumber"
                                value={phoneNumber}
                                onChange={(e) => {
                                    setPhoneNumber(e.target.value);
                                    setPhoneOtpRequested(false);
                                    setPhoneCode('');
                                }}
                                placeholder="01012345678"
                                disabled={phoneOtpLoading}
                                required
                            />
                            <Button
                                type="button"
                                className="whitespace-nowrap bg-[#2563eb] hover:bg-[#1d4ed8]"
                                onClick={handlePhoneOtpRequest}
                                disabled={
                                    !phoneNumber ||
                                    phoneOtpLoading ||
                                    resendCooldown > 0
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
                            <Label htmlFor="phoneCode">인증번호</Label>
                            <Input
                                id="phoneCode"
                                value={phoneCode}
                                onChange={(e) => setPhoneCode(e.target.value)}
                                placeholder="인증번호를 입력하세요"
                                inputMode="numeric"
                                required
                            />
                        </div>
                    )}

                    {phoneNotice && (
                        <p className="text-sm text-gray-500">{phoneNotice}</p>
                    )}

                    <TurnstileWidget onVerify={setTurnstileToken} />

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <Button
                        type="submit"
                        className="h-11 w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                        disabled={loading}
                    >
                        {loading ? '가입 중...' : '인증하고 가입하기'}
                    </Button>
                </form>
            </div>
        </AuthScaffold>
    );
}

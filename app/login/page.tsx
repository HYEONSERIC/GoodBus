'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/lib/api';
import { AuthScaffold } from '@/components/auth/AuthScaffold';

const RESEND_COOLDOWN_SECONDS = 60;

export default function LoginPage() {
    const router = useRouter();
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authAPI.login(email, password);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '로그인에 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneRequest = async () => {
        setError('');
        setPhoneNotice('');
        setPhoneRequestLoading(true);

        try {
            const result = await authAPI.requestPhoneOtp(phoneNumber, 'login');
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
            await authAPI.loginWithPhone(phoneNumber, phoneCode);
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
                            loginMethod === 'email'
                                ? 'bg-[#2563eb] text-white'
                                : 'text-gray-700'
                        }`}
                        onClick={() => setLoginMethod('email')}
                    >
                        이메일로 로그인
                    </button>
                    <button
                        type="button"
                        className={`rounded-full px-3 py-2 text-sm font-semibold ${
                            loginMethod === 'phone'
                                ? 'bg-[#2563eb] text-white'
                                : 'text-gray-700'
                        }`}
                        onClick={() => setLoginMethod('phone')}
                    >
                        휴대전화로 로그인
                    </button>
                </div>

                {loginMethod === 'email' ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="이메일을 입력하세요"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <Button
                            type="submit"
                            className="h-11 w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                            disabled={loading}
                        >
                            {loading ? '로그인 중...' : '로그인'}
                        </Button>
                    </form>
                ) : (
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
                )}
            </div>
        </AuthScaffold>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/lib/api';
import { AuthScaffold } from '@/components/auth/AuthScaffold';

const RESEND_COOLDOWN_SECONDS = 60;

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneCode, setPhoneCode] = useState('');
    const [phoneOtpRequested, setPhoneOtpRequested] = useState(false);
    const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
    const [phoneNotice, setPhoneNotice] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
                'signup'
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
        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }
        if (!phoneOtpRequested || !phoneCode) {
            setError('휴대전화 인증을 완료해주세요.');
            return;
        }
        setLoading(true);

        try {
            await authAPI.signup(
                email,
                password,
                'Passenger',
                name.trim() || undefined,
                phoneNumber,
                phoneCode
            );
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '회원가입에 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthScaffold title="회원가입">
            <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
                <p className="mb-6 text-sm text-gray-500">
                    승객용 회원가입 페이지입니다.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">이름</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="이름"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">이메일</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="이메일"
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
                            minLength={6}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">휴대전화 번호</Label>
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
                                      : '인증 요청'}
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
                                placeholder="4자리 인증번호"
                                inputMode="numeric"
                                required
                            />
                        </div>
                    )}

                    {phoneNotice && (
                        <p className="text-sm text-gray-500">{phoneNotice}</p>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <Button
                        type="submit"
                        className="h-11 w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                        disabled={loading}
                    >
                        {loading ? '계정 생성 중...' : '회원가입'}
                    </Button>
                </form>
            </div>
        </AuthScaffold>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/lib/api';
import { AuthScaffold } from '@/components/auth/AuthScaffold';

export default function LoginPage() {
    const router = useRouter();
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

    const handlePhoneRequest = () => {
        alert('아직 기능 구현 전입니다.');
    };

    return (
        <AuthScaffold title="로그인">
            <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
                <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-gray-100 p-1">
                    <button
                        type="button"
                        className={`rounded-full px-3 py-2 text-sm font-semibold ${
                            loginMethod === 'email'
                                ? 'bg-[#e08030] text-white'
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
                                ? 'bg-[#e08030] text-white'
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
                            className="h-11 w-full bg-[#e08030] hover:bg-[#d07526]"
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
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="연락받으실 휴대전화번호"
                                />
                                <Button
                                    type="button"
                                    className="whitespace-nowrap bg-[#e08030] hover:bg-[#d07526]"
                                    onClick={handlePhoneRequest}
                                >
                                    인증 요청
                                </Button>
                            </div>
                        </div>
                        <Button
                            type="button"
                            className="h-11 w-full bg-[#e08030] hover:bg-[#d07526]"
                            onClick={handlePhoneRequest}
                        >
                            로그인
                        </Button>
                    </div>
                )}
            </div>
        </AuthScaffold>
    );
}

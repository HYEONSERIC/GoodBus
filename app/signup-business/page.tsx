'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { authAPI } from '@/lib/api';

export default function SignupBusinessPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accountType, setAccountType] = useState<'Driver' | 'BusCompany'>(
        'Driver'
    );
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authAPI.signup(
                email,
                password,
                accountType,
                name.trim() || undefined
            );
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
                <p className="mb-6 text-sm text-gray-500">
                    인증 연동 전까지는 이메일 기반으로 가입합니다.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">이름</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="이름 입력"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">이메일</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="이메일 입력"
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
                        <Label>가입 유형</Label>
                        <select
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            value={accountType}
                            onChange={(e) =>
                                setAccountType(e.target.value as 'Driver' | 'BusCompany')
                            }
                        >
                            <option value="Driver">버스 기사</option>
                            <option value="BusCompany">버스 회사</option>
                        </select>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <Button
                        type="submit"
                        className="h-11 w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                        disabled={loading}
                    >
                        {loading ? '가입 중...' : '가입하기'}
                    </Button>
                </form>
            </div>
        </AuthScaffold>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/lib/api';
import { AuthScaffold } from '@/components/auth/AuthScaffold';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authAPI.login(email, password);
            router.push('/admin');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '로그인에 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthScaffold title="관리자 로그인" hideHeader>
            <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
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
            </div>
        </AuthScaffold>
    );
}

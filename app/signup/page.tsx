'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { authAPI } from '@/lib/api';

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'Passenger' | 'Driver' | 'BusCompany'>(
        'Passenger'
    );
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authAPI.signup(email, password, role);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>계정 만들기</CardTitle>
                    <CardDescription>굿버스에 가입하세요</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                minLength={6}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>계정 유형</Label>
                            <RadioGroup
                                value={role}
                                onValueChange={(value) => setRole(value as any)}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Passenger" id="r1" />
                                    <Label
                                        htmlFor="r1"
                                        className="cursor-pointer"
                                    >
                                        여행객
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Driver" id="r2" />
                                    <Label
                                        htmlFor="r2"
                                        className="cursor-pointer"
                                    >
                                        기사
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                        value="BusCompany"
                                        id="r3"
                                    />
                                    <Label
                                        htmlFor="r3"
                                        className="cursor-pointer"
                                    >
                                        버스 회사
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? '계정 생성 중...' : '회원가입'}
                        </Button>

                        <p className="text-sm text-center text-gray-600">
                            이미 계정이 있으신가요?{' '}
                            <a
                                href="/login"
                                className="text-blue-600 hover:underline"
                            >
                                로그인
                            </a>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

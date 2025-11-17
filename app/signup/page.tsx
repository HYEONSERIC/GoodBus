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
                    <CardTitle>Create Account</CardTitle>
                    <CardDescription>Join GoodBus</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
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
                            <Label>Account Type</Label>
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
                                        Passenger
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Driver" id="r2" />
                                    <Label
                                        htmlFor="r2"
                                        className="cursor-pointer"
                                    >
                                        Driver
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
                                        Bus Company
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
                            {loading ? 'Creating account...' : 'Sign up'}
                        </Button>

                        <p className="text-sm text-center text-gray-600">
                            Already have an account?{' '}
                            <a
                                href="/login"
                                className="text-blue-600 hover:underline"
                            >
                                Login
                            </a>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

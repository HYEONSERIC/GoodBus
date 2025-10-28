import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-12 px-16 py-32 text-center">
                <div className="flex flex-col items-center gap-6">
                    <h1 className="text-5xl font-bold text-gray-900">굿버스</h1>
                    <p className="max-w-md text-xl text-gray-600">
                        여행객과 버스 기사/회사를 연결하는 맞춤형 버스 대여
                        플랫폼
                    </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                    <Link href="/signup">
                        <Button size="lg" className="w-full sm:w-auto">
                            회원가입
                        </Button>
                    </Link>
                    <Link href="/login">
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            로그인
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}

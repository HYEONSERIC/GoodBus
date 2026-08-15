import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg">
                        <Image
                            src="/pic/로고.png"
                            alt="버스대절 로고"
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                        />
                    </span>
                    <span className="text-lg font-bold tracking-tight text-stone-900">
                        버스대절
                    </span>
                </Link>
                <nav className="flex items-center gap-7 text-sm font-medium text-stone-600">
                    <Link
                        href="/signup"
                        className="hidden transition-colors hover:text-stone-900 sm:inline"
                    >
                        회원가입
                    </Link>
                    <Link
                        href="/signup-business"
                        className="hidden transition-colors hover:text-stone-900 sm:inline"
                    >
                        버스/회사 가입
                    </Link>
                    <Button
                        asChild
                        className="rounded-full bg-[#2563eb] px-5 text-white shadow-sm hover:bg-[#1d4ed8]"
                    >
                        <Link href="/login">로그인</Link>
                    </Button>
                </nav>
            </div>
        </header>
    );
}

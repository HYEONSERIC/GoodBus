'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

interface AuthScaffoldProps {
    title: string;
    children: ReactNode;
    hideHeader?: boolean;
}

export function AuthScaffold({ title, children, hideHeader }: AuthScaffoldProps) {
    return (
        <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
            {!hideHeader && (
                <header className="h-16 border-b bg-white">
                    <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-xl font-bold text-[#2563eb]"
                        >
                            <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg">
                                <Image
                                    src="/pic/로고.png"
                                    alt="버스대절 로고"
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                />
                            </span>
                            버스대절
                        </Link>
                        <nav className="flex items-center gap-6 text-sm font-semibold text-gray-800">
                            <Link href="/signup" className="hover:text-black">
                                회원가입
                            </Link>
                            <Link href="/signup-business" className="hover:text-black">
                                버스/회사 가입
                            </Link>
                            <Link
                                href="/login"
                                className="rounded-full bg-[#2563eb] px-4 py-2 text-white"
                            >
                                로그인
                            </Link>
                        </nav>
                    </div>
                </header>
            )}

            <main className="flex-1 px-4 py-14">
                <div className="mx-auto w-full max-w-5xl">
                    <h1 className="mb-10 text-center text-5xl font-bold tracking-tight">
                        {title}
                    </h1>
                    {children}
                </div>
            </main>
        </div>
    );
}

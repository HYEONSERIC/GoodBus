'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface AuthScaffoldProps {
    title: string;
    children: ReactNode;
}

export function AuthScaffold({ title, children }: AuthScaffoldProps) {
    return (
        <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
            <header className="h-16 border-b bg-white">
                <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6">
                    <Link href="/" className="text-xl font-bold text-[#e08030]">
                        GoodBus
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
                            className="rounded-full bg-[#e08030] px-4 py-2 text-white"
                        >
                            로그인
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1 px-4 py-14">
                <div className="mx-auto w-full max-w-5xl">
                    <h1 className="mb-10 text-center text-5xl font-bold tracking-tight">
                        {title}
                    </h1>
                    {children}
                </div>
            </main>

            <footer className="border-t bg-white">
                <div className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-8 text-sm text-gray-600 md:grid-cols-3">
                    <div className="space-y-1">
                        <p className="font-semibold text-gray-900">고객센터</p>
                        <p className="text-xl font-bold text-gray-900">1599-6162</p>
                        <p>B2B문의 bizonly@allbus.kr</p>
                    </div>
                    <div className="space-y-1">
                        <p>평일 오전 9시 - 오후 6시</p>
                        <p>점심시간 12시 - 1시</p>
                        <p>주말/공휴일 휴무</p>
                    </div>
                    <div className="space-y-1">
                        <p>자주 묻는 질문 · 제휴문의 · 이용약관</p>
                        <p>개인정보처리방침</p>
                        <p className="text-xs text-gray-500">
                            이메일 인증/휴대폰 인증 기능은 추후 연동 예정입니다.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

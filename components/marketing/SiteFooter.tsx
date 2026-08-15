'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, Clock3, Mail, MapPin, Phone } from 'lucide-react';

const companyLinks = [
    { href: '/company', label: '회사소개' },
    { href: '/location', label: '오시는길' },
];

const legalLinks = [
    { href: '/legal/terms', label: '이용약관' },
    { href: '/legal/privacy', label: '개인정보처리방침' },
];

function FooterLink({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            className="block w-fit text-stone-500 transition-colors hover:text-[#2563eb] focus-visible:outline-none focus-visible:text-[#2563eb]"
        >
            {label}
        </Link>
    );
}

export function SiteFooter() {
    return (
        <footer className="border-t border-stone-200 bg-white">
            <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 text-sm sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
                <div className="space-y-3">
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
                    <p className="max-w-xs leading-relaxed text-stone-500">
                        실시간 입찰로 비교하고 확정하는 버스 대절 플랫폼입니다.
                    </p>
                </div>

                <div className="space-y-3">
                    <p className="font-semibold text-stone-900">고객센터</p>
                    <div className="space-y-2">
                        <a
                            href="tel:1666-0533"
                            className="flex items-center gap-2 text-xl font-bold text-stone-900 transition-colors hover:text-[#2563eb]"
                        >
                            <Phone className="size-4 shrink-0 text-[#2563eb]" />
                            1666-0533
                        </a>
                        <p className="flex items-center gap-2 text-stone-500">
                            <Phone className="size-4 shrink-0 text-transparent" />
                            053-255-0533
                        </p>
                        <a
                            href="mailto:choiuoz@naver.com"
                            className="flex items-center gap-2 text-stone-500 transition-colors hover:text-[#2563eb]"
                        >
                            <Mail className="size-4 shrink-0" />
                            choiuoz@naver.com
                        </a>
                    </div>
                    <div className="flex items-start gap-2 pt-1 text-stone-500">
                        <Clock3 className="mt-0.5 size-4 shrink-0" />
                        <div className="space-y-0.5">
                            <p>평일 오전 9시 - 오후 6시</p>
                            <p>점심시간 12시 - 1시 · 주말/공휴일 휴무</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="font-semibold text-stone-900">회사</p>
                    <nav className="space-y-2">
                        {companyLinks.map((link) => (
                            <FooterLink key={link.href} {...link} />
                        ))}
                    </nav>
                </div>

                <div className="space-y-3">
                    <p className="font-semibold text-stone-900">약관 및 정책</p>
                    <nav className="space-y-2">
                        {legalLinks.map((link) => (
                            <FooterLink key={link.href} {...link} />
                        ))}
                    </nav>
                </div>
            </div>

            <div className="border-t border-stone-100">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1.5 text-xs leading-relaxed text-stone-400">
                        <p>
                            버스대절 주식회사 | 대표 최덕현 | 사업자등록번호
                            649-86-03636
                        </p>
                        <p className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" />
                            대구광역시 동구 신암남로 111, 상가동 1층 208호(신암동,
                            동대구역 엘크루 더센트럴)
                        </p>
                        <p className="pt-1">
                            © 2026 버스대절 주식회사. All rights reserved.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                        aria-label="맨 위로 이동"
                        className="flex size-11 shrink-0 cursor-pointer items-center justify-center self-end rounded-full border border-stone-200 text-stone-400 transition-colors hover:border-[#2563eb]/30 hover:bg-[#2563eb]/5 hover:text-[#2563eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/40"
                    >
                        <ArrowUp className="size-4" />
                    </button>
                </div>
            </div>
        </footer>
    );
}

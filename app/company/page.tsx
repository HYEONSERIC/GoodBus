import type { Metadata } from 'next';
import { BadgeCheck, Handshake, ShieldCheck } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export const metadata: Metadata = {
    title: '회사소개',
    description:
        '실시간 입찰로 버스 대절을 비교하고 확정하는 버스대절 주식회사를 소개합니다.',
};

const values = [
    {
        icon: Handshake,
        title: '투명한 입찰',
        detail: '여러 기사·버스회사의 입찰가와 조건을 한눈에 비교할 수 있도록 정보를 투명하게 공개합니다.',
    },
    {
        icon: ShieldCheck,
        title: '신뢰할 수 있는 매칭',
        detail: '검증된 기사·버스회사만 입찰에 참여할 수 있도록 관리하여 안전한 이용 경험을 제공합니다.',
    },
    {
        icon: BadgeCheck,
        title: '합리적인 가격',
        detail: '실시간 입찰 구조로 불필요한 중개 비용을 줄이고 합리적인 가격에 버스를 대절할 수 있도록 돕습니다.',
    },
];

export default function CompanyPage() {
    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <SiteHeader />

            <main>
                <section className="border-b border-stone-200 bg-white">
                    <div className="mx-auto w-full max-w-3xl px-6 py-16">
                        <p className="text-sm font-semibold text-[#2563eb]">
                            회사소개
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
                            버스 대절, 비교가 아니라 입찰로
                        </h1>
                        <p className="mt-4 leading-relaxed text-stone-600">
                            버스대절 주식회사는 여정을 등록하면 여러 기사·버스회사가 직접
                            입찰가와 조건을 제안하는 실시간 입찰 기반 버스 대절 플랫폼을
                            운영합니다. 견적을 일일이 비교하며 연락을 돌리지 않아도, 등록한
                            여정에 맞는 제안을 한 곳에서 비교하고 가장 합리적인 조건을
                            선택할 수 있도록 돕습니다.
                        </p>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-3xl px-6 py-16">
                    <h2 className="text-xl font-bold text-stone-900">
                        우리가 중요하게 생각하는 것
                    </h2>
                    <div className="mt-8 grid gap-8 sm:grid-cols-3">
                        {values.map(({ icon: Icon, title, detail }) => (
                            <div key={title} className="space-y-2">
                                <span className="flex size-10 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb]">
                                    <Icon className="size-5" />
                                </span>
                                <p className="font-semibold text-stone-900">{title}</p>
                                <p className="text-sm leading-relaxed text-stone-500">
                                    {detail}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="border-t border-stone-200 bg-white">
                    <div className="mx-auto w-full max-w-3xl px-6 py-16">
                        <h2 className="text-xl font-bold text-stone-900">
                            회사 개요
                        </h2>
                        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-stone-400">법인명</dt>
                                <dd className="mt-1 font-medium text-stone-900">
                                    버스대절 주식회사
                                </dd>
                            </div>
                            <div>
                                <dt className="text-stone-400">대표자</dt>
                                <dd className="mt-1 font-medium text-stone-900">최덕현</dd>
                            </div>
                            <div>
                                <dt className="text-stone-400">설립일</dt>
                                <dd className="mt-1 font-medium text-stone-900">
                                    2026년 7월 30일
                                </dd>
                            </div>
                            <div>
                                <dt className="text-stone-400">사업자등록번호</dt>
                                <dd className="mt-1 font-medium text-stone-900">
                                    649-86-03636
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-stone-400">주소</dt>
                                <dd className="mt-1 font-medium text-stone-900">
                                    대구광역시 동구 신암남로 111, 상가동 1층 208호(신암동,
                                    동대구역 엘크루 더센트럴)
                                </dd>
                            </div>
                        </dl>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}

import type { Metadata } from 'next';
import { MapPin, TrainFront } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export const metadata: Metadata = {
    title: '오시는길',
    description: '버스대절 주식회사 본사 주소와 오시는 방법을 안내합니다.',
};

const ADDRESS =
    '대구광역시 동구 신암남로 111, 상가동 1층 208호(신암동, 동대구역 엘크루 더센트럴)';

export default function LocationPage() {
    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <SiteHeader />

            <main>
                <section className="border-b border-stone-200 bg-white">
                    <div className="mx-auto w-full max-w-3xl px-6 py-16">
                        <p className="text-sm font-semibold text-[#2563eb]">
                            오시는길
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
                            버스대절 본사
                        </h1>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-3xl px-6 py-16">
                    <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 size-5 shrink-0 text-[#2563eb]" />
                        <div>
                            <p className="font-medium text-stone-900">{ADDRESS}</p>
                            <a
                                href={`https://map.kakao.com/link/search/${encodeURIComponent(
                                    ADDRESS,
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-sm font-medium text-[#2563eb] hover:underline"
                            >
                                카카오맵에서 길찾기
                            </a>
                        </div>
                    </div>

                    <div className="mt-6 flex items-start gap-3">
                        <TrainFront className="mt-0.5 size-5 shrink-0 text-[#2563eb]" />
                        <p className="text-sm leading-relaxed text-stone-600">
                            동대구역 인근 건물(엘크루 더센트럴)에 위치해 있습니다.
                        </p>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}

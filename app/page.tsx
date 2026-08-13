import Link from 'next/link';
import {
    ArrowRight,
    BadgeCheck,
    Bus,
    BusFront,
    Car,
    CheckCircle2,
    ClipboardList,
    Handshake,
    Route,
    Timer,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const vehicleTypes = [
    {
        icon: Bus,
        name: '대형버스',
        detail: '45인 · 장거리 단체 이동 추천',
    },
    {
        icon: BusFront,
        name: '우등버스',
        detail: '28인 · 편안한 좌석 중심 이동',
    },
    {
        icon: Car,
        name: '미니버스·밴',
        detail: '18인 · 소규모 맞춤 이동 추천',
    },
];

const steps = [
    {
        icon: ClipboardList,
        title: '여정 등록',
        detail: '출발지, 목적지, 일정과 인원을 입력해 견적 요청을 등록합니다.',
    },
    {
        icon: Handshake,
        title: '입찰 비교',
        detail: '여러 기사·버스회사가 남긴 입찰가와 조건을 한눈에 비교합니다.',
    },
    {
        icon: CheckCircle2,
        title: '확정 및 이용',
        detail: '가장 마음에 드는 제안을 선택하고 예약을 확정합니다.',
    },
];

export default function Home() {
    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-[#2563eb] text-white">
                            <Bus className="size-4.5" strokeWidth={2.25} />
                        </span>
                        <span className="text-lg font-bold tracking-tight text-stone-900">
                            GoodBus
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

            <main>
                <section className="relative overflow-hidden bg-[#0e1119]">
                    <video
                        aria-hidden
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
                    >
                        <source src="/videos/영상.mp4" type="video/mp4" />
                    </video>
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-r from-[#0e1119]/95 via-[#0e1119]/75 to-[#0e1119]/35"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-[#0e1119]/60 via-transparent to-transparent"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-50 to-transparent md:h-36"
                    />

                    <div className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-24 sm:pt-20 sm:pb-28 md:pt-36 md:pb-44">
                        <div className="max-w-xl">
                            <Badge className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                                실시간 입찰 기반 버스 대절
                            </Badge>
                            <h1 className="mt-6 text-3xl leading-[1.2] font-extrabold tracking-tight text-balance text-white sm:text-4xl sm:leading-[1.15] md:text-5xl">
                                버스 대절, 비교가 아니라
                                <br />
                                <span className="text-[#2563eb]">입찰</span>로 결정하세요
                            </h1>
                            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 sm:mt-6 md:text-lg">
                                여정 정보를 등록하면 여러 기사와 버스회사가 직접 가격을
                                제안합니다. 가장 좋은 조건을 골라 확정하세요.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-12 w-full rounded-full bg-[#2563eb] px-7 text-base text-white shadow-sm shadow-[#2563eb]/25 hover:bg-[#1d4ed8] sm:w-auto"
                                >
                                    <Link href="/signup">
                                        무료로 여정 등록하기
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="h-12 w-full rounded-full border-white/30 bg-white/5 px-7 text-base text-white hover:bg-white/15 sm:w-auto"
                                >
                                    <Link href="/signup-business">버스·회사 파트너 가입</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-20 md:pt-20">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {vehicleTypes.map((vehicle) => (
                            <div
                                key={vehicle.name}
                                className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                            >
                                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff1e6] to-[#ffe0c2] text-[#1e40af]">
                                    <vehicle.icon className="size-5.5" strokeWidth={2} />
                                </span>
                                <p className="mt-4 text-xl font-bold text-stone-900">
                                    {vehicle.name}
                                </p>
                                <p className="mt-1 text-sm text-stone-500">
                                    {vehicle.detail}
                                </p>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-5 h-9 w-full rounded-xl border-stone-200 text-sm font-medium text-stone-700 group-hover:border-[#2563eb]/40 group-hover:text-[#1e40af]"
                                >
                                    <Link href="/signup">
                                        가격비교
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="border-y border-stone-200 bg-white">
                    <div className="mx-auto w-full max-w-6xl px-6 py-16">
                        <div className="text-center">
                            <p className="text-sm font-semibold text-[#1e40af]">
                                이용 방법
                            </p>
                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
                                세 단계면 충분합니다
                            </h2>
                        </div>
                        <div className="relative mt-12 grid gap-8 md:grid-cols-3">
                            <div
                                aria-hidden
                                className="absolute top-6 right-0 left-0 hidden h-px bg-stone-200 md:block"
                            />
                            {steps.map((step, index) => (
                                <div
                                    key={step.title}
                                    className="relative flex flex-col items-center text-center md:items-start md:text-left"
                                >
                                    <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-[#2563eb] shadow-sm">
                                        <step.icon className="size-5.5" strokeWidth={2} />
                                    </span>
                                    <p className="mt-4 text-xs font-semibold text-stone-400">
                                        STEP {index + 1}
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-stone-900">
                                        {step.title}
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed text-stone-500">
                                        {step.detail}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-6xl px-6 py-20">
                    <div className="max-w-xl">
                        <h2 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
                            GoodBus를 선택하는 이유
                        </h2>
                        <p className="mt-3 text-stone-500">
                            가격만 비교하지 않습니다. 검증된 파트너와 투명한 절차까지
                            함께 확인하세요.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#1b2130] to-[#0e1119] p-7 text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg md:col-span-2 md:row-span-2">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-[#2563eb]">
                                <BadgeCheck className="size-5.5" strokeWidth={2} />
                            </span>
                            <div className="mt-6">
                                <p className="text-lg font-bold">
                                    서류로 검증된 기사·회사
                                </p>
                                <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">
                                    기사와 버스회사는 등록 시 면허증·사업자등록증 심사를
                                    거칩니다. 관리자 콘솔이 인증 상태를 실시간으로
                                    관리합니다.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff1e6] to-[#ffe0c2] text-[#1e40af]">
                                <Timer className="size-5" strokeWidth={2} />
                            </span>
                            <p className="mt-4 font-semibold text-stone-900">빠른 비교</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                                요청 등록 후 여러 기사·회사의 제안을 한 번에 확인할 수
                                있습니다.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff1e6] to-[#ffe0c2] text-[#1e40af]">
                                <Users className="size-5" strokeWidth={2} />
                            </span>
                            <p className="mt-4 font-semibold text-stone-900">
                                역할 기반 화면
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                                승객/기사/버스회사/관리자별로 필요한 기능만 직관적으로
                                제공합니다.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md md:col-start-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff1e6] to-[#ffe0c2] text-[#1e40af]">
                                <Route className="size-5" strokeWidth={2} />
                            </span>
                            <p className="mt-4 font-semibold text-stone-900">
                                다양한 차종
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                                대형·우등·미니버스까지, 인원과 목적에 맞게 선택할 수
                                있습니다.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-6xl px-6 pb-20">
                    <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b2130] to-[#0e1119] px-8 py-14 text-center shadow-xl sm:flex-row sm:justify-between sm:text-left">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_100%_0%,rgba(224,128,48,0.25),rgba(224,128,48,0))]"
                        />
                        <div className="relative">
                            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                                다음 여정, <span className="text-[#2563eb]">입찰</span>로
                                시작하세요
                            </h2>
                            <p className="mt-2 text-white/70">
                                가입은 무료이며, 몇 분이면 첫 여정을 등록하고 입찰을
                                받을 수 있습니다.
                            </p>
                        </div>
                        <Button
                            asChild
                            size="lg"
                            className="relative h-12 w-full shrink-0 rounded-full bg-[#2563eb] px-7 text-base text-white shadow-sm shadow-[#2563eb]/30 hover:bg-[#1d4ed8] sm:w-auto"
                        >
                            <Link href="/signup">
                                무료로 시작하기
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                </section>
            </main>

            <footer className="border-t border-stone-200 bg-white">
                <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 text-sm text-stone-500 md:grid-cols-3">
                    <div className="space-y-1.5">
                        <p className="font-semibold text-stone-900">고객센터</p>
                        <p className="text-xl font-bold text-stone-900">123-1234</p>
                        <p>B2B문의 choiuoz@naver.com</p>
                    </div>
                    <div className="space-y-1.5">
                        <p>평일 오전 9시 - 오후 6시</p>
                        <p>점심시간 12시 - 1시</p>
                        <p>주말/공휴일 휴무</p>
                    </div>
                    <div className="space-y-1.5">
                        <p>자주 묻는 질문 · 제휴문의 · 이용약관</p>
                        <p>개인정보처리방침</p>
                        <p className="pt-2 text-xs text-stone-400">
                            © 2026 GoodBus. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

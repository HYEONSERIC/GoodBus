import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
    return (
        <div className="min-h-screen bg-[#f3f3f5]">
            <header className="h-16 border-b bg-white">
                <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6">
                    <Link href="/" className="text-xl font-bold text-[#e85b4f]">
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
                            className="rounded-full bg-[#e85b4f] px-4 py-2 text-white"
                        >
                            로그인
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-6 py-16">
                <section className="rounded-3xl border bg-white px-8 py-14 text-center shadow-sm">
                    <p className="text-sm font-semibold text-[#e85b4f]">
                        버스 대절 비교 플랫폼
                    </p>
                    <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
                        원하는 일정에 맞는 버스를
                        <br />
                        쉽고 빠르게 찾아보세요
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-gray-600">
                        승객은 빠르게 견적을 받고, 기사/회사는 효율적으로 입찰합니다.
                        인증 기능은 순차적으로 고도화될 예정이며 현재는 이메일 기반
                        가입/로그인을 제공합니다.
                    </p>
                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        <div className="overflow-hidden rounded-2xl border bg-[#fff6f6] text-left shadow-sm">
                            <div className="p-5">
                                <p className="text-3xl leading-none">🚌</p>
                                <p className="mt-3 text-2xl font-bold text-[#b3261e]">
                                    대형버스
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                    45인 · 장거리 단체 이동 추천
                                </p>
                                <Button className="mt-4 h-9 bg-[#2f9bff] px-4 text-sm hover:bg-[#2487e4]">
                                    가격비교
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border bg-[#f3f9ff] text-left shadow-sm">
                            <div className="p-5">
                                <p className="text-3xl leading-none">🚐</p>
                                <p className="mt-3 text-2xl font-bold text-[#1e4d7b]">
                                    우등버스
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                    28인 · 편안한 좌석 중심 이동
                                </p>
                                <Button className="mt-4 h-9 bg-[#2f9bff] px-4 text-sm hover:bg-[#2487e4]">
                                    가격비교
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border bg-[#fffdf1] text-left shadow-sm">
                            <div className="p-5">
                                <p className="text-3xl leading-none">🚍</p>
                                <p className="mt-3 text-2xl font-bold text-[#6a5a1f]">
                                    미니버스·밴
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                    18인 · 소규모 맞춤 이동 추천
                                </p>
                                <Button className="mt-4 h-9 bg-[#2f9bff] px-4 text-sm hover:bg-[#2487e4]">
                                    가격비교
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <p className="text-sm text-gray-500">누적 비교 요청</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                            1,182,037건
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <p className="text-sm text-gray-500">등록 기사/회사</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                            11,978명
                        </p>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <p className="text-sm text-gray-500">고객 만족도</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">96%</p>
                    </div>
                </section>

                <section className="mt-8 rounded-3xl border bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900">
                        GoodBus를 선택하는 이유
                    </h2>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl bg-gray-50 p-5">
                            <p className="font-semibold text-gray-900">빠른 비교</p>
                            <p className="mt-2 text-sm text-gray-600">
                                요청 등록 후 여러 기사/회사의 제안을 한 번에 확인할 수
                                있습니다.
                            </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-5">
                            <p className="font-semibold text-gray-900">투명한 관리</p>
                            <p className="mt-2 text-sm text-gray-600">
                                관리자 콘솔에서 사용자, 입찰, 인증 상태를 체계적으로
                                관리합니다.
                            </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-5">
                            <p className="font-semibold text-gray-900">역할 기반 화면</p>
                            <p className="mt-2 text-sm text-gray-600">
                                승객/기사/버스회사/관리자별로 필요한 기능만 직관적으로
                                제공합니다.
                            </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-5">
                            <p className="font-semibold text-gray-900">확장 가능한 구조</p>
                            <p className="mt-2 text-sm text-gray-600">
                                휴대폰 인증, 이메일 인증, 결제 기능을 순차적으로 쉽게
                                확장할 수 있도록 설계되어 있습니다.
                            </p>
                        </div>
                    </div>
                </section>
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
                            © 2026 GoodBus. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

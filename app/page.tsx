import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="bg-yellow-400 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">goodbus</h1>
                    <div className="flex gap-4">
                        <Link href="/login" className="text-gray-900 hover:underline">
                            로그인
                        </Link>
                        <Link href="/signup" className="text-gray-900 hover:underline">
                            회원가입
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Hero Section */}
            <section className="bg-yellow-400 py-16 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                        70만 고객 후기 다 모았다.<br />
                        친절버스 골라주는 goodbus
                    </h2>

                    {/* Bus Type Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
                        {/* 대형버스 */}
                        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                            <CardContent className="p-6">
                                <div className="w-full h-32 bg-red-500 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                    {/* 버스 본체 */}
                                    <div className="absolute w-24 h-16 bg-white rounded-t-lg"></div>
                                    {/* 버스 창문들 */}
                                    <div className="absolute left-2 top-2 w-4 h-4 bg-blue-300 rounded"></div>
                                    <div className="absolute left-8 top-2 w-4 h-4 bg-blue-300 rounded"></div>
                                    <div className="absolute left-14 top-2 w-4 h-4 bg-blue-300 rounded"></div>
                                    <div className="absolute left-20 top-2 w-4 h-4 bg-blue-300 rounded"></div>
                                    {/* 버스 바퀴 */}
                                    <div className="absolute bottom-0 left-4 w-6 h-6 bg-gray-800 rounded-full"></div>
                                    <div className="absolute bottom-0 right-4 w-6 h-6 bg-gray-800 rounded-full"></div>
                                    {/* 버스 앞부분 */}
                                    <div className="absolute left-0 top-4 w-8 h-12 bg-red-600 rounded-l-lg"></div>
                                </div>
                                <h3 className="text-xl font-bold mb-2">대형버스</h3>
                                <p className="text-gray-600 mb-4">45인 14만원~</p>
                            </CardContent>
                        </Card>

                        {/* 우등버스 */}
                        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                            <CardContent className="p-6">
                                <div className="w-full h-32 bg-blue-500 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                    {/* 버스 본체 */}
                                    <div className="absolute w-20 h-14 bg-white rounded-t-lg"></div>
                                    {/* 버스 창문들 */}
                                    <div className="absolute left-2 top-2 w-3 h-3 bg-blue-300 rounded"></div>
                                    <div className="absolute left-7 top-2 w-3 h-3 bg-blue-300 rounded"></div>
                                    <div className="absolute left-12 top-2 w-3 h-3 bg-blue-300 rounded"></div>
                                    {/* 버스 바퀴 */}
                                    <div className="absolute bottom-0 left-5 w-5 h-5 bg-gray-800 rounded-full"></div>
                                    <div className="absolute bottom-0 right-5 w-5 h-5 bg-gray-800 rounded-full"></div>
                                    {/* 버스 앞부분 */}
                                    <div className="absolute left-0 top-3 w-6 h-10 bg-blue-600 rounded-l-lg"></div>
                                </div>
                                <h3 className="text-xl font-bold mb-2">우등버스</h3>
                                <p className="text-gray-600 mb-4">28인 17만원~</p>
                            </CardContent>
                        </Card>

                        {/* 미니버스 */}
                        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                            <CardContent className="p-6">
                                <div className="w-full h-32 bg-yellow-500 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                    {/* 버스 본체 */}
                                    <div className="absolute w-16 h-12 bg-white rounded-t-lg"></div>
                                    {/* 버스 창문들 */}
                                    <div className="absolute left-2 top-2 w-3 h-3 bg-blue-300 rounded"></div>
                                    <div className="absolute left-7 top-2 w-3 h-3 bg-blue-300 rounded"></div>
                                    {/* 버스 바퀴 */}
                                    <div className="absolute bottom-0 left-4 w-4 h-4 bg-gray-800 rounded-full"></div>
                                    <div className="absolute bottom-0 right-4 w-4 h-4 bg-gray-800 rounded-full"></div>
                                    {/* 버스 앞부분 */}
                                    <div className="absolute left-0 top-2 w-5 h-8 bg-yellow-600 rounded-l-lg"></div>
                                </div>
                                <h3 className="text-xl font-bold mb-2">미니버스·밴</h3>
                                <p className="text-gray-600 mb-4">18인 10만원~</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Service Benefits */}
                    <div className="mt-12 max-w-3xl mx-auto text-left space-y-2 text-gray-700">
                        <p>• 70만명이 가격비교를 진행했습니다.</p>
                        <p>• 예약한 고객님 96%가 만족했습니다.</p>
                        <p>• goodbus는 시중가보다 23% 저렴합니다.</p>
                    </div>

                    <div className="mt-8">
                        <p className="text-gray-700">
                            기사님이신가요? <Link href="/signup" className="underline font-semibold">가입하고 오더 확인 &gt;</Link>
                        </p>
                    </div>
                </div>
            </section>

            {/* Statistics Section */}
            <section className="bg-white py-16 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-12">
                        버스대절 1위 <span className="underline decoration-yellow-400">goodbus!</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <p className="text-4xl md:text-5xl font-bold mb-2">1,182,037건</p>
                            <p className="text-gray-600">대절 주문 수</p>
                        </div>
                        <div>
                            <p className="text-4xl md:text-5xl font-bold mb-2">3.1조원</p>
                            <p className="text-gray-600">누적 주문 금액</p>
                        </div>
                        <div>
                            <p className="text-4xl md:text-5xl font-bold mb-2">11,978명</p>
                            <p className="text-gray-600">활동 기사</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-8">2025년 1월 기준</p>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-white py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* 안전한 여정 */}
                        <Card className="border-2">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">🛡️</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">안전한 여정</h3>
                                        <p className="text-gray-600 text-sm">
                                            소속 확인된 기사님이 안전하게 모십니다. goodbus의 모든 차량은 보험에 가입돼 있습니다. 자체 평점 시스템으로 서비스 품질을 관리합니다.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 합리적 가격 */}
                        <Card className="border-2">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">₩</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">합리적 가격</h3>
                                        <p className="text-gray-600 text-sm">
                                            경쟁 입찰 방식으로 최저가를 보장합니다. 예약 보증 시스템으로 운행 당일까지 꼼꼼히 신경써서 버스를 연결해 드립니다.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 간편한 예약 */}
                        <Card className="border-2">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">📅</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">간편한 예약</h3>
                                        <p className="text-gray-600 text-sm">
                                            견적 신청 5분 후 평균 5개의 견적이 올라옵니다. 실제 차량 사진과 평점으로 한눈에 비교하세요. 여기저기 전화하지 말고 예약까지 한번에 끝!
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 셔틀버스 */}
                        <Card className="border-2">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">🚌</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">셔틀버스도 goodbus!</h3>
                                        <p className="text-gray-600 text-sm">
                                            통근통학버스는 업체의 신뢰성이 가장 중요합니다. 함께 제공되는 실시간 셔틀 위치확인 앱으로 안심할 수 있습니다. 국내 1위 goodbus에 맡겨주세요.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <section className="bg-gray-50 py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-4">고객님들의 리얼후기</h2>
                    <p className="text-gray-600 mb-6">
                        goodbus 고객 100명 중 92명이 서비스에 만족한다고 후기를 남겼습니다.
                    </p>
                    <div className="flex gap-1 mb-8">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-yellow-400 text-2xl">★</span>
                        ))}
                    </div>

                    {/* Review Categories */}
                    <div className="flex gap-4 mb-8 flex-wrap">
                        <button className="px-4 py-2 bg-yellow-400 text-gray-900 font-semibold rounded">
                            통근통학
                        </button>
                        <button className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 rounded">
                            결혼식
                        </button>
                        <button className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 rounded">
                            기업행사
                        </button>
                        <button className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 rounded">
                            대학MT
                        </button>
                        <button className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 rounded">
                            단체관광
                        </button>
                    </div>

                    {/* Sample Review */}
                    <Card className="bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold">박태철 고객님</span>
                                    </div>
                                    <p className="text-gray-700">
                                        회사 단체 통근용으로 이용했습니다. 우선 가격이 좋았고, 처음부터 친절하게 응대해주셔서 신뢰가 갔습니다. 또한 매일 통근 시간에 지각 없이 매우 일찍 도착해서 기다려주셨고, 정기적으로 상태 확인도 해주셔서 사용하기 편했습니다. 가끔 더 큰 버스가 와서 놀랐는데 그 부분도 좋았습니다. 다른 팀에서도 앞으로 이용할 일이 있으면 꼭 추천하겠습니다. ^^
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-white py-16 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-8">고객님도 기사님도 모바일 앱으로 간편하게</h2>
                    <div className="flex justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg" className="bg-black text-white hover:bg-gray-800">
                                <span className="mr-2">📱</span>
                                App Store에서 다운로드 하기
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-100 py-8 px-6 text-center text-gray-600 text-sm">
                <p>© 2025 goodbus. All rights reserved.</p>
            </footer>
        </div>
    );
}

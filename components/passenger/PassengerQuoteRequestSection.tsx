'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export function PassengerQuoteRequestSection({
    onOpenCreate,
}: {
    onOpenCreate: () => void;
}) {
    return (
        <>
            <Card className="rounded-none border-gray-200 shadow-sm">
                <CardHeader className="pb-3 text-center">
                    <CardTitle className="text-[17px] font-semibold tracking-tight">
                        굿버스에서 가격비교 하고 적립금도 받아가세요.
                    </CardTitle>
                    <CardDescription className="text-sm">
                        원하는 여정을 등록하면 기사/업체가 입찰을 제안합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button
                        onClick={onOpenCreate}
                        className="h-10 rounded-xl bg-black px-6 text-sm font-medium text-white hover:bg-black/90"
                    >
                        견적 등록하기
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-3 divide-x divide-gray-200 overflow-hidden rounded-none border border-gray-200 bg-white">
                <Card className="rounded-none border-0 shadow-none gap-0.5 bg-white py-2">
                    <CardHeader className="px-2 gap-0 text-center">
                        <CardTitle className="text-xs text-gray-400 text-center">
                            회원등급
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pt-0 text-xs text-center text-gray-400">
                        준비중
                    </CardContent>
                </Card>
                <Card className="rounded-none border-0 shadow-none gap-0.5 bg-white py-2">
                    <CardHeader className="px-2 gap-0 text-center">
                        <CardTitle className="text-xs text-gray-400 text-center">
                            적립금
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pt-0 text-xs text-center text-gray-400">
                        준비중
                    </CardContent>
                </Card>
                <Card className="rounded-none border-0 shadow-none gap-0.5 bg-white py-2">
                    <CardHeader className="px-2 gap-0 text-center">
                        <CardTitle className="text-xs text-gray-400 text-center">
                            추천 혜택
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pt-0 text-xs text-center text-gray-400">
                        준비중
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

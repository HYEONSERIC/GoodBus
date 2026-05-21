'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BIDDER_MEMBERSHIP_PLANS } from '@/lib/membershipPlans';

export function MembershipPlansPanel() {
    const [openMembership, setOpenMembership] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold">콜버스 멤버십</h2>
                <p className="text-sm text-gray-600">뿌린대로 거두리라</p>
            </div>
            <div className="space-y-3">
                {BIDDER_MEMBERSHIP_PLANS.map((plan) => (
                    <div
                        key={plan.id}
                        className="rounded-lg border bg-white"
                    >
                        <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-3"
                            onClick={() =>
                                setOpenMembership(
                                    openMembership === plan.id
                                        ? null
                                        : plan.id,
                                )
                            }
                        >
                            <span className="font-semibold">{plan.name}</span>
                            <span className="text-sm text-gray-600">
                                {plan.price}
                            </span>
                        </button>
                        {openMembership === plan.id && (
                            <div className="space-y-3 border-t px-4 py-4">
                                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                                    {plan.features.map((feature) => (
                                        <li key={feature}>{feature}</li>
                                    ))}
                                </ul>
                                <Button
                                    className="w-full"
                                    onClick={() =>
                                        alert('결제 기능 구현 전입니다.')
                                    }
                                >
                                    멤버십 선택
                                </Button>
                                <p className="text-center text-xs text-gray-500">
                                    월 정기결제 상품이며 언제든 취소 가능합니다.
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

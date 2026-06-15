'use client';

import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    defaultExtendedBidForm,
    OPEN_TRIP_BID_ADDON_ROWS,
    type BidProfileForm,
    type ExtendedBidForm,
} from '@/lib/openTripBidForm';

export function OpenTripBidFormBody({
    extendedBid,
    setExtendedBid,
    profileForm,
    bidPhotoUrls,
    onBidPhotosPicked,
    removeBidPhoto,
}: {
    extendedBid: ExtendedBidForm;
    setExtendedBid: React.Dispatch<React.SetStateAction<ExtendedBidForm>>;
    profileForm: BidProfileForm;
    bidPhotoUrls: string[];
    onBidPhotosPicked: (e: ChangeEvent<HTMLInputElement>) => void;
    removeBidPhoto: (slot: number) => void;
}) {
    return (
        <>
                    <div className="space-y-2 border-b border-gray-100 py-4">
                        <Label className="text-sm font-semibold">
                            입찰가 (부가세 제외)
                        </Label>
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="flex min-w-[140px] flex-1 items-center gap-1 border-b border-gray-300 pb-1">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="1대당 가격"
                                    className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                                    value={
                                        extendedBid.priceManwon
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                priceManwon:
                                                    e
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                />
                                <span className="text-sm text-gray-600">
                                    만원
                                </span>
                            </div>
                            <div className="flex items-center gap-1 rounded border border-gray-300 bg-white px-1">
                                <button
                                    type="button"
                                    className="h-8 w-8 text-lg leading-none text-gray-600 hover:bg-gray-100"
                                    onClick={() =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                vehicleCount:
                                                    Math.max(
                                                        1,
                                                        p.vehicleCount -
                                                            1
                                                    ),
                                            })
                                        )
                                    }
                                >
                                    −
                                </button>
                                <span className="min-w-[2.5rem] text-center text-sm font-medium">
                                    {extendedBid.vehicleCount}{' '}
                                    대
                                </span>
                                <button
                                    type="button"
                                    className="h-8 w-8 text-lg leading-none text-gray-600 hover:bg-gray-100"
                                    onClick={() =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                vehicleCount:
                                                    p.vehicleCount +
                                                    1,
                                            })
                                        )
                                    }
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <p className="text-xs leading-relaxed text-red-600">
                            ⚠ 1대당 가격 입력 후 인원에
                            맞춰 차량 대수를
                            조정하세요. 낙찰 시 부가
                            서비스 수익은 협의에 따라
                            달라질 수 있습니다.
                        </p>
                    </div>

                    <div className="grid gap-3 border-b border-gray-100 py-4 sm:grid-cols-2">
                        <div>
                            <Label className="text-xs text-gray-600">
                                차종
                            </Label>
                            <select
                                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm"
                                value={
                                    extendedBid.vehicleChoice
                                }
                                onChange={(e) =>
                                    setExtendedBid(
                                        (p) => ({
                                            ...p,
                                            vehicleChoice:
                                                e.target
                                                    .value,
                                        })
                                    )
                                }
                            >
                                {[
                                    ...new Set([
                                        defaultExtendedBidForm(profileForm)
                                            .vehicleChoice,
                                        '대형버스 (45인승)',
                                        '우등버스 (28~33인승)',
                                        '미니버스·밴 (12~15인승)',
                                    ]),
                                ].map((opt) => (
                                    <option
                                        key={opt}
                                        value={opt}
                                    >
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs text-gray-600">
                                연식
                            </Label>
                            <select
                                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm"
                                value={
                                    extendedBid.vehicleYear
                                }
                                onChange={(e) =>
                                    setExtendedBid(
                                        (p) => ({
                                            ...p,
                                            vehicleYear:
                                                e.target
                                                    .value,
                                        })
                                    )
                                }
                            >
                                {Array.from(
                                    { length: 14 },
                                    (_, i) => 2016 + i
                                ).map((y) => (
                                    <option
                                        key={y}
                                        value={String(y)}
                                    >
                                        {y}년
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2 border-b border-gray-100 py-4">
                        <p className="text-sm font-semibold">
                            포함된 부대비용
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.toll
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                toll: e
                                                    .target
                                                    .checked,
                                            })
                                        )
                                    }
                                />
                                통행료
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.parking
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                parking:
                                                    e
                                                        .target
                                                        .checked,
                                            })
                                        )
                                    }
                                />
                                주차료
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.accommodation
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                accommodation:
                                                    e
                                                        .target
                                                        .checked,
                                            })
                                        )
                                    }
                                />
                                숙박비
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.meals
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                meals: e
                                                    .target
                                                    .checked,
                                            })
                                        )
                                    }
                                />
                                식사비
                            </label>
                        </div>
                    </div>

                    <div className="rounded border border-red-200 bg-red-50/50 p-3 text-xs leading-relaxed text-red-800">
                        <ul className="list-disc space-y-1 pl-4">
                            <li>
                                낙찰 시 플랫폼
                                수수료(예: 10%)가
                                정산에서 차감될 수
                                있습니다. 잔액·정산
                                조건을 확인해 주세요.
                            </li>
                            <li>
                                약속되지 않은 비용(봉사료
                                등)을 별도 요구할 경우
                                서비스 이용이 제한될 수
                                있습니다.
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-2 py-4">
                        <Label className="text-sm font-semibold">
                            고객님께 남기실 말씀
                        </Label>
                        <Textarea
                            rows={3}
                            placeholder="차량 사진은 프로필에서 확인하실 수 있다는 안내 등"
                            value={
                                extendedBid.customerMsg
                            }
                            onChange={(e) =>
                                setExtendedBid((p) => ({
                                    ...p,
                                    customerMsg:
                                        e.target.value,
                                }))
                            }
                            className="resize-none text-sm"
                        />
                    </div>

                    <div className="space-y-2 border-t border-gray-100 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                먼저 말걸기로 낙찰률 ↑
                            </span>
                            <Label className="text-sm font-semibold">
                                고객님께 먼저 말걸기
                            </Label>
                        </div>
                        <Textarea
                            rows={2}
                            placeholder="입찰 직후 고객에게 전달되는 한 마디입니다."
                            value={
                                extendedBid.proactiveMsg
                            }
                            onChange={(e) =>
                                setExtendedBid((p) => ({
                                    ...p,
                                    proactiveMsg:
                                        e.target.value,
                                }))
                            }
                            className="resize-none text-sm"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            id="bid-photo-input"
                            onChange={onBidPhotosPicked}
                        />
                        <div className="flex gap-2">
                            {[0, 1, 2].map((slot) => (
                                <div
                                    key={slot}
                                    className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-gray-300 bg-gray-50"
                                >
                                    {bidPhotoUrls[
                                        slot
                                    ] ? (
                                        <>
                                            <img
                                                alt=""
                                                src={
                                                    bidPhotoUrls[
                                                        slot
                                                    ]
                                                }
                                                className="size-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-xs text-white"
                                                onClick={() =>
                                                    removeBidPhoto(
                                                        slot
                                                    )
                                                }
                                            >
                                                −
                                            </button>
                                        </>
                                    ) : (
                                        <label
                                            htmlFor="bid-photo-input"
                                            className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 text-[10px] text-gray-500"
                                        >
                                            <span>
                                                📷
                                            </span>
                                            추가
                                        </label>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-100 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                            판매할 부가 서비스 (낙찰률
                            향상)
                        </p>
                        <div className="rounded border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
                            <ul className="list-disc space-y-1 pl-4">
                                <li>
                                    예약 이후 추가
                                    구매에 따른 불이익은
                                    없습니다.
                                </li>
                                <li>
                                    부가 서비스 제공 시
                                    낙찰 가능성이
                                    높아집니다.
                                </li>
                                <li>
                                    실제 제공 후
                                    정산되는 구조입니다
                                    (운영 정책에 따름).
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-3">
                            {OPEN_TRIP_BID_ADDON_ROWS.map((row) => (
                                <label
                                    key={row.key}
                                    className="flex cursor-pointer gap-2 border-b border-gray-100 pb-3 last:border-0"
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-1 size-4 rounded border-gray-300"
                                        disabled={
                                            extendedBid.addonOptOut
                                        }
                                        checked={
                                            extendedBid
                                                .addons[
                                                row.key
                                            ]
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setExtendedBid(
                                                (
                                                    p
                                                ) => ({
                                                    ...p,
                                                    addons:
                                                        {
                                                            ...p.addons,
                                                            [row.key]:
                                                                e
                                                                    .target
                                                                    .checked,
                                                        },
                                                })
                                            )
                                        }
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <span className="text-sm font-medium">
                                                {
                                                    row.title
                                                }
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {
                                                    row.price
                                                }
                                            </span>
                                        </div>
                                        <span className="mt-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">
                                            {row.tag} ·
                                            다수 선택
                                            가능
                                        </span>
                                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                                            {row.desc}
                                        </p>
                                    </div>
                                </label>
                            ))}
                            <label className="flex cursor-pointer gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    className="mt-1 size-4 rounded border-gray-300"
                                    checked={
                                        extendedBid.addonOptOut
                                    }
                                    onChange={(e) =>
                                        setExtendedBid(
                                            (p) => ({
                                                ...p,
                                                addonOptOut:
                                                    e
                                                        .target
                                                        .checked,
                                                addons: e
                                                    .target
                                                    .checked
                                                    ? {
                                                          water:
                                                              false,
                                                          dropoff:
                                                              false,
                                                          cleaning:
                                                              false,
                                                          escort:
                                                              false,
                                                      }
                                                    : p.addons,
                                            })
                                        )
                                    }
                                />
                                <span className="text-xs text-gray-700">
                                    부가 서비스 수익을
                                    포기하겠습니다
                                </span>
                            </label>
                        </div>
                    </div>

        </>
    );
}

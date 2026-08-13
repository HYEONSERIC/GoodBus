'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { PassengerTripFormApi } from '@/hooks/usePassengerTripForm';

export function PassengerTripCreateFlow({ tripForm }: { tripForm: PassengerTripFormApi }) {
  const {
    openDialog,
    closeDialog,
    newTrip,
    setNewTrip,
    stopoverOpen,
    setStopoverOpen,
    companionInfoOpen,
    setCompanionInfoOpen,
    companionInfoConfirmed,
    setCompanionInfoConfirmed,
    goingDateTimeRef,
    returnDateTimeRef,
    kakaoStatusMessage,
    originResults,
    setOriginResults,
    destinationResults,
    setDestinationResults,
    searchPlaces,
    createTrip,
    goingScheduleMin,
    returnScheduleMin,
  } = tripForm;
  return (
<>
<Dialog open={openDialog} onOpenChange={closeDialog}>
                    <DialogContent className="flex max-h-[min(92vh,760px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border border-gray-300 bg-white p-0 sm:max-w-lg [&>button]:top-3 [&>button]:right-4">
                        <DialogHeader className="sr-only">
                            <DialogTitle>여정 만들기</DialogTitle>
                            <DialogDescription>
                                여정 정보를 입력하세요
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3">
                            <button
                                type="button"
                                onClick={() => closeDialog(false)}
                                className="min-w-[4rem] text-left text-sm text-gray-700 hover:text-black"
                            >
                                &lt; 이전
                            </button>
                            <span className="text-base font-semibold">
                                견적 신청
                            </span>
                            <span className="min-w-[4rem]" />
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="scrollbar-none min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-5 pb-24 pt-4">
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>출발지</Label>
                                <Input
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 shadow-none focus-visible:border-gray-500 focus-visible:ring-0"
                                    placeholder="출발지를 입력하세요"
                                    value={newTrip.origin}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setNewTrip({
                                            ...newTrip,
                                            origin: value,
                                            originX: null,
                                            originY: null,
                                        });
                                        searchPlaces(value, setOriginResults);
                                    }}
                                />
                                {originResults.length > 0 && (
                                    <div className="mt-2 border rounded-md bg-white shadow-sm">
                                        {originResults.map((place) => (
                                            <button
                                                key={place.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                                onClick={() => {
                                                    const x = Number(place.x);
                                                    const y = Number(place.y);
                                                    setNewTrip({
                                                        ...newTrip,
                                                        origin:
                                                            place.road_address_name ||
                                                            place.address_name ||
                                                            place.place_name,
                                                        originX: Number.isFinite(x)
                                                            ? x
                                                            : null,
                                                        originY: Number.isFinite(y)
                                                            ? y
                                                            : null,
                                                    });
                                                    setOriginResults([]);
                                                }}
                                            >
                                                <div className="font-medium">
                                                    {place.place_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {place.road_address_name ||
                                                        place.address_name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>도착지</Label>
                                <Input
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 shadow-none focus-visible:border-gray-500 focus-visible:ring-0"
                                    placeholder="도착지를 입력하세요"
                                    value={newTrip.destination}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setNewTrip({
                                            ...newTrip,
                                            destination: value,
                                            destinationX: null,
                                            destinationY: null,
                                        });
                                        searchPlaces(
                                            value,
                                            setDestinationResults,
                                        );
                                    }}
                                />
                                {destinationResults.length > 0 && (
                                    <div className="mt-2 border rounded-md bg-white shadow-sm">
                                        {destinationResults.map((place) => (
                                            <button
                                                key={place.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                                onClick={() => {
                                                    const x = Number(place.x);
                                                    const y = Number(place.y);
                                                    setNewTrip({
                                                        ...newTrip,
                                                        destination:
                                                            place.road_address_name ||
                                                            place.address_name ||
                                                            place.place_name,
                                                        destinationX:
                                                            Number.isFinite(x)
                                                                ? x
                                                                : null,
                                                        destinationY:
                                                            Number.isFinite(y)
                                                                ? y
                                                                : null,
                                                    });
                                                    setDestinationResults([]);
                                                }}
                                            >
                                                <div className="font-medium">
                                                    {place.place_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {place.road_address_name ||
                                                        place.address_name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>날짜 및 시간</Label>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>운행 방식</Label>
                                        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-gray-300">
                                            <button
                                                type="button"
                                                className={`h-11 border-r border-gray-300 px-4 text-sm font-semibold transition ${
                                                    newTrip.tripType ===
                                                    'oneway'
                                                        ? 'bg-gray-200 text-gray-900'
                                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                                }`}
                                                onClick={() =>
                                                    setNewTrip({
                                                        ...newTrip,
                                                        tripType: 'oneway',
                                                    })
                                                }
                                            >
                                                편도
                                            </button>
                                            <button
                                                type="button"
                                                className={`h-11 px-4 text-sm font-semibold transition ${
                                                    newTrip.tripType ===
                                                    'round'
                                                        ? 'bg-gray-200 text-gray-900'
                                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                                }`}
                                                onClick={() =>
                                                    setNewTrip({
                                                        ...newTrip,
                                                        tripType: 'round',
                                                    })
                                                }
                                            >
                                                왕복
                                            </button>
                                        </div>
                                    </div>

                                    {newTrip.tripType === 'oneway' ? (
                                        <div className="space-y-2">
                                            <Label>가는날 시간</Label>
                                            <div className="relative">
                                                <Input
                                                    ref={goingDateTimeRef}
                                                    type="datetime-local"
                                                    min={goingScheduleMin}
                                                    value={newTrip.goingDateTime}
                                                    className={`peer h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 pr-10 text-sm shadow-none focus-visible:border-gray-500 focus-visible:ring-0 ${
                                                        !newTrip.goingDateTime
                                                            ? 'text-transparent'
                                                            : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (
                                                            goingDateTimeRef
                                                                .current
                                                                ?.showPicker
                                                        ) {
                                                            goingDateTimeRef.current.showPicker();
                                                            return;
                                                        }
                                                        goingDateTimeRef.current?.focus();
                                                    }}
                                                    onChange={(e) =>
                                                        setNewTrip({
                                                            ...newTrip,
                                                            goingDateTime:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                                {!newTrip.goingDateTime && (
                                                    <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-sm text-gray-500 peer-focus:hidden">
                                                        날짜를 선택하세요
                                                    </span>
                                                )}
                                            </div>

                                            {/* 편도일 때 경유지 버튼 */}
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    className="inline-flex h-7 items-center gap-1.5 px-0 text-xs font-medium text-gray-700 transition hover:text-black"
                                                    onClick={() => {
                                                        if (!stopoverOpen) {
                                                            setStopoverOpen(
                                                                true,
                                                            );
                                                            return;
                                                        }
                                                        setStopoverOpen(false);
                                                        setNewTrip({
                                                            ...newTrip,
                                                            stopoverDetail: '',
                                                        });
                                                    }}
                                                >
                                                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-current text-[11px] leading-none">
                                                        {stopoverOpen
                                                            ? '−'
                                                            : '+'}
                                                    </span>
                                                    <span>
                                                        {stopoverOpen
                                                            ? '경유지 삭제'
                                                            : '경유지 추가'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <Label>가는날 시간</Label>
                                                <div className="relative">
                                                    <Input
                                                        ref={goingDateTimeRef}
                                                        type="datetime-local"
                                                        min={goingScheduleMin}
                                                        value={newTrip.goingDateTime}
                                                        className={`peer h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 pr-10 text-sm shadow-none focus-visible:border-gray-500 focus-visible:ring-0 ${
                                                            !newTrip.goingDateTime
                                                                ? 'text-transparent'
                                                                : ''
                                                        }`}
                                                        onClick={() => {
                                                            if (
                                                                goingDateTimeRef
                                                                    .current
                                                                    ?.showPicker
                                                            ) {
                                                                goingDateTimeRef.current.showPicker();
                                                                return;
                                                            }
                                                            goingDateTimeRef.current?.focus();
                                                        }}
                                                        onChange={(e) =>
                                                            setNewTrip({
                                                                ...newTrip,
                                                                goingDateTime:
                                                                    e.target.value,
                                                            })
                                                        }
                                                    />
                                                    {!newTrip.goingDateTime && (
                                                        <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-sm text-gray-500 peer-focus:hidden">
                                                            날짜를 선택하세요
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>오는날 시간</Label>
                                                <div className="relative">
                                                    <Input
                                                        ref={returnDateTimeRef}
                                                        type="datetime-local"
                                                        min={returnScheduleMin}
                                                        value={newTrip.returnDateTime}
                                                        className={`peer h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 pr-10 text-sm shadow-none focus-visible:border-gray-500 focus-visible:ring-0 ${
                                                            !newTrip.returnDateTime
                                                                ? 'text-transparent'
                                                                : ''
                                                        }`}
                                                        onClick={() => {
                                                            if (
                                                                returnDateTimeRef
                                                                    .current
                                                                    ?.showPicker
                                                            ) {
                                                                returnDateTimeRef.current.showPicker();
                                                                return;
                                                            }
                                                            returnDateTimeRef.current?.focus();
                                                        }}
                                                        onChange={(e) =>
                                                            setNewTrip({
                                                                ...newTrip,
                                                                returnDateTime:
                                                                    e.target.value,
                                                            })
                                                        }
                                                    />
                                                    {!newTrip.returnDateTime && (
                                                        <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-sm text-gray-500 peer-focus:hidden">
                                                            날짜를 선택하세요
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 왕복일 때 경유지 버튼 */}
                                                <div className="pt-1">
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-7 items-center gap-1.5 px-0 text-xs font-medium text-gray-700 transition hover:text-black"
                                                        onClick={() => {
                                                            if (
                                                                !stopoverOpen
                                                            ) {
                                                                setStopoverOpen(
                                                                    true,
                                                                );
                                                                return;
                                                            }
                                                            setStopoverOpen(
                                                                false,
                                                            );
                                                            setNewTrip({
                                                                ...newTrip,
                                                                stopoverDetail:
                                                                    '',
                                                            });
                                                        }}
                                                    >
                                                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-current text-[11px] leading-none">
                                                            {stopoverOpen
                                                                ? '−'
                                                                : '+'}
                                                        </span>
                                                        <span>
                                                            {stopoverOpen
                                                                ? '경유지 삭제'
                                                                : '경유지 추가'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {stopoverOpen && (
                                <div className="space-y-2 py-1">
                                    <Label className="text-sm font-semibold text-gray-900">
                                        경유지 상세
                                    </Label>
                                    <Textarea
                                        rows={3}
                                        className="rounded-md border border-gray-200 px-4 py-3 text-sm shadow-sm focus-visible:border-gray-300 focus-visible:ring-0"
                                        value={newTrip.stopoverDetail}
                                        onChange={(e) =>
                                            setNewTrip({
                                                ...newTrip,
                                                stopoverDetail:
                                                    e.target.value,
                                            })
                                        }
                                        placeholder="모든 경유지를 구체적으로 적어주세요."
                                    />
                                </div>
                            )}

                            {/* 결제 방식 + 버스 선택 + 추가 사항 */}
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>결제 방식</Label>
                                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-gray-300">
                                    <button
                                        type="button"
                                        className={`h-11 border-r border-gray-300 px-4 text-sm font-semibold transition ${
                                            newTrip.paymentMethod === 'cash'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                paymentMethod: 'cash',
                                            })
                                        }
                                    >
                                        현금
                                    </button>
                                    <button
                                        type="button"
                                        className={`h-11 px-4 text-sm font-semibold transition ${
                                            newTrip.paymentMethod === 'card'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                paymentMethod: 'card',
                                            })
                                        }
                                    >
                                        카드
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>버스 선택</Label>
                                <div className="grid grid-cols-3 overflow-hidden rounded-md border border-gray-300">
                                    <button
                                        type="button"
                                        className={`border-r border-gray-300 px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'large'
                                                ? 'bg-gray-200'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                busSize: 'large',
                                            })
                                        }
                                    >
                                        대형버스
                                        <div className="mt-1 text-xs font-normal text-gray-500">
                                            (45인승)
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`border-r border-gray-300 px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'medium'
                                                ? 'bg-gray-200'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                busSize: 'medium',
                                            })
                                        }
                                    >
                                        우등버스
                                        <div className="mt-1 text-xs font-normal text-gray-500">
                                            (28인승)
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`px-3 py-3 text-center text-sm font-semibold transition ${
                                            newTrip.busSize === 'small'
                                                ? 'bg-gray-200'
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                        onClick={() =>
                                            setNewTrip({
                                                ...newTrip,
                                                busSize: 'small',
                                            })
                                        }
                                    >
                                        미니버스·밴
                                        <div className="mt-1 text-xs font-normal text-gray-500">
                                            (14인승)
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 border-b border-gray-100 pb-4">
                                <Label>추가 사항</Label>
                                <Textarea
                                    value={newTrip.additionalRequest}
                                    onChange={(e) =>
                                        setNewTrip({
                                            ...newTrip,
                                            additionalRequest: e.target.value,
                                        })
                                    }
                                    placeholder="예) 정차 요청, 짐 위치, 시간 조율 등 추가로 남길 사항을 입력해주세요."
                                />
                            </div>

                            {/* 기사님 동행 여부 */}
                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                <Label>기사님 동행 여부</Label>
                                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-gray-300">
                                    <button
                                        type="button"
                                        className={`h-11 border-r border-gray-300 px-4 text-sm font-semibold transition ${
                                            newTrip.companionType ===
                                            'depart_return'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                        onClick={() => {
                                            setNewTrip({
                                                ...newTrip,
                                                companionType: 'depart_return',
                                                itineraryDetail: '',
                                            });
                                            setCompanionInfoConfirmed(false);
                                        }}
                                    >
                                        출발, 귀환만
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition ${
                                            newTrip.companionType ===
                                            'with_schedule'
                                                ? 'bg-gray-200 text-gray-900'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                        onClick={() => {
                                            setNewTrip({
                                                ...newTrip,
                                                companionType: 'with_schedule',
                                            });
                                            setCompanionInfoConfirmed(false);
                                            setCompanionInfoOpen(true);
                                        }}
                                    >
                                        일정 동행
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px] leading-none">
                                            ?
                                        </span>
                                    </button>
                                </div>

                                {newTrip.companionType === 'with_schedule' &&
                                    companionInfoConfirmed && (
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-700">
                                                일정 동행을 선택하셨습니다. 기사님이
                                                함께할 수 있도록 전체 일정을 구체적으로
                                                적어주세요.
                                            </p>
                                            <Textarea
                                                value={newTrip.itineraryDetail}
                                                onChange={(e) =>
                                                    setNewTrip({
                                                        ...newTrip,
                                                        itineraryDetail:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="전체적인 일정(이동 경로/시간/요청사항)을 적어주세요."
                                            />
                                        </div>
                                    )}
                            </div>

                            {/* 서비스 목적 */}
                            <div className="space-y-2 border-b border-gray-100 pb-4">
                                <Label>어떤 목적으로 서비스를 이용하세요?</Label>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    {[
                                        '결혼식',
                                        '워크샵',
                                        '산학회',
                                        'MT/학교',
                                        '콘서트',
                                        '골프',
                                        '낚시',
                                        '통근/셔틀',
                                        '어린이집',
                                        '기타',
                                    ].map((purpose) => (
                                        <button
                                            key={purpose}
                                            type="button"
                                            onClick={() =>
                                                setNewTrip({
                                                    ...newTrip,
                                                    servicePurpose: purpose,
                                                })
                                            }
                                            className={`rounded-lg border px-3 py-4 text-sm font-semibold transition ${
                                                newTrip.servicePurpose ===
                                                purpose
                                                    ? 'border-gray-400 bg-gray-100'
                                                    : 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        >
                                            {purpose}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pb-2">
                                <Label>승객 수</Label>
                                <Input
                                    className="h-11 rounded-none border-x-0 border-t-0 border-b border-gray-300 px-0 shadow-none focus-visible:border-gray-500 focus-visible:ring-0"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="승객수를 입력해주세요"
                                    value={newTrip.paxCount}
                                    onChange={(e) =>
                                        setNewTrip({
                                            ...newTrip,
                                            paxCount: e.target.value.replace(
                                                /\D/g,
                                                '',
                                            ),
                                        })
                                    }
                                />
                            </div>
                            </div>

                            <div className="flex shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                                <Button
                                    type="button"
                                    onClick={createTrip}
                                    className="h-11 w-full rounded-md bg-[#e08030] text-sm font-semibold text-white hover:bg-[#d07526]"
                                >
                                    견적 등록하기
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* 기사님 동행 안내(확인 누르면 전체 일정 입력 노출) */}
                <Dialog
                    open={companionInfoOpen}
                    onOpenChange={setCompanionInfoOpen}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>기사님 동행 여부?</DialogTitle>
                            <DialogDescription className="text-sm">
                                &apos;출발, 귀환만 운송&apos;은 목적지까지 왕복
                                수송만 하는 운행이고, &apos;일정 동행&apos;은 수학여행
                                처럼 승객님의 일정에 따라 기사님이 계속
                                동행해서 함께하는 운행입니다.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 text-sm text-gray-700">
                            <p>
                                (일정 동행은 상세 일정 전제이며, 정량화된
                                견적을 바탕으로 진행될 수 있습니다.)
                            </p>
                        </div>

                        <Button
                            className="mt-4 h-11 w-full bg-[#e08030] hover:bg-[#d07526]"
                            onClick={() => {
                                setCompanionInfoOpen(false);
                                setCompanionInfoConfirmed(true);
                            }}
                        >
                            확인
                        </Button>
                    </DialogContent>
                </Dialog>
</>
  );
}

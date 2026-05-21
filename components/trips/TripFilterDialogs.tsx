'use client';

import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { TripListFilters } from '@/hooks/useTripListFilters';

export function TripFilterDialogs({ filters }: { filters: TripListFilters }) {
    const {
        regionFilterOpen,
        setRegionFilterOpen,
        dateFilterOpen,
        setDateFilterOpen,
        paxFilterOpen,
        setPaxFilterOpen,
        selectedRegions,
        selectedDate,
        setSelectedDate,
        minPax,
        setMinPax,
        maxPax,
        setMaxPax,
        dateFilterInputRef,
        regions,
        openDateFilterPicker,
        toggleRegion,
    } = filters;

    return (
        <>
            <Dialog
                open={regionFilterOpen}
                onOpenChange={setRegionFilterOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>원하는 출발지를 모두 선택하세요</DialogTitle>
                        <DialogDescription>
                            지역을 선택하면 필터에 적용됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-2">
                        {regions.map((region) => (
                            <Button
                                key={region}
                                variant={
                                    selectedRegions.includes(region)
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => toggleRegion(region)}
                            >
                                {region}
                            </Button>
                        ))}
                    </div>
                    <Button onClick={() => setRegionFilterOpen(false)}>
                        확인
                    </Button>
                </DialogContent>
            </Dialog>

            <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>원하는 출발일을 선택하세요</DialogTitle>
                        <DialogDescription>
                            날짜를 선택하면 필터에 적용됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <input
                            ref={dateFilterInputRef}
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="sr-only"
                        />
                        <button
                            type="button"
                            onClick={openDateFilterPicker}
                            className="flex h-12 w-full items-center justify-between border-b border-gray-300 px-0 text-left text-sm"
                        >
                            <span
                                className={
                                    selectedDate
                                        ? 'text-gray-900'
                                        : 'text-gray-500'
                                }
                            >
                                {selectedDate || '날짜를 입력하세요'}
                            </span>
                            <CalendarDays
                                className="h-5 w-5 text-black"
                                aria-hidden
                            />
                        </button>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Button onClick={() => setDateFilterOpen(false)}>
                                확인
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={paxFilterOpen} onOpenChange={setPaxFilterOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>인원수를 입력해주세요</DialogTitle>
                        <DialogDescription>
                            최소/최대 인원으로 필터링합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                type="number"
                                placeholder="최소"
                                value={minPax}
                                onChange={(e) => setMinPax(e.target.value)}
                                className="no-number-spin h-12 rounded-none border-0 border-b border-gray-300 px-0 shadow-none focus-visible:ring-0"
                            />
                            <Input
                                type="number"
                                placeholder="최대"
                                value={maxPax}
                                onChange={(e) => setMaxPax(e.target.value)}
                                className="no-number-spin h-12 rounded-none border-0 border-b border-gray-300 px-0 shadow-none focus-visible:ring-0"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Button onClick={() => setPaxFilterOpen(false)}>
                                확인
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

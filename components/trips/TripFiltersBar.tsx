'use client';

import { Button } from '@/components/ui/button';

export function TripFiltersBar({
    selectedDate,
    minPax,
    maxPax,
    onRegionClick,
    onDateClick,
    onPaxClick,
    onReset,
    resetTitle = '필터 초기화',
}: {
    selectedDate: string;
    minPax: string;
    maxPax: string;
    onRegionClick: () => void;
    onDateClick: () => void;
    onPaxClick: () => void;
    onReset: () => void;
    resetTitle?: string;
}) {
    return (
        <div className="mb-6 flex w-full justify-center">
            <div className="flex w-full max-w-xl flex-wrap justify-between gap-1 rounded-none border bg-white px-2 py-2 shadow-sm sm:justify-center">
                <Button
                    variant="ghost"
                    onClick={onRegionClick}
                    className="h-9 rounded-none px-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-100"
                >
                    출발지역
                </Button>
                <Button
                    variant="ghost"
                    onClick={onDateClick}
                    className="h-9 rounded-none px-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-100"
                >
                    {selectedDate ? `출발일: ${selectedDate}` : '출발일'}
                </Button>
                <Button
                    variant="ghost"
                    onClick={onPaxClick}
                    className="h-9 rounded-none px-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-100"
                >
                    {minPax || maxPax
                        ? `인원수: ${minPax || '0'}~${maxPax || '∞'}`
                        : '인원수'}
                </Button>
                <Button
                    variant="ghost"
                    onClick={onReset}
                    title={resetTitle}
                    aria-label={resetTitle}
                    className="h-9 w-9 rounded-none px-0 text-gray-800 hover:bg-gray-100 active:bg-gray-100"
                >
                    ↻
                </Button>
            </div>
        </div>
    );
}

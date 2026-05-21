'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
    filterTripsByCriteria,
    TRIP_ORIGIN_REGIONS,
    type TripFilterable,
    type TripListFilterCriteria,
} from '@/lib/tripFilters';

export function useTripListFilters() {
    const [regionFilterOpen, setRegionFilterOpen] = useState(false);
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [paxFilterOpen, setPaxFilterOpen] = useState(false);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [minPax, setMinPax] = useState('');
    const [maxPax, setMaxPax] = useState('');
    const dateFilterInputRef = useRef<HTMLInputElement | null>(null);

    const criteria: TripListFilterCriteria = useMemo(
        () => ({
            selectedRegions,
            selectedDate,
            minPax,
            maxPax,
        }),
        [selectedRegions, selectedDate, minPax, maxPax],
    );

    const filterTrips = useCallback(
        <T extends TripFilterable>(list: T[]) =>
            filterTripsByCriteria(list, criteria),
        [criteria],
    );

    const resetFilters = useCallback(() => {
        setSelectedRegions([]);
        setSelectedDate('');
        setMinPax('');
        setMaxPax('');
    }, []);

    const openDateFilterPicker = useCallback(() => {
        const input = dateFilterInputRef.current;
        if (!input) return;

        const pickerInput = input as HTMLInputElement & {
            showPicker?: () => void;
        };
        if (pickerInput.showPicker) {
            pickerInput.showPicker();
        } else {
            input.focus();
            input.click();
        }
    }, []);

    const toggleRegion = useCallback((region: string) => {
        setSelectedRegions((prev) =>
            prev.includes(region)
                ? prev.filter((r) => r !== region)
                : [...prev, region],
        );
    }, []);

    return {
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
        regions: TRIP_ORIGIN_REGIONS,
        filterTrips,
        resetFilters,
        openDateFilterPicker,
        toggleRegion,
    };
}

export type TripListFilters = ReturnType<typeof useTripListFilters>;

'use client';

import { useEffect, useState } from 'react';
import {
    calculateTripDistancesRecord,
    type TripWithCoords,
} from '@/lib/kakaoDistance';

export function useTripDistances(trips: TripWithCoords[]) {
    const [distanceByTripId, setDistanceByTripId] = useState<
        Record<string, number | null>
    >({});

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (trips.length === 0) {
                if (!cancelled) setDistanceByTripId({});
                return;
            }
            const results = await calculateTripDistancesRecord(trips);
            if (!cancelled) setDistanceByTripId(results);
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [trips]);

    return distanceByTripId;
}

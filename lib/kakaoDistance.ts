export type GeoPoint = { x: number; y: number };

export type TripWithCoords = {
    id: string;
    origin: string;
    destination: string;
    originX?: number | null;
    originY?: number | null;
    destinationX?: number | null;
    destinationY?: number | null;
};

export async function fetchPlaceTopResult(
    query: string,
): Promise<GeoPoint | null> {
    if (!query.trim()) return null;
    try {
        const response = await fetch(
            `/api/kakao/places?query=${encodeURIComponent(query)}`,
        );
        if (!response.ok) return null;
        const data = await response.json();
        const first = (data.places || [])[0] as
            | { x?: string; y?: string }
            | undefined;
        if (!first?.x || !first?.y) return null;
        return { x: Number(first.x), y: Number(first.y) };
    } catch {
        return null;
    }
}

export async function fetchDrivingDistanceKm(
    origin: GeoPoint,
    destination: GeoPoint,
): Promise<number | null> {
    try {
        const params = new URLSearchParams({
            originX: String(origin.x),
            originY: String(origin.y),
            destX: String(destination.x),
            destY: String(destination.y),
        });
        const response = await fetch(`/api/kakao/directions?${params}`);
        if (!response.ok) return null;
        const data = await response.json();
        const km = Number(data?.distanceKm);
        return Number.isFinite(km) ? km : null;
    } catch {
        return null;
    }
}

async function resolveTripEndpoints(trip: TripWithCoords) {
    const originPoint =
        typeof trip.originX === 'number' && typeof trip.originY === 'number'
            ? { x: trip.originX, y: trip.originY }
            : await fetchPlaceTopResult(trip.origin);
    const destinationPoint =
        typeof trip.destinationX === 'number' &&
        typeof trip.destinationY === 'number'
            ? { x: trip.destinationX, y: trip.destinationY }
            : await fetchPlaceTopResult(trip.destination);
    return { originPoint, destinationPoint };
}

/** 여정 ID별 주행 거리(km). 좌표·주소 조회 실패 시 null */
export async function calculateTripDistancesRecord(
    trips: TripWithCoords[],
): Promise<Record<string, number | null>> {
    // 여정마다 순차 await하면 N배 지연이 그대로 체감 로딩 시간이 된다 —
    // 서로 독립적인 조회라 Promise.all로 병렬화한다. 대시보드 한 화면에
    // 표시되는 여정 수는 제한적이라 카카오 API 초당 호출 한도 위험은 낮음.
    const entries = await Promise.all(
        trips.map(async (trip) => {
            const { originPoint, destinationPoint } =
                await resolveTripEndpoints(trip);
            if (!originPoint || !destinationPoint) {
                return [trip.id, null] as const;
            }
            const km = await fetchDrivingDistanceKm(
                originPoint,
                destinationPoint,
            );
            return [trip.id, km] as const;
        }),
    );
    return Object.fromEntries(entries);
}

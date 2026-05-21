'use client';

export function PassengerTripRouteBadges({
    isRound,
    distanceKm,
}: {
    isRound: boolean;
    distanceKm?: number | null;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                {isRound ? '왕복' : '편도'}
            </span>
            {typeof distanceKm === 'number' ? (
                <span className="rounded-full border border-sky-300 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    {distanceKm}km
                </span>
            ) : null}
        </div>
    );
}

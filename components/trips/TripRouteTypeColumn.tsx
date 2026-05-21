import { ArrowRight, ArrowUpDown } from 'lucide-react';

export function TripRouteTypeColumn({
    isRound,
    km,
}: {
    isRound: boolean;
    km?: number | null;
}) {
    return (
        <div className="flex w-[4.5rem] shrink-0 flex-col items-center border-r border-gray-100 pr-3 text-center">
            {isRound ? (
                <ArrowUpDown
                    className="h-5 w-5 text-gray-500"
                    strokeWidth={1.75}
                    aria-hidden
                />
            ) : (
                <ArrowRight
                    className="h-5 w-5 text-gray-500"
                    strokeWidth={1.75}
                    aria-hidden
                />
            )}
            <span className="mt-1 text-xs font-semibold text-gray-800">
                {isRound ? '왕복' : '편도'}
            </span>
            {km != null ? (
                <span className="mt-0.5 text-[11px] text-gray-500">{km}km</span>
            ) : (
                <span className="mt-0.5 text-[11px] text-gray-400">—</span>
            )}
        </div>
    );
}

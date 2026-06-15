'use client';

export function BidderProfileSubpageHeader({
    title,
    onBack,
    onHome,
}: {
    title: string;
    onBack: () => void;
    onHome: () => void;
}) {
    return (
        <div className="fixed inset-x-0 top-0 z-30 border-b bg-white/95 backdrop-blur">
            <div className="relative flex w-full items-center justify-center px-4 py-3 text-sm">
                <button
                    type="button"
                    className="absolute left-4 text-gray-600"
                    onClick={onBack}
                >
                    ←
                </button>
                <span className="font-semibold">{title}</span>
                <button
                    type="button"
                    className="absolute right-4 text-gray-600"
                    onClick={onHome}
                >
                    ⌂
                </button>
            </div>
        </div>
    );
}

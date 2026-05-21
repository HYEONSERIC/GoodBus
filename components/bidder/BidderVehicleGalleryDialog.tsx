'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function BidderVehicleGalleryDialog({
    open,
    onOpenChange,
    vehiclePhotos,
    galleryIndex,
    onPrev,
    onNext,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vehiclePhotos: string[];
    galleryIndex: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-black/95 p-3">
                <DialogHeader>
                    <DialogTitle className="sr-only">
                        차량 사진 크게 보기
                    </DialogTitle>
                </DialogHeader>
                <div className="relative">
                    {vehiclePhotos[galleryIndex] ? (
                        <img
                            src={vehiclePhotos[galleryIndex]}
                            alt={`차량 사진 ${galleryIndex + 1}`}
                            className="max-h-[70vh] w-full rounded-md object-contain"
                        />
                    ) : null}
                    {vehiclePhotos.length > 1 ? (
                        <>
                            <button
                                type="button"
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
                                onClick={onPrev}
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
                                onClick={onNext}
                            >
                                ›
                            </button>
                        </>
                    ) : null}
                </div>
                <p className="text-center text-xs text-gray-300">
                    {galleryIndex + 1} / {vehiclePhotos.length}
                </p>
            </DialogContent>
        </Dialog>
    );
}

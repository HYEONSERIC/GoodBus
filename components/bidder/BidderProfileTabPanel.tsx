'use client';

import { Button } from '@/components/ui/button';
import {
    DriverReviewsList,
    formatDriverRatingStars,
    type TripReviewRecord,
} from '@/components/TripReviewSection';
import { BidderProfileSubpageHeader } from '@/components/bidder/BidderProfileSubpageHeader';
import { BidderVehicleGalleryDialog } from '@/components/bidder/BidderVehicleGalleryDialog';
import type { BidderDashboardRole } from '@/types/bidderProfile';

export function BidderProfileTabPanel({
    role,
    displayName,
    profilePhoto,
    bannerUrl,
    vehicleTypeLabel,
    vehicleCapacityLabel,
    vehicleYearLabel,
    insuranceLabel,
    companyLabel,
    vehiclePhotos,
    driverComment,
    ratingLine,
    profileSection,
    onProfileSectionChange,
    driverReviews,
    resolveMediaUrl,
    galleryOpen,
    onGalleryOpenChange,
    galleryIndex,
    onOpenGallery,
    onGalleryPrev,
    onGalleryNext,
    onBack,
    onHome,
    onEdit,
}: {
    role: BidderDashboardRole;
    displayName: string;
    profilePhoto: string | null;
    bannerUrl: string | null;
    vehicleTypeLabel: string;
    vehicleCapacityLabel: string | null;
    vehicleYearLabel: string | null;
    insuranceLabel: string;
    companyLabel: string;
    vehiclePhotos: string[];
    driverComment?: string;
    ratingLine?: string;
    profileSection?: 'details' | 'review';
    onProfileSectionChange?: (section: 'details' | 'review') => void;
    driverReviews?: Array<
        TripReviewRecord & {
            trip?: {
                origin: string;
                destination: string;
                dateTime: string;
            };
        }
    >;
    resolveMediaUrl?: (url?: string | null) => string | null;
    galleryOpen: boolean;
    onGalleryOpenChange: (open: boolean) => void;
    galleryIndex: number;
    onOpenGallery: (index: number) => void;
    onGalleryPrev: () => void;
    onGalleryNext: () => void;
    onBack: () => void;
    onHome: () => void;
    onEdit: () => void;
}) {
    const showReviews = role === 'driver' && onProfileSectionChange != null;
    const bannerHeight = role === 'driver' ? 'h-48' : 'h-40';

    return (
        <>
            <BidderProfileSubpageHeader
                title="나의 정보"
                onBack={onBack}
                onHome={onHome}
            />

            <div className="mx-auto w-full max-w-3xl pb-24 pt-12">
                <div
                    className={`overflow-hidden border bg-white ${role === 'company' ? 'rounded-none' : ''}`}
                >
                    <div className={`${bannerHeight} bg-gray-200`}>
                        {bannerUrl ? (
                            <button
                                type="button"
                                className="h-full w-full"
                                onClick={() => onOpenGallery(0)}
                            >
                                <img
                                    src={bannerUrl}
                                    alt="배너"
                                    className="h-full w-full object-cover"
                                />
                            </button>
                        ) : null}
                    </div>
                    <div className="px-6 pb-6">
                        <div className="-mt-10 flex flex-col items-center text-center">
                            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-gray-200">
                                {profilePhoto ? (
                                    <img
                                        src={profilePhoto}
                                        alt="프로필"
                                        className="h-full w-full object-cover"
                                    />
                                ) : null}
                            </div>
                            <p className="mt-3 text-lg font-semibold">
                                {displayName}
                            </p>
                            <p className="text-sm text-gray-500">
                                {ratingLine ?? '★★★★☆'}
                            </p>
                            <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-gray-600">
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        차종
                                    </p>
                                    <p>{vehicleTypeLabel}</p>
                                    {vehicleCapacityLabel ? (
                                        <p>{vehicleCapacityLabel}</p>
                                    ) : null}
                                    {vehicleYearLabel ? (
                                        <p>{vehicleYearLabel}</p>
                                    ) : null}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        보험
                                    </p>
                                    <p>{insuranceLabel}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        소속
                                    </p>
                                    <p>{companyLabel}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            {showReviews ? (
                                <>
                                    <div className="grid grid-cols-2 border-b text-sm">
                                        <button
                                            type="button"
                                            className={`py-2 ${
                                                profileSection === 'details'
                                                    ? 'border-b-2 border-black font-semibold text-black'
                                                    : 'text-gray-500'
                                            }`}
                                            onClick={() =>
                                                onProfileSectionChange!(
                                                    'details',
                                                )
                                            }
                                        >
                                            상세내역
                                        </button>
                                        <button
                                            type="button"
                                            className={`py-2 ${
                                                profileSection === 'review'
                                                    ? 'border-b-2 border-black font-semibold text-black'
                                                    : 'text-gray-500'
                                            }`}
                                            onClick={() =>
                                                onProfileSectionChange!(
                                                    'review',
                                                )
                                            }
                                        >
                                            후기
                                        </button>
                                    </div>
                                    {profileSection === 'details' ? (
                                        <BidderProfileDetailsBody
                                            vehiclePhotos={vehiclePhotos}
                                            vehicleTypeLabel={vehicleTypeLabel}
                                            vehicleCapacityLabel={
                                                vehicleCapacityLabel
                                            }
                                            vehicleYearLabel={vehicleYearLabel}
                                            driverComment={driverComment}
                                            onOpenGallery={onOpenGallery}
                                            showVehiclePhotos
                                            showDriverComment
                                        />
                                    ) : (
                                        <div className="py-4">
                                            <DriverReviewsList
                                                reviews={driverReviews ?? []}
                                                resolveImageUrl={(url) =>
                                                    resolveMediaUrl?.(url) ??
                                                    url
                                                }
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">
                                        상세내역
                                    </h3>
                                    <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700">
                                        <p>{vehicleTypeLabel}</p>
                                        {vehicleCapacityLabel ? (
                                            <p>{vehicleCapacityLabel}</p>
                                        ) : null}
                                        {vehicleYearLabel ? (
                                            <p>{vehicleYearLabel}</p>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-black">
                <Button
                    className="h-12 w-full rounded-none bg-black text-white hover:bg-black/90"
                    onClick={onEdit}
                >
                    정보 수정하기
                </Button>
            </div>

            <BidderVehicleGalleryDialog
                open={galleryOpen}
                onOpenChange={onGalleryOpenChange}
                vehiclePhotos={vehiclePhotos}
                galleryIndex={galleryIndex}
                onPrev={onGalleryPrev}
                onNext={onGalleryNext}
            />
        </>
    );
}

function BidderProfileDetailsBody({
    vehiclePhotos,
    vehicleTypeLabel,
    vehicleCapacityLabel,
    vehicleYearLabel,
    driverComment,
    onOpenGallery,
    showVehiclePhotos,
    showDriverComment,
}: {
    vehiclePhotos: string[];
    vehicleTypeLabel: string;
    vehicleCapacityLabel: string | null;
    vehicleYearLabel: string | null;
    driverComment?: string;
    onOpenGallery: (index: number) => void;
    showVehiclePhotos: boolean;
    showDriverComment: boolean;
}) {
    return (
        <div className="space-y-4 py-4 text-sm text-gray-700">
            {showVehiclePhotos ? (
                <div>
                    <p className="mb-2 font-semibold">등록 차량</p>
                    {vehiclePhotos.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                            {vehiclePhotos.map((photo, idx) => (
                                <img
                                    key={photo + idx}
                                    src={photo}
                                    alt="등록 차량"
                                    className="aspect-square w-full cursor-pointer rounded-md object-cover"
                                    onClick={() => onOpenGallery(idx)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">
                            등록된 차량 사진이 없습니다.
                        </p>
                    )}
                </div>
            ) : null}
            <div>
                <p className="mb-2 font-semibold">차량 정보</p>
                <div className="rounded-md border bg-gray-50 p-3 text-gray-700">
                    <p>{vehicleTypeLabel}</p>
                    {vehicleCapacityLabel ? <p>{vehicleCapacityLabel}</p> : null}
                    {vehicleYearLabel ? <p>{vehicleYearLabel}</p> : null}
                </div>
            </div>
            {showDriverComment ? (
                <div>
                    <p className="mb-2 font-semibold">기사님의 한마디</p>
                    <div className="rounded-md border bg-gray-50 p-3 text-gray-700">
                        {driverComment?.trim() ||
                            '아직 작성된 한마디가 없습니다.'}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function formatBidderRatingLine(
    avgRating: number | null,
    count: number,
) {
    const { stars, label } = formatDriverRatingStars(avgRating, count);
    return `${stars} ${label}`;
}

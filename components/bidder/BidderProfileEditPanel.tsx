'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BidderProfileSubpageHeader } from '@/components/bidder/BidderProfileSubpageHeader';
import type { KakaoPlace } from '@/types/dashboard';
import type {
    BidderDashboardRole,
    BidderProfileForm,
} from '@/types/bidderProfile';

const PROFILE_PHOTO_HINT: Record<BidderDashboardRole, string> = {
    driver: '얼굴이 잘 보이는 사진을 등록해주세요.',
    company: '회사나 기사 이미지가 잘 보이게 등록해주세요.',
};

const DOCUMENT_LABEL: Record<BidderDashboardRole, string> = {
    driver: '버스 운전 자격증',
    company: '사업자 등록증',
};

export function BidderProfileEditPanel({
    role,
    profileForm,
    onProfileFormChange,
    profilePhoto,
    onProfilePhotoPick,
    vehiclePhotos,
    onAddVehiclePhotos,
    onRemoveVehiclePhoto,
    garageResults,
    garageStatusMessage,
    onGarageQueryChange,
    onGarageSelect,
    documentUrl,
    uploadBaseUrl,
    onSave,
    onBack,
    onHome,
}: {
    role: BidderDashboardRole;
    profileForm: BidderProfileForm;
    onProfileFormChange: (
        updater: (prev: BidderProfileForm) => BidderProfileForm,
    ) => void;
    profilePhoto: string | null;
    onProfilePhotoPick: (file: File | null) => void;
    vehiclePhotos: string[];
    onAddVehiclePhotos: (files: FileList | null) => void;
    onRemoveVehiclePhoto: (index: number) => void;
    garageResults: KakaoPlace[];
    garageStatusMessage: string;
    onGarageQueryChange: (value: string) => void;
    onGarageSelect: (place: KakaoPlace) => void;
    documentUrl: string | null;
    uploadBaseUrl: string;
    onSave: () => void | Promise<void>;
    onBack: () => void;
    onHome: () => void;
}) {
    const photoInputId = `${role}-profile-photo`;
    const vehicleInputId = `${role}-vehicle-photos`;

    return (
        <>
            <BidderProfileSubpageHeader
                title="정보 수정"
                onBack={onBack}
                onHome={onHome}
            />
            <div className="mx-auto w-full max-w-3xl pb-24 pt-12">
                <div className="bg-white px-6 py-8 sm:px-10">
                    <div className="space-y-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-200">
                                {profilePhoto ? (
                                    <img
                                        src={profilePhoto}
                                        alt="프로필"
                                        className="h-full w-full object-cover"
                                    />
                                ) : null}
                            </div>
                            <p className="mt-4 text-sm text-gray-500">
                                고객님에게 보이는 대표 사진입니다.
                            </p>
                            <p className="text-sm text-gray-500">
                                {PROFILE_PHOTO_HINT[role]}
                            </p>
                            <input
                                id={photoInputId}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                    onProfilePhotoPick(
                                        e.target.files?.[0] || null,
                                    )
                                }
                            />
                            <label
                                htmlFor={photoInputId}
                                className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-sm bg-[#4a4a4a] px-8 text-sm font-medium text-white transition hover:bg-[#3f3f3f]"
                            >
                                사진 등록
                            </label>
                        </div>

                        <div className="space-y-5">
                            <ProfileField
                                label="이름"
                                value={profileForm.name}
                                onChange={(name) =>
                                    onProfileFormChange((prev) => ({
                                        ...prev,
                                        name,
                                    }))
                                }
                            />
                            <ProfileField
                                label="소속"
                                value={profileForm.company}
                                onChange={(company) =>
                                    onProfileFormChange((prev) => ({
                                        ...prev,
                                        company,
                                    }))
                                }
                            />
                            <ProfileField
                                label="휴대전화번호"
                                value={profileForm.phone}
                                onChange={(phone) =>
                                    onProfileFormChange((prev) => ({
                                        ...prev,
                                        phone,
                                    }))
                                }
                                placeholder="010-1234-5678"
                            />
                            <div className="space-y-2">
                                <Label className="text-sm text-gray-700">
                                    차고지 주소
                                </Label>
                                {garageStatusMessage ? (
                                    <p className="text-xs text-gray-400">
                                        {garageStatusMessage}
                                    </p>
                                ) : null}
                                <div className="relative">
                                    <Input
                                        className="rounded-none border-x-0 border-b border-t-0 border-gray-200 px-0 shadow-none focus-visible:ring-0"
                                        value={profileForm.garage}
                                        onChange={(e) =>
                                            onGarageQueryChange(e.target.value)
                                        }
                                    />
                                    {garageResults.length > 0 ? (
                                        <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5">
                                            {garageResults.map((place) => (
                                                <button
                                                    key={place.id}
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                                                    onClick={() =>
                                                        onGarageSelect(place)
                                                    }
                                                >
                                                    <div className="font-medium text-gray-900">
                                                        {place.place_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {place.road_address_name ||
                                                            place.address_name}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <ProfileField
                                label="차량 번호"
                                value={profileForm.busNumber}
                                onChange={(busNumber) =>
                                    onProfileFormChange((prev) => ({
                                        ...prev,
                                        busNumber,
                                    }))
                                }
                            />
                            <div className="grid gap-5 sm:grid-cols-3">
                                <ProfileField
                                    label="차량 종류"
                                    value={profileForm.busType}
                                    onChange={(busType) =>
                                        onProfileFormChange((prev) => ({
                                            ...prev,
                                            busType,
                                        }))
                                    }
                                />
                                <ProfileField
                                    label="연식"
                                    value={profileForm.busYear}
                                    onChange={(busYear) =>
                                        onProfileFormChange((prev) => ({
                                            ...prev,
                                            busYear,
                                        }))
                                    }
                                />
                                <ProfileField
                                    label="탑승 정원"
                                    value={profileForm.capacity}
                                    onChange={(capacity) =>
                                        onProfileFormChange((prev) => ({
                                            ...prev,
                                            capacity,
                                        }))
                                    }
                                    className="text-right"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm text-gray-700">
                                    차량 사진
                                </Label>
                                <input
                                    id={vehicleInputId}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) =>
                                        onAddVehiclePhotos(e.target.files)
                                    }
                                />
                                <label
                                    htmlFor={vehicleInputId}
                                    className="cursor-pointer text-sm text-gray-500 underline underline-offset-4"
                                >
                                    사진 추가
                                </label>
                            </div>
                            {vehiclePhotos.length > 0 ? (
                                <div className="grid grid-cols-4 gap-2">
                                    {vehiclePhotos.map((photo, idx) => (
                                        <div
                                            key={photo + idx}
                                            className="relative"
                                        >
                                            <img
                                                src={photo}
                                                alt="차량"
                                                className="aspect-square w-full rounded-md object-cover"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-1 top-1 h-5 w-5 rounded-full bg-black/70 text-xs font-semibold text-white"
                                                onClick={() =>
                                                    onRemoveVehiclePhoto(idx)
                                                }
                                                aria-label="차량 사진 삭제"
                                                title="차량 사진 삭제"
                                            >
                                                -
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    등록된 차량 사진이 없습니다.
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm text-gray-700">
                                {DOCUMENT_LABEL[role]}
                            </Label>
                            {documentUrl ? (
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="aspect-square overflow-hidden rounded-md bg-gray-50">
                                        <img
                                            src={`${uploadBaseUrl}${documentUrl}`}
                                            alt={DOCUMENT_LABEL[role]}
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    {role === 'driver'
                                        ? '등록된 자격증이 없습니다.'
                                        : '등록된 서류가 없습니다.'}
                                </p>
                            )}
                        </div>

                        {role === 'driver' ? (
                            <div className="space-y-2">
                                <Label className="text-sm text-gray-700">
                                    기사님의 한마디
                                </Label>
                                <Textarea
                                    className="min-h-24 border-gray-200"
                                    placeholder="예) 안전하고 친절한 운행으로 모시겠습니다."
                                    value={profileForm.driverComment}
                                    onChange={(e) =>
                                        onProfileFormChange((prev) => ({
                                            ...prev,
                                            driverComment: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-black">
                <Button
                    className="h-12 w-full rounded-none bg-black text-white hover:bg-black/90"
                    onClick={onSave}
                >
                    정보 수정 완료
                </Button>
            </div>
        </>
    );
}

function ProfileField({
    label,
    value,
    onChange,
    placeholder,
    className,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-sm text-gray-700">{label}</Label>
            <Input
                className={`rounded-none border-x-0 border-b border-t-0 border-gray-200 px-0 shadow-none focus-visible:ring-0 ${className ?? ''}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}

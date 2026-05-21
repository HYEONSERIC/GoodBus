'use client';

import { useCallback, useMemo, useState } from 'react';
import { profileAPI } from '@/lib/api';
import {
    applyBidderProfileMediaFromUser,
    bidderProfileFormFromUser,
    buildBidderProfileFormData,
    resolveBidderMediaUrl,
} from '@/lib/bidderProfile';
import type { KakaoPlace } from '@/types/dashboard';
import {
    EMPTY_BIDDER_PROFILE_FORM,
    type BidderDashboardRole,
    type BidderProfileForm,
} from '@/types/bidderProfile';

export function useBidderProfile(
    role: BidderDashboardRole,
    options?: {
        fallbackDisplayName?: string;
        userEmail?: string | null;
    },
) {
    const uploadBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const fallbackDisplayName =
        options?.fallbackDisplayName ??
        (role === 'driver' ? '버스 기사' : '버스 회사');
    const userEmail = options?.userEmail;

    const [profileForm, setProfileForm] = useState<BidderProfileForm>({
        ...EMPTY_BIDDER_PROFILE_FORM,
    });
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
    const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
    const [vehiclePhotoFiles, setVehiclePhotoFiles] = useState<File[]>([]);
    const [vehiclePersistedUrls, setVehiclePersistedUrls] = useState<string[]>(
        [],
    );
    const [garageResults, setGarageResults] = useState<KakaoPlace[]>([]);
    const [garageStatusMessage, setGarageStatusMessage] = useState('');
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);

    const resolveMediaUrl = useCallback(
        (url?: string | null) => resolveBidderMediaUrl(url, uploadBaseUrl),
        [uploadBaseUrl],
    );

    const applyFromUser = useCallback(
        (user: Record<string, unknown> | null | undefined) => {
            setProfileForm(bidderProfileFormFromUser(user));
            const media = applyBidderProfileMediaFromUser(user, uploadBaseUrl);
            setProfilePhoto(media.profilePhoto);
            setVehiclePersistedUrls(media.persisted);
            setVehiclePhotos(media.vehiclePhotos);
            setProfilePhotoFile(null);
            setVehiclePhotoFiles([]);
        },
        [uploadBaseUrl],
    );

    const displayName = useMemo(
        () =>
            profileForm.name ||
            userEmail?.split('@')[0] ||
            fallbackDisplayName,
        [profileForm.name, userEmail, fallbackDisplayName],
    );

    const bannerUrl = vehiclePhotos[0] || null;
    const vehicleTypeLabel = profileForm.busType || '미등록';
    const vehicleCapacityLabel = profileForm.capacity
        ? `${profileForm.capacity}인승`
        : null;
    const vehicleYearLabel = profileForm.busYear
        ? `(${profileForm.busYear}년식)`
        : null;
    const companyLabel = profileForm.company || '미등록';

    const searchGaragePlaces = useCallback((query: string) => {
        if (!query.trim()) {
            setGarageResults([]);
            setGarageStatusMessage('');
            return;
        }
        setGarageStatusMessage('검색 중...');
        fetch(`/api/kakao/places?query=${encodeURIComponent(query)}`)
            .then(async (response) => {
                if (!response.ok) {
                    const data = await response.json().catch(() => null);
                    throw new Error(data?.error || 'Kakao API error');
                }
                return response.json();
            })
            .then((data) => {
                const places = (data.places || []) as KakaoPlace[];
                setGarageResults(places);
                setGarageStatusMessage(
                    places.length === 0
                        ? '검색 결과 없음'
                        : `${places.length}건 조회됨`,
                );
            })
            .catch(() => {
                setGarageResults([]);
                setGarageStatusMessage('검색 오류');
            });
    }, []);

    const selectGaragePlace = useCallback((place: KakaoPlace) => {
        setProfileForm((prev) => ({
            ...prev,
            garage:
                place.road_address_name ||
                place.address_name ||
                place.place_name,
        }));
        setGarageResults([]);
    }, []);

    const pickProfilePhoto = useCallback((file: File | null) => {
        setProfilePhotoFile(file);
        setProfilePhoto(file ? URL.createObjectURL(file) : null);
    }, []);

    const addVehiclePhotos = useCallback(
        (files: FileList | null) => {
            if (!files) return;
            const incoming = Array.from(files);
            const remainingSlots = Math.max(
                0,
                4 - (vehiclePersistedUrls.length + vehiclePhotoFiles.length),
            );
            if (remainingSlots === 0) {
                alert('차량 사진은 최대 4장까지 등록할 수 있습니다.');
                return;
            }
            const accepted = incoming.slice(0, remainingSlots);
            if (incoming.length > accepted.length) {
                alert('차량 사진은 최대 4장까지 등록할 수 있습니다.');
            }
            const previews = accepted.map((file) => URL.createObjectURL(file));
            setVehiclePhotoFiles((prev) => [...prev, ...accepted]);
            setVehiclePhotos((prev) => [...prev, ...previews]);
        },
        [vehiclePersistedUrls.length, vehiclePhotoFiles.length],
    );

    const removeVehiclePhoto = useCallback(
        (index: number) => {
            if (index < 0 || index >= vehiclePhotos.length) return;
            const persistedCount = vehiclePersistedUrls.length;
            if (index < persistedCount) {
                setVehiclePersistedUrls((prev) =>
                    prev.filter((_, idx) => idx !== index),
                );
                setVehiclePhotos((prev) =>
                    prev.filter((_, idx) => idx !== index),
                );
                return;
            }
            const newPhotoIndex = index - persistedCount;
            const targetPreview = vehiclePhotos[index];
            if (targetPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(targetPreview);
            }
            setVehiclePhotoFiles((prev) =>
                prev.filter((_, idx) => idx !== newPhotoIndex),
            );
            setVehiclePhotos((prev) => prev.filter((_, idx) => idx !== index));
        },
        [vehiclePhotos, vehiclePersistedUrls.length],
    );

    const openGallery = useCallback(
        (index: number) => {
            if (vehiclePhotos.length === 0) return;
            const safeIndex = Math.max(
                0,
                Math.min(index, vehiclePhotos.length - 1),
            );
            setGalleryIndex(safeIndex);
            setGalleryOpen(true);
        },
        [vehiclePhotos.length],
    );

    const showPrevPhoto = useCallback(() => {
        setGalleryIndex((prev) =>
            prev === 0 ? vehiclePhotos.length - 1 : prev - 1,
        );
    }, [vehiclePhotos.length]);

    const showNextPhoto = useCallback(() => {
        setGalleryIndex((prev) =>
            prev === vehiclePhotos.length - 1 ? 0 : prev + 1,
        );
    }, [vehiclePhotos.length]);

    const handleProfileSave = useCallback(
        async (onSuccess?: () => void) => {
            try {
                const formData = buildBidderProfileFormData(profileForm, {
                    profilePhotoFile,
                    vehiclePersistedUrls,
                    vehiclePhotoFiles,
                    includeDriverComment: role === 'driver',
                });
                await profileAPI.update(formData);
                onSuccess?.();
                alert('정보 수정 완료');
            } catch (error) {
                console.error('Profile update error:', error);
                alert('정보 수정에 실패했습니다.');
                throw error;
            }
        },
        [
            profileForm,
            profilePhotoFile,
            vehiclePersistedUrls,
            vehiclePhotoFiles,
            role,
        ],
    );

    return {
        uploadBaseUrl,
        profileForm,
        setProfileForm,
        applyFromUser,
        profilePhoto,
        pickProfilePhoto,
        vehiclePhotos,
        addVehiclePhotos,
        removeVehiclePhoto,
        garageResults,
        garageStatusMessage,
        searchGaragePlaces,
        selectGaragePlace,
        galleryOpen,
        setGalleryOpen,
        galleryIndex,
        openGallery,
        showPrevPhoto,
        showNextPhoto,
        displayName,
        bannerUrl,
        vehicleTypeLabel,
        vehicleCapacityLabel,
        vehicleYearLabel,
        companyLabel,
        resolveMediaUrl,
        handleProfileSave,
    };
}

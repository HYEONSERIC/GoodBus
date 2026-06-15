import {
    EMPTY_BIDDER_PROFILE_FORM,
    type BidderProfileForm,
} from '@/types/bidderProfile';

export function resolveBidderMediaUrl(
    url: string | null | undefined,
    uploadBaseUrl: string,
) {
    if (!url) return null;
    return url.startsWith('/uploads') ? `${uploadBaseUrl}${url}` : url;
}

export function bidderProfileFormFromUser(
    user: Record<string, unknown> | null | undefined,
): BidderProfileForm {
    if (!user) return { ...EMPTY_BIDDER_PROFILE_FORM };
    return {
        name: String(user.displayName || ''),
        company: String(user.companyName || ''),
        phone: String(user.phoneNumber || ''),
        garage: String(user.garageAddress || ''),
        busNumber: String(user.busNumber || ''),
        busType: String(user.busType || ''),
        busYear: String(user.busYear || ''),
        capacity: user.capacity ? String(user.capacity) : '',
        driverComment: String(user.driverComment || ''),
    };
}

export function applyBidderProfileMediaFromUser(
    user: Record<string, unknown> | null | undefined,
    uploadBaseUrl: string,
) {
    const resolve = (url: string) =>
        resolveBidderMediaUrl(url, uploadBaseUrl) as string;
    const profilePhoto = resolveBidderMediaUrl(
        user?.profileImageUrl as string | undefined,
        uploadBaseUrl,
    );
    const persisted = (
        (user?.vehicleImageUrls as string[] | undefined) || []
    ).slice(0, 4);
    const vehiclePhotos = persisted
        .map((url) => resolve(url))
        .filter(Boolean) as string[];
    return { profilePhoto, persisted, vehiclePhotos };
}

export function buildBidderProfileFormData(
    form: BidderProfileForm,
    opts: {
        profilePhotoFile: File | null;
        vehiclePersistedUrls: string[];
        vehiclePhotoFiles: File[];
        includeDriverComment?: boolean;
    },
) {
    const data = new FormData();
    data.append('name', form.name);
    data.append('company', form.company);
    data.append('phone', form.phone);
    data.append('garage', form.garage);
    data.append('busNumber', form.busNumber);
    data.append('busType', form.busType);
    data.append('busYear', form.busYear);
    data.append('capacity', form.capacity);
    if (opts.includeDriverComment) {
        data.append('driverComment', form.driverComment);
    }
    if (opts.profilePhotoFile) {
        data.append('profilePhoto', opts.profilePhotoFile);
    }
    data.append(
        'keepVehicleImageUrls',
        JSON.stringify(opts.vehiclePersistedUrls.slice(0, 4)),
    );
    const remaining = Math.max(0, 4 - opts.vehiclePersistedUrls.length);
    opts.vehiclePhotoFiles.slice(0, remaining).forEach((file) => {
        data.append('vehiclePhotos', file);
    });
    return data;
}

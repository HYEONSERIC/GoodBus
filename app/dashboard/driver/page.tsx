'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    authAPI,
    tripsAPI,
    bidsAPI,
    chatsAPI,
    verificationAPI,
    profileAPI,
    supportAPI,
} from '@/lib/api';
import { Notifications } from '@/components/Notifications';
import { ChatPanel } from '@/components/ChatPanel';
import { SupportCustomerCenter } from '@/components/SupportCustomerCenter';
import { PaymentCardsPanel } from '@/components/PaymentCardsPanel';
import {
    DriverReviewsList,
    formatDriverRatingStars,
    type TripReviewRecord,
} from '@/components/TripReviewSection';
import { reviewsAPI } from '@/lib/api';
import { MyBidQuoteDetailDialog } from '@/components/MyBidQuoteDetailDialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ArrowRight, ArrowUpDown, CalendarDays } from 'lucide-react';

interface Trip {
    id: string;
    origin: string;
    originX?: number | null;
    originY?: number | null;
    destination: string;
    destinationX?: number | null;
    destinationY?: number | null;
    dateTime: string;
    createdAt?: string;
    paxCount: number;
    busSize: string;
    status: string;
    servicePurpose?: string | null;
    stopoverDetail?: string | null;
    companionType?: 'depart_return' | 'with_schedule' | null;
    itineraryDetail?: string | null;
    paymentMethod?: 'cash' | 'card' | null;
    additionalRequest?: string | null;
    bids: Bid[];
}

interface Bid {
    id: string;
    price: number;
    note?: string;
    status: string;
    createdAt?: string;
    bidder: {
        id: string;
        email: string;
        role: string;
    };
}

interface KakaoPlace {
    id: string;
    place_name: string;
    address_name: string;
    road_address_name: string;
    x?: string;
    y?: string;
}

export default function DriverDashboard() {
    const [user, setUser] = useState<any>(null);
    const [membershipPlan, setMembershipPlan] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [myBids, setMyBids] = useState<Trip[]>([]);
    const [awardedTrips, setAwardedTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [distanceByTripId, setDistanceByTripId] = useState<
        Record<string, number | null>
    >({});
    type BidUiStep = 'fee' | 'form';
    const [bidUiStep, setBidUiStep] = useState<BidUiStep>('fee');
    const [bidTripPartner, setBidTripPartner] = useState<Trip | undefined>(
        undefined
    );
    const [extendedBid, setExtendedBid] = useState({
        priceManwon: '',
        vehicleCount: 1,
        toll: true,
        parking: true,
        accommodation: false,
        meals: false,
        vehicleChoice: '',
        vehicleYear: '',
        customerMsg: '',
        proactiveMsg: '',
        addons: {
            water: false,
            dropoff: false,
            cleaning: false,
            escort: false,
        },
        addonOptOut: false,
    });
    const [bidPhotoFiles, setBidPhotoFiles] = useState<File[]>([]);
    const [bidPhotoUrls, setBidPhotoUrls] = useState<string[]>([]);
    const [verification, setVerification] = useState<any>(null);
    const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
    const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
    const [verificationFile, setVerificationFile] = useState<File | null>(null);
    const [verificationUploading, setVerificationUploading] = useState(false);
    const uploadBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const [activeTab, setActiveTab] = useState<
        | 'available'
        | 'contract'
        | 'chat'
        | 'support'
        | 'membership'
        | 'paymentCards'
        | 'profile'
        | 'profileEdit'
    >('available');
    const [contractSubTab, setContractSubTab] = useState<
        'reservation' | 'bidding' | 'completed'
    >('reservation');
    const [myBidDetail, setMyBidDetail] = useState<{
        trip: Trip;
        partner?: Trip;
        bidStatus: 'open' | 'awarded';
    } | null>(null);
    const [chatFocusRoomId, setChatFocusRoomId] = useState<string | null>(
        null
    );
    const [driverSupportOpen, setDriverSupportOpen] = useState(false);
    const [driverSupportStep, setDriverSupportStep] = useState<
        'menu' | 'form' | 'done'
    >('menu');
    const [driverSupportCategory, setDriverSupportCategory] = useState<
        'quote_amount' | 'verification' | 'other' | null
    >(null);
    const [driverInquiryTitle, setDriverInquiryTitle] = useState('');
    const [driverInquiryBody, setDriverInquiryBody] = useState('');
    const [driverInquirySubmitting, setDriverInquirySubmitting] =
        useState(false);
    const [driverInquiryFormError, setDriverInquiryFormError] = useState('');
    const [driverInquiryListKey, setDriverInquiryListKey] = useState(0);
    const [membershipPrevTab, setMembershipPrevTab] = useState<
        | 'available'
        | 'contract'
        | 'chat'
        | 'support'
        | 'paymentCards'
        | 'profile'
        | 'profileEdit'
    >('available');
    const [paymentCardsPrevTab, setPaymentCardsPrevTab] = useState<
        | 'available'
        | 'contract'
        | 'chat'
        | 'support'
        | 'membership'
        | 'profile'
        | 'profileEdit'
    >('available');
    const [regionFilterOpen, setRegionFilterOpen] = useState(false);
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [paxFilterOpen, setPaxFilterOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState('');
    const dateFilterInputRef = useRef<HTMLInputElement | null>(null);
    const [minPax, setMinPax] = useState('');
    const [maxPax, setMaxPax] = useState('');
    const regions = [
        '서울',
        '경기북부',
        '경기남부',
        '인천',
        '강원',
        '대전',
        '세종',
        '충북',
        '충남',
        '광주',
        '전북',
        '전남',
        '부산',
        '대구',
        '울산',
        '경북',
        '경남',
        '제주',
    ];
    const membershipPlans = [
        {
            id: 'basic',
            name: '베이직',
            price: '무료',
            features: ['20건의 주문에 동시 입찰 가능'],
        },
        {
            id: 'plus',
            name: '플러스',
            price: '29,900원/월',
            features: [
                '40건의 주문에 동시 입찰 가능',
                '모든 예약주문 평균 입찰가 열람 가능',
                '멤버십 전용 주문 추가 입찰 가능',
            ],
        },
        {
            id: 'premium',
            name: '프리미엄',
            price: '49,900원/월',
            features: [
                '60건의 주문에 동시 입찰 가능',
                '모든 예약주문 평균 입찰가 열람 가능',
                '멤버십 전용 주문 추가 입찰 가능',
                '입찰 후 고객님께 먼저 말걸기 가능',
            ],
        },
        {
            id: 'business',
            name: '비즈니스',
            price: '99,900원/월',
            features: [
                '80건의 주문에 동시 입찰 가능',
                '모든 예약주문 평균 입찰가 열람 가능',
                '멤버십 전용 주문 추가 입찰 가능',
                '입찰 후 고객님께 먼저 말걸기 가능',
                '운행일이 같은 여러 주문 중복낙찰 가능',
            ],
        },
    ];
    const membershipNameMap: Record<string, string> = {
        Basic: '베이직',
        Plus: '플러스',
        Premium: '프리미엄',
        Business: '비즈니스',
    };
    const currentMembershipLabel =
        membershipNameMap[membershipPlan?.name] || '베이직';
    const [openMembership, setOpenMembership] = useState<string | null>(null);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
    const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
    const [vehiclePhotoFiles, setVehiclePhotoFiles] = useState<File[]>([]);
    const [vehiclePersistedUrls, setVehiclePersistedUrls] = useState<string[]>(
        []
    );
    const [profileForm, setProfileForm] = useState({
        name: '',
        company: '',
        phone: '',
        garage: '',
        busNumber: '',
        busType: '',
        busYear: '',
        capacity: '',
        driverComment: '',
    });
    const [profileSection, setProfileSection] = useState<'details' | 'review'>(
        'details'
    );
    const [driverReviews, setDriverReviews] = useState<
        Array<
            TripReviewRecord & {
                trip?: {
                    origin: string;
                    destination: string;
                    dateTime: string;
                };
            }
        >
    >([]);
    const [driverReviewStats, setDriverReviewStats] = useState<{
        avgRating: number | null;
        count: number;
    }>({ avgRating: null, count: 0 });
    const [garageResults, setGarageResults] = useState<KakaoPlace[]>([]);
    const [garageStatusMessage, setGarageStatusMessage] = useState('');
    const displayName = profileForm.name || user?.email?.split('@')[0] || '버스 기사';
    const bannerUrl = vehiclePhotos[0] || null;
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const driverLicenseUrl =
        verification?.driverLicenseUrl || user?.driverLicenseUrl || null;
    const vehicleTypeLabel = profileForm.busType || '미등록';
    const vehicleCapacityLabel = profileForm.capacity
        ? `${profileForm.capacity}인승`
        : null;
    const vehicleYearLabel = profileForm.busYear
        ? `(${profileForm.busYear}년식)`
        : null;
    const insuranceLabel =
        verification?.driverLicenseStatus === 'approved' ? '인증완료' : '미인증';
    const companyLabel = profileForm.company || '미등록';
    const resolveMediaUrl = (url?: string | null) =>
        url
            ? url.startsWith('/uploads')
                ? `${uploadBaseUrl}${url}`
                : url
            : null;

    function searchGaragePlaces(query: string) {
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
                if (places.length === 0) {
                    setGarageStatusMessage('검색 결과 없음');
                } else {
                    setGarageStatusMessage(`${places.length}건 조회됨`);
                }
            })
            .catch(() => {
                setGarageResults([]);
                setGarageStatusMessage('검색 오류');
            });
    }

    const addVehiclePhotos = (files: FileList | null) => {
        if (!files) return;
        const incoming = Array.from(files);
        const remainingSlots = Math.max(
            0,
            4 - (vehiclePersistedUrls.length + vehiclePhotoFiles.length)
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
    };

    const removeVehiclePhoto = (index: number) => {
        if (index < 0 || index >= vehiclePhotos.length) return;

        const persistedCount = vehiclePersistedUrls.length;
        if (index < persistedCount) {
            setVehiclePersistedUrls((prev) =>
                prev.filter((_, idx) => idx !== index)
            );
            setVehiclePhotos((prev) => prev.filter((_, idx) => idx !== index));
            return;
        }

        const newPhotoIndex = index - persistedCount;
        const targetPreview = vehiclePhotos[index];
        if (targetPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(targetPreview);
        }
        setVehiclePhotoFiles((prev) =>
            prev.filter((_, idx) => idx !== newPhotoIndex)
        );
        setVehiclePhotos((prev) => prev.filter((_, idx) => idx !== index));
    };

    const openGallery = (index: number) => {
        if (vehiclePhotos.length === 0) return;
        const safeIndex = Math.max(0, Math.min(index, vehiclePhotos.length - 1));
        setGalleryIndex(safeIndex);
        setGalleryOpen(true);
    };

    const showPrevPhoto = () => {
        setGalleryIndex((prev) =>
            prev === 0 ? vehiclePhotos.length - 1 : prev - 1
        );
    };

    const showNextPhoto = () => {
        setGalleryIndex((prev) =>
            prev === vehiclePhotos.length - 1 ? 0 : prev + 1
        );
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab !== 'profile' && activeTab !== 'profileEdit') return;
        reviewsAPI
            .getDriverMe()
            .then((data) => {
                setDriverReviews(data.reviews || []);
                setDriverReviewStats({
                    avgRating: data.avgRating ?? null,
                    count: data.count ?? 0,
                });
            })
            .catch(() => {
                setDriverReviews([]);
                setDriverReviewStats({ avgRating: null, count: 0 });
            });
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'contract' || activeTab === 'available') {
            loadData();
        }
    }, [activeTab]);

    useEffect(() => {
        const refreshOnFocus = () => {
            if (activeTab === 'available') {
                loadData();
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                refreshOnFocus();
            }
        };
        window.addEventListener('focus', refreshOnFocus);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('focus', refreshOnFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [activeTab]);

    async function loadData() {
        try {
            const userData = await authAPI.getMe();
            setUser(userData.user);
            setMembershipPlan(userData.user?.membershipPlan || null);
            setProfileForm({
                name: userData.user?.displayName || '',
                company: userData.user?.companyName || '',
                phone: userData.user?.phoneNumber || '',
                garage: userData.user?.garageAddress || '',
                busNumber: userData.user?.busNumber || '',
                busType: userData.user?.busType || '',
                busYear: userData.user?.busYear || '',
                capacity: userData.user?.capacity
                    ? String(userData.user.capacity)
                    : '',
                driverComment: userData.user?.driverComment || '',
            });
            setProfilePhoto(resolveMediaUrl(userData.user?.profileImageUrl));
            const persisted = (userData.user?.vehicleImageUrls || []).slice(0, 4);
            setVehiclePersistedUrls(persisted);
            setVehiclePhotos(
                persisted
                    .map((url: string) => resolveMediaUrl(url))
                    .filter(Boolean) as string[]
            );
            setProfilePhotoFile(null);
            setVehiclePhotoFiles([]);
            try {
                const verificationData = await verificationAPI.getMe();
                setVerification(verificationData.verification);
            } catch (verificationError) {
                console.warn('Verification load failed:', verificationError);
            }
            const tripData = await tripsAPI.getAll('open');
            const allTrips = tripData.trips || [];

            // 내가 입찰한 여정과 입찰하지 않은 여정을 분리
            const tripsWithMyBids = allTrips.filter((trip: Trip) =>
                trip.bids?.some(
                    (bid: Bid) =>
                        bid.bidder.id === userData.user.id &&
                        bid.status === 'open'
                )
            );
            const tripsWithoutMyBids = allTrips.filter(
                (trip: Trip) =>
                    !trip.bids?.some(
                        (bid: Bid) =>
                            bid.bidder.id === userData.user.id &&
                            bid.status === 'open'
                    )
            );

            setTrips(tripsWithoutMyBids);
            setMyBids(tripsWithMyBids);

            // awarded 여정도 가져오기
            const awardedTripData = await tripsAPI.getAll('awarded');

            // 본인이 낙찰받은 여정 필터링 (날짜 관계없이 모두 표시)
            const awardedTrips = (awardedTripData.trips || []).filter(
                (trip: Trip) => {
                    // 본인이 awarded 상태인 bid를 찾음
                    const hasMyAwardedBid = trip.bids?.some(
                        (bid: Bid) =>
                            bid.bidder.id === userData.user.id &&
                            bid.status === 'awarded'
                    );

                    return hasMyAwardedBid;
                }
            );

            setAwardedTrips(awardedTrips);
        } catch (error) {
            console.error('Error loading data:', error);
            window.location.href = '/login';
        }
    }

    async function handleLogout() {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
        window.location.href = '/login';
    }

    function defaultExtendedBidForm() {
        const cap = profileForm.capacity ? `${profileForm.capacity}인승` : '';
        const typeLine =
            profileForm.busType && cap
                ? `${profileForm.busType} (${cap})`
                : profileForm.busType || cap || '프로필에서 차량 정보 등록';
        return {
            priceManwon: '',
            vehicleCount: 1,
            toll: true,
            parking: true,
            accommodation: false,
            meals: false,
            vehicleChoice: `내 차량 — ${typeLine}`,
            vehicleYear:
                profileForm.busYear || String(new Date().getFullYear()),
            customerMsg: '',
            proactiveMsg: '',
            addons: {
                water: false,
                dropoff: false,
                cleaning: false,
                escort: false,
            },
            addonOptOut: false,
        };
    }

    function getAvailableTripCards(): Trip[] {
        return groupTripCardsForDisplay(filterTrips(trips), openTripsPool);
    }

    function assembleBidNote(pricePerVehicle: number, vehicleCount: number) {
        const lines: string[] = [];
        lines.push(
            `[입찰가(부가세 별도)] 1대당 ${pricePerVehicle}만원 × ${vehicleCount}대`
        );
        const inc: string[] = [];
        if (extendedBid.toll) inc.push('통행료');
        if (extendedBid.parking) inc.push('주차료');
        if (extendedBid.accommodation) inc.push('숙박비');
        if (extendedBid.meals) inc.push('식사비');
        lines.push(`[포함 부대비용] ${inc.length ? inc.join('·') : '없음'}`);
        lines.push(`[차종] ${extendedBid.vehicleChoice}`);
        lines.push(`[연식] ${extendedBid.vehicleYear}년`);
        if (extendedBid.customerMsg.trim()) {
            lines.push(`[고객님께 남기실 말씀]\n${extendedBid.customerMsg.trim()}`);
        }
        if (extendedBid.proactiveMsg.trim()) {
            lines.push(`[먼저 말걸기]\n${extendedBid.proactiveMsg.trim()}`);
        }
        if (extendedBid.addonOptOut) {
            lines.push('[부가 서비스] 수익 포기');
        } else {
            const addonNames: string[] = [];
            if (extendedBid.addons.water) addonNames.push('생수');
            if (extendedBid.addons.dropoff) addonNames.push('하차지 추가');
            if (extendedBid.addons.cleaning) addonNames.push('스마일 청소비');
            if (extendedBid.addons.escort) addonNames.push('하객 인솔 서비스');
            if (addonNames.length) {
                lines.push(`[부가 서비스] ${addonNames.join(', ')}`);
            }
        }
        if (bidPhotoFiles.length > 0) {
            lines.push(
                `[추가 사진] ${bidPhotoFiles.length}장 (채팅으로 상세 전달 예정)`
            );
        }
        return lines.join('\n\n');
    }

    async function createBid(tripId: string) {
        const raw = String(extendedBid.priceManwon).replace(/,/g, '').trim();
        const per = parseFloat(raw);
        if (!Number.isFinite(per) || per <= 0) {
            alert('입찰가(1대당)를 만원 단위로 입력해 주세요.');
            return;
        }
        const vehicleCount = Math.max(1, Math.floor(extendedBid.vehicleCount));
        const totalManwon = per * vehicleCount;
        if (!Number.isFinite(totalManwon) || totalManwon <= 0) {
            alert('합산 입찰가를 확인해 주세요.');
            return;
        }

        try {
            const licenseStatus = verification?.driverLicenseStatus;
            if (licenseStatus === 'pending') {
                setPendingDialogOpen(true);
                return;
            }
            if (licenseStatus !== 'approved') {
                setVerificationDialogOpen(true);
                return;
            }
            const note = assembleBidNote(per, vehicleCount);
            await bidsAPI.create(tripId, totalManwon, note);
            setSelectedTrip(null);
            setBidTripPartner(undefined);
            setBidUiStep('fee');
            setExtendedBid(defaultExtendedBidForm());
            setBidPhotoFiles([]);
            await loadData();
        } catch (error: any) {
            await loadData();
            alert(error?.message || '입찰 생성에 실패했습니다');
        }
    }

    function handleBidButtonClick(trip: Trip) {
        const licenseStatus = verification?.driverLicenseStatus;
        if (licenseStatus === 'pending') {
            setPendingDialogOpen(true);
            return;
        }
        if (licenseStatus !== 'approved') {
            setVerificationDialogOpen(true);
            return;
        }
        setBidTripPartner(getRoundPartnerTrip(trip, openTripsPool));
        setBidUiStep('fee');
        setExtendedBid(defaultExtendedBidForm());
        setBidPhotoFiles([]);
        setSelectedTrip(trip);
    }

    function handleBidDialogOpenChange(open: boolean) {
        if (!open) {
            setSelectedTrip(null);
            setBidTripPartner(undefined);
            setBidUiStep('fee');
            setBidPhotoFiles([]);
        }
    }

    function formatBoardingLine(dateTime: string) {
        const d = new Date(dateTime);
        return `${d.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
        })} ${d.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })} 탑승`;
    }

    function paymentMethodLabel(pm?: string | null) {
        if (!pm) return null;
        if (pm === 'cash') return '만나서 현금결제';
        if (pm === 'card') return '카드 결제';
        return null;
    }

    function onBidPhotosPicked(e: ChangeEvent<HTMLInputElement>) {
        const incoming = Array.from(e.target.files || []);
        if (incoming.length === 0) return;
        setBidPhotoFiles((prev) =>
            [...prev, ...incoming].slice(0, 3)
        );
        e.target.value = '';
    }

    function removeBidPhoto(slot: number) {
        setBidPhotoFiles((prev) => prev.filter((_, i) => i !== slot));
    }

    async function handleVerificationUpload() {
        if (!verificationFile) {
            alert('파일을 선택해주세요');
            return;
        }
        setVerificationUploading(true);
        try {
            const data = await verificationAPI.upload(verificationFile);
            setVerification(data.verification);
            setVerificationFile(null);
            alert('업로드가 완료되었습니다. 승인 대기 중입니다.');
            setVerificationDialogOpen(false);
        } catch (error) {
            console.error('Verification upload error:', error);
            alert('업로드에 실패했습니다');
        } finally {
            setVerificationUploading(false);
        }
    }

    async function handleProfileSave() {
        try {
            const formData = new FormData();
            formData.append('name', profileForm.name);
            formData.append('company', profileForm.company);
            formData.append('phone', profileForm.phone);
            formData.append('garage', profileForm.garage);
            formData.append('busNumber', profileForm.busNumber);
            formData.append('busType', profileForm.busType);
            formData.append('busYear', profileForm.busYear);
            formData.append('capacity', profileForm.capacity);
            formData.append('driverComment', profileForm.driverComment);

            if (profilePhotoFile) {
                formData.append('profilePhoto', profilePhotoFile);
            }

            formData.append(
                'keepVehicleImageUrls',
                JSON.stringify(vehiclePersistedUrls.slice(0, 4))
            );

            const remaining = Math.max(0, 4 - vehiclePersistedUrls.length);
            vehiclePhotoFiles.slice(0, remaining).forEach((file) => {
                formData.append('vehiclePhotos', file);
            });

            await profileAPI.update(formData);
            await loadData();
            setActiveTab('profile');
            alert('정보 수정 완료');
        } catch (error) {
            console.error('Profile update error:', error);
            alert('정보 수정에 실패했습니다.');
        }
    }

    async function handleWithdrawBid(trip: Trip) {
        if (!confirm('이 입찰을 철회하시겠습니까?')) {
            return;
        }

        const myBid = trip.bids.find(
            (bid: Bid) => bid.bidder.id === user?.id && bid.status === 'open'
        );
        if (!myBid) return;

        try {
            await bidsAPI.withdraw(myBid.id);
            loadData();
        } catch (error) {
            console.error('Error withdrawing bid:', error);
            alert('입찰 철회에 실패했습니다');
        }
    }

    async function openBidQuoteChat(trip: Trip) {
        if (!user?.id) return;
        try {
            const data = (await chatsAPI.ensureQuoteRoom(
                trip.id,
                user.id
            )) as { room?: { id?: string } };
            const roomId = data.room?.id;
            if (!roomId) {
                alert('채팅방을 열 수 없습니다.');
                return;
            }
            setChatFocusRoomId(roomId);
            setMyBidDetail(null);
            setActiveTab('chat');
        } catch (error: unknown) {
            alert(
                error instanceof Error
                    ? error.message
                    : '채팅방을 준비하지 못했습니다.'
            );
        }
    }

    async function withdrawBidFromDetail(trip: Trip) {
        if (!confirm('이 입찰을 철회하시겠습니까?')) {
            return;
        }

        const myBid = trip.bids.find(
            (bid: Bid) => bid.bidder.id === user?.id && bid.status === 'open'
        );
        if (!myBid) return;

        try {
            await bidsAPI.withdraw(myBid.id);
            setMyBidDetail(null);
            await loadData();
        } catch (error) {
            console.error('Error withdrawing bid:', error);
            alert('입찰 철회에 실패했습니다');
        }
    }

    function openDateFilterPicker() {
        const input = dateFilterInputRef.current;
        if (!input) return;

        const pickerInput = input as HTMLInputElement & {
            showPicker?: () => void;
        };
        if (pickerInput.showPicker) {
            pickerInput.showPicker();
        } else {
            input.focus();
            input.click();
        }
    }

    function filterTrips(list: Trip[]) {
        return list.filter((trip) => {
            if (
                selectedRegions.length > 0 &&
                !selectedRegions.some((region) => trip.origin.includes(region))
            ) {
                return false;
            }
            if (selectedDate) {
                const tripDate = new Date(trip.dateTime)
                    .toISOString()
                    .slice(0, 10);
                if (tripDate !== selectedDate) {
                    return false;
                }
            }
            if (minPax && trip.paxCount < Number(minPax)) {
                return false;
            }
            if (maxPax && trip.paxCount > Number(maxPax)) {
                return false;
            }
            return true;
        });
    }

    async function fetchPlaceTopResult(query: string) {
        if (!query.trim()) return null;
        try {
            const response = await fetch(
                `/api/kakao/places?query=${encodeURIComponent(query)}`
            );
            if (!response.ok) return null;
            const data = await response.json();
            const first = (data.places || [])[0] as KakaoPlace | undefined;
            if (!first?.x || !first?.y) return null;
            return { x: Number(first.x), y: Number(first.y) };
        } catch {
            return null;
        }
    }

    async function fetchDrivingDistanceKm(
        origin: { x: number; y: number },
        destination: { x: number; y: number }
    ) {
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

    function getRoundPartnerTrip(baseTrip: Trip, list: Trip[]) {
        const reverseTrips = list.filter(
            (other) =>
                other.id !== baseTrip.id &&
                other.status === baseTrip.status &&
                other.origin === baseTrip.destination &&
                other.destination === baseTrip.origin
        );
        if (reverseTrips.length === 0) return undefined;
        const baseTime = new Date(baseTrip.dateTime).getTime();
        return reverseTrips.sort((a, b) => {
            const aDiff = Math.abs(new Date(a.dateTime).getTime() - baseTime);
            const bDiff = Math.abs(new Date(b.dateTime).getTime() - baseTime);
            return aDiff - bDiff;
        })[0];
    }

    /** 왕복 여정 카드: 출발이 빠른 편을 대표로 (정렬 없이 묶으면 카드가 사라질 수 있음) */
    function groupTripCardsForDisplay(
        list: Trip[],
        partnerPool?: Trip[],
    ): Trip[] {
        const pool = partnerPool ?? list;
        const sorted = [...list].sort(
            (a, b) =>
                new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        );
        const consumed = new Set<string>();
        return sorted.filter((trip) => {
            if (consumed.has(trip.id)) return false;
            const partner = getRoundPartnerTrip(trip, pool);
            if (partner) {
                const base =
                    new Date(trip.dateTime).getTime() <=
                    new Date(partner.dateTime).getTime()
                        ? trip
                        : partner;
                consumed.add(trip.id);
                consumed.add(partner.id);
                return trip.id === base.id;
            }
            consumed.add(trip.id);
            return true;
        });
    }

    function getBusLabel(busSize: string) {
        if (busSize === 'large') return '대형버스 선호';
        if (busSize === 'medium') return '우등버스 선호';
        return '미니버스/밴 선호';
    }

    function getServicePurposeLabel(purpose?: string | null) {
        if (!purpose) return null;
        if (purpose === 'MT/학교') return '학교 행사/MT';
        return purpose;
    }

    function formatTripDateLine(dateTime: string) {
        const date = new Date(dateTime);
        const md = date.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
        });
        const weekday = date.toLocaleDateString('ko-KR', {
            weekday: 'short',
        });
        return `${md} (${weekday})`;
    }

    /** 기사 동행 방식(출발·귀환만 / 일정 동행). 편도·왕복 운행 구분과 무관 */
    function biddingCompanionSubtitle(trip: Trip): string | null {
        if (trip.companionType === 'with_schedule') return '일정 동행';
        return null;
    }

    function parseBidNoteForDisplay(note?: string | null) {
        if (!note?.trim()) return { vehicleTag: null as string | null };
        const vehicleMatch = note.match(/\[차종\]\s*(.+)/m);
        const yearMatch = note.match(/\[연식\]\s*(\d{4})\s*년?/m);
        let vehicleTag: string | null = null;
        if (vehicleMatch?.[1]) {
            const v = vehicleMatch[1].split('\n')[0].trim();
            const y = yearMatch?.[1];
            vehicleTag = y ? `${v} (${y})` : v;
        }
        return { vehicleTag };
    }

    function formatBidAgeLabel(createdAt?: string | null) {
        if (!createdAt) return null;
        const t = new Date(createdAt).getTime();
        if (Number.isNaN(t)) return null;
        const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
        if (days <= 0) return '오늘 입찰';
        return `${days}일 전 입찰`;
    }

    function biddingTripKm(
        trip: Trip,
        partner: Trip | undefined,
        distances: Record<string, number | null>
    ) {
        const d1 = distances[trip.id];
        if (partner) {
            const d2 = distances[partner.id];
            if (d1 != null && d2 != null) return Math.round(d1 + d2);
            if (d1 != null) return Math.round(d1);
            if (d2 != null) return Math.round(d2);
            return null;
        }
        return d1 != null ? Math.round(d1) : null;
    }

    /** 거리 계산용 */
    const allKnownTrips = useMemo(() => {
        const byId = new Map<string, Trip>();
        for (const t of trips) byId.set(t.id, t);
        for (const t of myBids) byId.set(t.id, t);
        for (const t of awardedTrips) byId.set(t.id, t);
        return Array.from(byId.values());
    }, [trips, myBids, awardedTrips]);

    /** open 견적끼리만 왕복 짝 (낙찰된 반대편 여정과 섞이지 않도록) */
    const openTripsPool = useMemo(() => {
        const byId = new Map<string, Trip>();
        for (const t of trips) byId.set(t.id, t);
        for (const t of myBids) byId.set(t.id, t);
        return Array.from(byId.values());
    }, [trips, myBids]);

    useEffect(() => {
        let cancelled = false;

        async function calculateDistances() {
            const results: Record<string, number | null> = {};
            for (const trip of allKnownTrips) {
                const originPoint =
                    typeof trip.originX === 'number' &&
                    typeof trip.originY === 'number'
                        ? { x: trip.originX, y: trip.originY }
                        : await fetchPlaceTopResult(trip.origin);
                const destinationPoint =
                    typeof trip.destinationX === 'number' &&
                    typeof trip.destinationY === 'number'
                        ? { x: trip.destinationX, y: trip.destinationY }
                        : await fetchPlaceTopResult(trip.destination);

                if (!originPoint || !destinationPoint) {
                    results[trip.id] = null;
                    continue;
                }

                results[trip.id] = await fetchDrivingDistanceKm(
                    originPoint,
                    destinationPoint
                );
            }

            if (!cancelled) {
                setDistanceByTripId(results);
            }
        }

        if (allKnownTrips.length > 0) {
            calculateDistances();
        } else {
            setDistanceByTripId({});
        }

        return () => {
            cancelled = true;
        };
    }, [allKnownTrips]);

    useEffect(() => {
        const urls = bidPhotoFiles.map((f) => URL.createObjectURL(f));
        setBidPhotoUrls(urls);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [bidPhotoFiles]);

    const contractReservationTrips = useMemo(
        () =>
            awardedTrips.filter(
                (trip) => new Date(trip.dateTime).getTime() >= Date.now()
            ),
        [awardedTrips]
    );

    /** 예약주문: 미래 낙찰만, 왕복은 출발이 빠른 편만 한 장으로 표시 */
    const contractReservationCardTrips = useMemo(
        () =>
            groupTripCardsForDisplay(
                contractReservationTrips,
                contractReservationTrips,
            ),
        [contractReservationTrips]
    );
    const contractCompletedTrips = useMemo(
        () =>
            awardedTrips.filter(
                (trip) => new Date(trip.dateTime).getTime() < Date.now()
            ),
        [awardedTrips]
    );
    const contractCompletedCardTrips = useMemo(
        () =>
            groupTripCardsForDisplay(
                contractCompletedTrips,
                contractCompletedTrips,
            ),
        [contractCompletedTrips]
    );
    const myBidCardTrips = useMemo(
        () => groupTripCardsForDisplay(myBids, openTripsPool),
        [myBids, openTripsPool]
    );

    function TripRouteTypeColumn({
        isRound,
        km,
    }: {
        isRound: boolean;
        km: number | null | undefined;
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
                    <span className="mt-0.5 text-[11px] text-gray-500">
                        {km}km
                    </span>
                ) : (
                    <span className="mt-0.5 text-[11px] text-gray-400">—</span>
                )}
            </div>
        );
    }

    const bidDialogTrip = selectedTrip;
    const bidPartner = bidTripPartner;
    const bidDialogDistance = bidDialogTrip
        ? distanceByTripId[bidDialogTrip.id] ?? null
        : null;
    const bidDialogRound = Boolean(bidPartner);

    return (
        <>
        <div className="min-h-screen bg-[#f3f3f5]">
            {activeTab !== 'profile' && activeTab !== 'profileEdit' && (
                <div className="border-b border-gray-200 bg-white/90 backdrop-blur">
                    <div className="relative flex w-full items-center justify-center px-3 sm:px-4 py-4">
                        {activeTab === 'membership' ? (
                            <>
                                <div className="absolute left-3 sm:left-4">
                                    <button
                                        type="button"
                                        className="text-gray-600"
                                        onClick={() => setActiveTab(membershipPrevTab)}
                                    >
                                        ←
                                    </button>
                                </div>
                                <span className="text-lg font-semibold">멤버십</span>
                                <div className="absolute right-3 sm:right-4">
                                    <button
                                        type="button"
                                        className="text-gray-600"
                                        onClick={() => setActiveTab('available')}
                                    >
                                        ⌂
                                    </button>
                                </div>
                            </>
                        ) : activeTab === 'paymentCards' ? (
                            <>
                                <div className="absolute left-3 sm:left-4">
                                    <button
                                        type="button"
                                        className="text-gray-600"
                                        onClick={() =>
                                            setActiveTab(paymentCardsPrevTab)
                                        }
                                    >
                                        ←
                                    </button>
                                </div>
                                <span className="text-lg font-semibold">
                                    결제카드
                                </span>
                                <div className="absolute right-3 sm:right-4">
                                    <button
                                        type="button"
                                        className="text-gray-600"
                                        onClick={() => setActiveTab('available')}
                                    >
                                        ⌂
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="absolute left-3 sm:left-4">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-black"
                                        onClick={() => setMenuOpen(true)}
                                    >
                                        <span className="text-base leading-none">
                                            ☰
                                        </span>
                                        <span>메뉴</span>
                                    </button>
                                </div>
                                <span className="text-lg font-semibold">
                                    GOODBUS
                                </span>
                                <div className="absolute right-3 sm:right-4 flex items-center gap-3">
                                    <Notifications />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-4xl space-y-4 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-5 sm:pt-6">

                <Dialog
                    open={verificationDialogOpen}
                    onOpenChange={setVerificationDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>버스운전자격증 등록</DialogTitle>
                            <DialogDescription>
                                입찰을 진행하려면 버스운전자격증을 등록하고
                                승인을 받아야 합니다.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            {verification?.driverLicenseStatus && (
                                <p className="text-sm text-gray-600">
                                    현재 상태: {verification.driverLicenseStatus}
                                </p>
                            )}
                            {verification?.driverLicenseNote && (
                                <p className="text-sm text-gray-600">
                                    반려 사유: {verification.driverLicenseNote}
                                </p>
                            )}
                            {verification?.driverLicenseUrl && (
                                <img
                                    src={`${uploadBaseUrl}${verification.driverLicenseUrl}`}
                                    alt="운전자격증"
                                    className="max-h-56 w-full rounded border object-contain bg-white"
                                />
                            )}
                            <div className="space-y-2">
                                <Label>자격증 이미지</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setVerificationFile(
                                            e.target.files?.[0] || null
                                        )
                                    }
                                />
                            </div>
                            <Button
                                onClick={handleVerificationUpload}
                                disabled={verificationUploading}
                            >
                                {verificationUploading ? '업로드 중...' : '업로드'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>승인 대기중입니다</DialogTitle>
                            <DialogDescription>
                                운전자격증이 아직 승인되지 않았습니다. 관리자 승인 후
                                입찰할 수 있습니다.
                            </DialogDescription>
                        </DialogHeader>
                        <Button onClick={() => setPendingDialogOpen(false)}>
                            확인
                        </Button>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={driverSupportOpen}
                    onOpenChange={(open) => {
                        setDriverSupportOpen(open);
                        if (!open) {
                            setDriverSupportStep('menu');
                            setDriverSupportCategory(null);
                            setDriverInquiryTitle('');
                            setDriverInquiryBody('');
                            setDriverInquiryFormError('');
                        }
                    }}
                >
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>문의하기</DialogTitle>
                            <DialogDescription>
                                문의 유형을 선택해주세요.
                            </DialogDescription>
                        </DialogHeader>
                        {driverSupportStep === 'menu' && (
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    type="button"
                                    onClick={() => {
                                        setDriverSupportCategory(
                                            'quote_amount',
                                        );
                                        setDriverSupportStep('form');
                                    }}
                                >
                                    입찰·견적 문의
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    type="button"
                                    onClick={() => {
                                        setDriverSupportCategory(
                                            'verification',
                                        );
                                        setDriverSupportStep('form');
                                    }}
                                >
                                    자격증·인증 문의
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    type="button"
                                    onClick={() => {
                                        setDriverSupportCategory('other');
                                        setDriverSupportStep('form');
                                    }}
                                >
                                    기타 문의
                                </Button>
                            </div>
                        )}
                        {driverSupportStep === 'form' && (
                            <div className="space-y-4">
                                {driverInquiryFormError ? (
                                    <p className="text-sm text-red-600">
                                        {driverInquiryFormError}
                                    </p>
                                ) : null}
                                <div>
                                    <Label htmlFor="driver-inquiry-title">
                                        제목
                                    </Label>
                                    <Input
                                        id="driver-inquiry-title"
                                        className="mt-1"
                                        value={driverInquiryTitle}
                                        onChange={(e) =>
                                            setDriverInquiryTitle(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="문의 제목을 입력하세요"
                                        maxLength={200}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="driver-inquiry-body">
                                        문의 내용
                                    </Label>
                                    <Textarea
                                        id="driver-inquiry-body"
                                        className="mt-1 min-h-[140px]"
                                        placeholder="문의 내용을 입력하세요"
                                        value={driverInquiryBody}
                                        onChange={(e) =>
                                            setDriverInquiryBody(
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setDriverSupportStep('menu');
                                            setDriverInquiryFormError('');
                                        }}
                                    >
                                        이전
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={
                                            driverInquirySubmitting ||
                                            !driverSupportCategory
                                        }
                                        onClick={async () => {
                                            const title =
                                                driverInquiryTitle.trim();
                                            const body =
                                                driverInquiryBody.trim();
                                            if (!title) {
                                                setDriverInquiryFormError(
                                                    '제목을 입력해주세요.',
                                                );
                                                return;
                                            }
                                            if (!body) {
                                                setDriverInquiryFormError(
                                                    '문의 내용을 입력해주세요.',
                                                );
                                                return;
                                            }
                                            setDriverInquirySubmitting(true);
                                            setDriverInquiryFormError('');
                                            try {
                                                await supportAPI.createInquiry(
                                                    {
                                                        category:
                                                            driverSupportCategory!,
                                                        title,
                                                        body,
                                                    },
                                                );
                                                setDriverInquiryListKey(
                                                    (k) => k + 1,
                                                );
                                                setDriverInquiryTitle('');
                                                setDriverInquiryBody('');
                                                setDriverSupportCategory(null);
                                                setDriverSupportStep('done');
                                            } catch (e) {
                                                setDriverInquiryFormError(
                                                    e instanceof Error
                                                        ? e.message
                                                        : '문의 접수에 실패했습니다.',
                                                );
                                            } finally {
                                                setDriverInquirySubmitting(
                                                    false,
                                                );
                                            }
                                        }}
                                    >
                                        문의하기
                                    </Button>
                                </div>
                            </div>
                        )}
                        {driverSupportStep === 'done' && (
                            <div className="space-y-4 text-sm text-gray-600">
                                문의가 접수되었습니다. 빠르게 답변드리겠습니다.
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setDriverSupportOpen(false)}
                                >
                                    닫기
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {myBidDetail &&
                    (() => {
                        const { trip, partner, bidStatus } = myBidDetail;
                        const myBid = trip.bids.find(
                            (bid: Bid) =>
                                bid.bidder.id === user?.id &&
                                bid.status === bidStatus
                        );
                        if (!myBid) return null;
                        return (
                            <MyBidQuoteDetailDialog
                                open
                                onOpenChange={(open) => {
                                    if (!open) setMyBidDetail(null);
                                }}
                                trip={trip}
                                partnerTrip={partner}
                                km={biddingTripKm(
                                    trip,
                                    partner,
                                    distanceByTripId
                                )}
                                myBid={{
                                    price: Number(myBid.price),
                                    note: myBid.note,
                                }}
                                busPreferenceLabel={getBusLabel(trip.busSize)}
                                onChatWithPassenger={() =>
                                    openBidQuoteChat(trip)
                                }
                                onWithdrawBid={() =>
                                    withdrawBidFromDetail(trip)
                                }
                                onHome={() => setActiveTab('available')}
                                showWithdrawButton={bidStatus === 'open'}
                            />
                        );
                    })()}

                {activeTab === 'available' && (
                    <div>
                        <div className="mb-6 flex justify-center w-full">
                            <div className="flex flex-wrap gap-1 rounded-none border bg-white px-2 py-2 shadow-sm w-full max-w-xl justify-between sm:justify-center">
                                <Button
                                    variant="ghost"
                                    onClick={() => setRegionFilterOpen(true)}
                                    className="h-9 rounded-none px-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-100"
                                >
                                    출발지역
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setDateFilterOpen(true)}
                                    className="h-9 rounded-none px-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-100"
                                >
                                    {selectedDate
                                        ? `출발일: ${selectedDate}`
                                        : '출발일'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setPaxFilterOpen(true)}
                                    className="h-9 rounded-none px-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-100"
                                >
                                    {minPax || maxPax
                                        ? `인원수: ${minPax || '0'}~${
                                              maxPax || '∞'
                                          }`
                                        : '인원수'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setSelectedRegions([]);
                                        setSelectedDate('');
                                        setMinPax('');
                                        setMaxPax('');
                                        loadData();
                                    }}
                                    title="필터 초기화 및 목록 새로고침"
                                    aria-label="필터 초기화 및 목록 새로고침"
                                    className="h-9 w-9 rounded-none px-0 text-gray-800 hover:bg-gray-100 active:bg-gray-100"
                                >
                                    ↻
                                </Button>
                            </div>
                        </div>
                        <div className="w-full max-w-xl mx-auto border border-gray-200 bg-white">
                            {(() => {
                                const filteredTrips = filterTrips(trips);
                                const cardTrips = groupTripCardsForDisplay(
                                    filteredTrips,
                                    openTripsPool,
                                );

                                if (cardTrips.length === 0) {
                                    return (
                                        <p className="px-4 py-12 text-center text-sm text-gray-500">
                                            {trips.length === 0
                                                ? '입찰 가능한 여정이 없습니다. 승객이 견적을 등록하면 여기에 표시됩니다. ↻ 버튼으로 새로고침할 수 있어요.'
                                                : '조건에 맞는 여정이 없습니다. 필터를 바꾸거나 ↻로 새로고침해 보세요.'}
                                        </p>
                                    );
                                }

                                return cardTrips.map((trip) => {
                                    const partner = getRoundPartnerTrip(
                                        trip,
                                        openTripsPool,
                                    );
                                    const isRound = Boolean(partner);
                                    const km = biddingTripKm(
                                        trip,
                                        partner,
                                        distanceByTripId
                                    );
                                    const bidCount = isRound
                                        ? (trip.bids?.filter(
                                              (b: Bid) => b.status === 'open'
                                          ).length || 0) +
                                          (partner?.bids?.filter(
                                              (b: Bid) => b.status === 'open'
                                          ).length || 0)
                                        : trip.bids?.filter(
                                              (b: Bid) => b.status === 'open'
                                          ).length || 0;
                                    const servicePurpose = getServicePurposeLabel(
                                        trip.servicePurpose
                                    );
                                    return (
                                        <div
                                            key={trip.id}
                                            className="border-b border-gray-100 p-4 last:border-b-0"
                                        >
                                            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                                                <p className="text-sm font-semibold leading-snug text-gray-900">
                                                    {formatTripDateLine(
                                                        trip.dateTime
                                                    )}
                                                    {biddingCompanionSubtitle(
                                                        trip
                                                    ) ? (
                                                        <span className="font-normal text-gray-600">
                                                            {' '}
                                                            {biddingCompanionSubtitle(
                                                                trip
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </p>
                                                <span className="shrink-0 text-sm font-semibold text-gray-900">
                                                    {trip.paxCount}명
                                                </span>
                                            </div>

                                            <div className="flex gap-3 py-3">
                                                <TripRouteTypeColumn
                                                    isRound={isRound}
                                                    km={km}
                                                />
                                                <div className="min-w-0 flex-1 space-y-2 text-sm">
                                                    <p className="flex items-start gap-2 leading-snug text-gray-900">
                                                        <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                                                            출발지
                                                        </span>
                                                        <span className="min-w-0 font-medium">
                                                            {trip.origin}
                                                        </span>
                                                    </p>
                                                    <p className="flex items-start gap-2 leading-snug text-gray-900">
                                                        <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                                                            도착지
                                                        </span>
                                                        <span className="min-w-0 font-medium">
                                                            {trip.destination}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {servicePurpose ? (
                                                        <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600">
                                                            {servicePurpose}
                                                        </span>
                                                    ) : null}
                                                    <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600">
                                                        {getBusLabel(
                                                            trip.busSize
                                                        )}
                                                    </span>
                                                    <span className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-500">
                                                        입찰 {bidCount}
                                                    </span>
                                                </div>

                                                <Button
                                                    type="button"
                                                    className="h-9 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black"
                                                    onClick={() =>
                                                        handleBidButtonClick(
                                                            trip
                                                        )
                                                    }
                                                >
                                                    입찰하기
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        <Dialog
                            open={Boolean(bidDialogTrip)}
                            onOpenChange={handleBidDialogOpenChange}
                        >
                            <DialogContent
                                showCloseButton
                                className="flex max-h-[min(90vh,720px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-lg [&>button]:top-3"
                            >
                                {bidDialogTrip && bidUiStep === 'fee' && (
                                    <div className="flex flex-col items-stretch gap-4 px-5 py-8">
                                        <DialogHeader className="sr-only">
                                            <DialogTitle>
                                                광고 수수료 안내
                                            </DialogTitle>
                                            <DialogDescription>
                                                확인 후 입찰 양식으로 이동합니다.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <p className="text-center text-base font-bold text-gray-900">
                                            GOODBUS 광고 수수료 안내
                                        </p>
                                        <p className="text-center text-sm text-gray-800">
                                            전세버스 주문 : 10%
                                        </p>
                                        <p className="text-center text-xs leading-relaxed text-gray-600">
                                            기사님 사유로 인한 취소 시 수수료는
                                            환불되지 않습니다.
                                        </p>
                                        <Button
                                            type="button"
                                            className="h-11 w-full rounded-md bg-[#e08030] font-semibold text-white hover:bg-[#d07526]"
                                            onClick={() => setBidUiStep('form')}
                                        >
                                            확인
                                        </Button>
                                    </div>
                                )}

                                {bidDialogTrip && bidUiStep === 'form' && (
                                    <>
                                        <DialogHeader className="sr-only">
                                            <DialogTitle>입찰하기</DialogTitle>
                                            <DialogDescription>
                                                입찰가와 차량 정보를 입력합니다.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3">
                                            <button
                                                type="button"
                                                className="min-w-[4rem] text-left text-sm text-gray-700 hover:text-black"
                                                onClick={() =>
                                                    setBidUiStep('fee')
                                                }
                                            >
                                                &lt; 이전
                                            </button>
                                            <span className="text-base font-semibold">
                                                입찰하기
                                            </span>
                                            <span className="min-w-[4rem]" />
                                        </div>

                                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">
                                            <div className="space-y-3 border-b border-gray-100 pb-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded px-2 py-0.5 text-xs font-semibold text-white ${
                                                            bidDialogRound
                                                                ? 'bg-sky-600'
                                                                : 'bg-gray-600'
                                                        }`}
                                                    >
                                                        {bidDialogRound
                                                            ? '왕복'
                                                            : '편도'}
                                                    </span>
                                                    {typeof bidDialogDistance ===
                                                        'number' && (
                                                        <span className="text-xs font-medium text-gray-500">
                                                            {bidDialogDistance}
                                                            km
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-semibold leading-snug text-gray-900">
                                                    {bidDialogTrip.origin}
                                                </p>
                                                <p className="text-sm font-semibold leading-snug text-gray-900">
                                                    {bidDialogTrip.destination}
                                                </p>
                                                <div className="space-y-1 text-xs text-gray-700">
                                                    <p>
                                                        출발{' '}
                                                        {formatBoardingLine(
                                                            bidDialogTrip.dateTime
                                                        )}
                                                    </p>
                                                    {bidPartner && (
                                                        <p>
                                                            귀환{' '}
                                                            {formatBoardingLine(
                                                                bidPartner.dateTime
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                                                        멤버십{' '}
                                                        {currentMembershipLabel}
                                                    </span>
                                                    <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                                        당일 일정
                                                    </span>
                                                    <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                                        {bidDialogTrip.paxCount}
                                                        명
                                                    </span>
                                                    <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                                        {getBusLabel(
                                                            bidDialogTrip.busSize
                                                        )}
                                                    </span>
                                                    {getServicePurposeLabel(
                                                        bidDialogTrip.servicePurpose
                                                    ) && (
                                                        <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                                            {getServicePurposeLabel(
                                                                bidDialogTrip.servicePurpose
                                                            )}
                                                        </span>
                                                    )}
                                                    {paymentMethodLabel(
                                                        bidDialogTrip.paymentMethod
                                                    ) && (
                                                        <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                                            {paymentMethodLabel(
                                                                bidDialogTrip.paymentMethod
                                                            )}
                                                        </span>
                                                    )}
                                                    {bidDialogTrip.paymentMethod ===
                                                        'card' && (
                                                        <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                                            세금계산서·카드
                                                        </span>
                                                    )}
                                                    {bidDialogTrip.companionType ===
                                                        'with_schedule' && (
                                                        <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                                                            일정 동행
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="rounded border border-sky-200 bg-sky-50/80 p-3">
                                                    <p className="text-xs font-semibold text-sky-900">
                                                        경유지 및 세부사항
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-700">
                                                        {bidDialogTrip.stopoverDetail?.trim() ||
                                                            '없음'}
                                                    </p>
                                                    {bidDialogTrip.itineraryDetail?.trim() && (
                                                        <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                                                            {bidDialogTrip.itineraryDetail}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-b border-gray-100 py-4">
                                                <Label className="text-sm font-semibold">
                                                    입찰가 (부가세 제외)
                                                </Label>
                                                <div className="flex flex-wrap items-end gap-2">
                                                    <div className="flex min-w-[140px] flex-1 items-center gap-1 border-b border-gray-300 pb-1">
                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="1대당 가격"
                                                            className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                                                            value={
                                                                extendedBid.priceManwon
                                                            }
                                                            onChange={(e) =>
                                                                setExtendedBid(
                                                                    (p) => ({
                                                                        ...p,
                                                                        priceManwon:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    })
                                                                )
                                                            }
                                                        />
                                                        <span className="text-sm text-gray-600">
                                                            만원
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 rounded border border-gray-300 bg-white px-1">
                                                        <button
                                                            type="button"
                                                            className="h-8 w-8 text-lg leading-none text-gray-600 hover:bg-gray-100"
                                                            onClick={() =>
                                                                setExtendedBid(
                                                                    (p) => ({
                                                                        ...p,
                                                                        vehicleCount:
                                                                            Math.max(
                                                                                1,
                                                                                p.vehicleCount -
                                                                                    1
                                                                            ),
                                                                    })
                                                                )
                                                            }
                                                        >
                                                            −
                                                        </button>
                                                        <span className="min-w-[2.5rem] text-center text-sm font-medium">
                                                            {extendedBid.vehicleCount}{' '}
                                                            대
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="h-8 w-8 text-lg leading-none text-gray-600 hover:bg-gray-100"
                                                            onClick={() =>
                                                                setExtendedBid(
                                                                    (p) => ({
                                                                        ...p,
                                                                        vehicleCount:
                                                                            p.vehicleCount +
                                                                            1,
                                                                    })
                                                                )
                                                            }
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs leading-relaxed text-red-600">
                                                    ⚠ 1대당 가격 입력 후 인원에
                                                    맞춰 차량 대수를
                                                    조정하세요. 낙찰 시 부가
                                                    서비스 수익은 협의에 따라
                                                    달라질 수 있습니다.
                                                </p>
                                            </div>

                                            <div className="grid gap-3 border-b border-gray-100 py-4 sm:grid-cols-2">
                                                <div>
                                                    <Label className="text-xs text-gray-600">
                                                        차종
                                                    </Label>
                                                    <select
                                                        className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm"
                                                        value={
                                                            extendedBid.vehicleChoice
                                                        }
                                                        onChange={(e) =>
                                                            setExtendedBid(
                                                                (p) => ({
                                                                    ...p,
                                                                    vehicleChoice:
                                                                        e.target
                                                                            .value,
                                                                })
                                                            )
                                                        }
                                                    >
                                                        {[
                                                            ...new Set([
                                                                defaultExtendedBidForm()
                                                                    .vehicleChoice,
                                                                '대형버스 (45인승)',
                                                                '우등버스 (28~33인승)',
                                                                '미니버스·밴 (12~15인승)',
                                                            ]),
                                                        ].map((opt) => (
                                                            <option
                                                                key={opt}
                                                                value={opt}
                                                            >
                                                                {opt}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-gray-600">
                                                        연식
                                                    </Label>
                                                    <select
                                                        className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm"
                                                        value={
                                                            extendedBid.vehicleYear
                                                        }
                                                        onChange={(e) =>
                                                            setExtendedBid(
                                                                (p) => ({
                                                                    ...p,
                                                                    vehicleYear:
                                                                        e.target
                                                                            .value,
                                                                })
                                                            )
                                                        }
                                                    >
                                                        {Array.from(
                                                            { length: 14 },
                                                            (_, i) => 2016 + i
                                                        ).map((y) => (
                                                            <option
                                                                key={y}
                                                                value={String(y)}
                                                            >
                                                                {y}년
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-b border-gray-100 py-4">
                                                <p className="text-sm font-semibold">
                                                    포함된 부대비용
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <label className="flex cursor-pointer items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="size-4 rounded border-gray-300"
                                                            checked={
                                                                extendedBid.toll
                                                            }
                                                            onChange={(e) =>
                                                                setExtendedBid(
                                                                    (p) => ({
                                                                        ...p,
                                                                        toll: e
                                                                            .target
                                                                            .checked,
                                                                    })
                                                                )
                                                            }
                                                        />
                                                        통행료
                                                    </label>
                                                    <label className="flex cursor-pointer items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="size-4 rounded border-gray-300"
                                                            checked={
                                                                extendedBid.parking
                                                            }
                                                            onChange={(e) =>
                                                                setExtendedBid(
                                                                    (p) => ({
                                                                        ...p,
                                                                        parking:
                                                                            e
                                                                                .target
                                                                                .checked,
                                                                    })
                                                                )
                                                            }
                                                        />
                                                        주차료
                                                    </label>
                                                    <label className="flex cursor-pointer items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="size-4 rounded border-gray-300"
                                                            checked={
                                                                extendedBid.accommodation
                                                            }
                                                            onChange={(e) =>
                                                                setExtendedBid(
                                                                    (p) => ({
                                                                        ...p,
                                                                        accommodation:
                                                                            e
                                                                                .target
                                                                                .checked,
                                                                    })
                                                                )
                                                            }
                                                        />
                                                        숙박비
                                                    </label>
                                                    <label className="flex cursor-pointer items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="size-4 rounded border-gray-300"
                                                            checked={
                                                                extendedBid.meals
                                                            }
                                                            onChange={(e) =>
                                                                setExtendedBid(
                                                                    (p) => ({
                                                                        ...p,
                                                                        meals: e
                                                                            .target
                                                                            .checked,
                                                                    })
                                                                )
                                                            }
                                                        />
                                                        식사비
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="rounded border border-red-200 bg-red-50/50 p-3 text-xs leading-relaxed text-red-800">
                                                <ul className="list-disc space-y-1 pl-4">
                                                    <li>
                                                        낙찰 시 플랫폼
                                                        수수료(예: 10%)가
                                                        정산에서 차감될 수
                                                        있습니다. 잔액·정산
                                                        조건을 확인해 주세요.
                                                    </li>
                                                    <li>
                                                        약속되지 않은 비용(봉사료
                                                        등)을 별도 요구할 경우
                                                        서비스 이용이 제한될 수
                                                        있습니다.
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="space-y-2 py-4">
                                                <Label className="text-sm font-semibold">
                                                    고객님께 남기실 말씀
                                                </Label>
                                                <Textarea
                                                    rows={3}
                                                    placeholder="차량 사진은 프로필에서 확인하실 수 있다는 안내 등"
                                                    value={
                                                        extendedBid.customerMsg
                                                    }
                                                    onChange={(e) =>
                                                        setExtendedBid((p) => ({
                                                            ...p,
                                                            customerMsg:
                                                                e.target.value,
                                                        }))
                                                    }
                                                    className="resize-none text-sm"
                                                />
                                            </div>

                                            <div className="space-y-2 border-t border-gray-100 py-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                                        먼저 말걸기로 낙찰률 ↑
                                                    </span>
                                                    <Label className="text-sm font-semibold">
                                                        고객님께 먼저 말걸기
                                                    </Label>
                                                </div>
                                                <Textarea
                                                    rows={2}
                                                    placeholder="입찰 직후 고객에게 전달되는 한 마디입니다."
                                                    value={
                                                        extendedBid.proactiveMsg
                                                    }
                                                    onChange={(e) =>
                                                        setExtendedBid((p) => ({
                                                            ...p,
                                                            proactiveMsg:
                                                                e.target.value,
                                                        }))
                                                    }
                                                    className="resize-none text-sm"
                                                />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    id="bid-photo-input"
                                                    onChange={onBidPhotosPicked}
                                                />
                                                <div className="flex gap-2">
                                                    {[0, 1, 2].map((slot) => (
                                                        <div
                                                            key={slot}
                                                            className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-gray-300 bg-gray-50"
                                                        >
                                                            {bidPhotoUrls[
                                                                slot
                                                            ] ? (
                                                                <>
                                                                    <img
                                                                        alt=""
                                                                        src={
                                                                            bidPhotoUrls[
                                                                                slot
                                                                            ]
                                                                        }
                                                                        className="size-full object-cover"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-xs text-white"
                                                                        onClick={() =>
                                                                            removeBidPhoto(
                                                                                slot
                                                                            )
                                                                        }
                                                                    >
                                                                        −
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <label
                                                                    htmlFor="bid-photo-input"
                                                                    className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 text-[10px] text-gray-500"
                                                                >
                                                                    <span>
                                                                        📷
                                                                    </span>
                                                                    추가
                                                                </label>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3 border-t border-gray-100 py-4">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    판매할 부가 서비스 (낙찰률
                                                    향상)
                                                </p>
                                                <div className="rounded border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
                                                    <ul className="list-disc space-y-1 pl-4">
                                                        <li>
                                                            예약 이후 추가
                                                            구매에 따른 불이익은
                                                            없습니다.
                                                        </li>
                                                        <li>
                                                            부가 서비스 제공 시
                                                            낙찰 가능성이
                                                            높아집니다.
                                                        </li>
                                                        <li>
                                                            실제 제공 후
                                                            정산되는 구조입니다
                                                            (운영 정책에 따름).
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div className="space-y-3">
                                                    {(
                                                        [
                                                            {
                                                                key: 'water',
                                                                title: '생수',
                                                                tag: '인기',
                                                                price: '3만원~4만원',
                                                                desc:
                                                                    '탑승 인원에 맞춘 생수 준비.',
                                                            },
                                                            {
                                                                key: 'dropoff',
                                                                title:
                                                                    '하차지 추가',
                                                                tag: '추천',
                                                                price: '5만원',
                                                                desc:
                                                                    '복수 하차(거리 한도 내) 제안.',
                                                            },
                                                            {
                                                                key: 'cleaning',
                                                                title:
                                                                    '스마일 청소비',
                                                                tag: '인기',
                                                                price: '3만원',
                                                                desc:
                                                                    '운행 후 정리·청결.',
                                                            },
                                                            {
                                                                key: 'escort',
                                                                title:
                                                                    '하객 인솔 서비스',
                                                                tag: '프리미엄',
                                                                price: '10만원',
                                                                desc:
                                                                    '집결·안내 등 현장 인솔.',
                                                            },
                                                        ] as const
                                                    ).map((row) => (
                                                        <label
                                                            key={row.key}
                                                            className="flex cursor-pointer gap-2 border-b border-gray-100 pb-3 last:border-0"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="mt-1 size-4 rounded border-gray-300"
                                                                disabled={
                                                                    extendedBid.addonOptOut
                                                                }
                                                                checked={
                                                                    extendedBid
                                                                        .addons[
                                                                        row.key
                                                                    ]
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) =>
                                                                    setExtendedBid(
                                                                        (
                                                                            p
                                                                        ) => ({
                                                                            ...p,
                                                                            addons:
                                                                                {
                                                                                    ...p.addons,
                                                                                    [row.key]:
                                                                                        e
                                                                                            .target
                                                                                            .checked,
                                                                                },
                                                                        })
                                                                    )
                                                                }
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                                    <span className="text-sm font-medium">
                                                                        {
                                                                            row.title
                                                                        }
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {
                                                                            row.price
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <span className="mt-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">
                                                                    {row.tag} ·
                                                                    다수 선택
                                                                    가능
                                                                </span>
                                                                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                                                                    {row.desc}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    ))}
                                                    <label className="flex cursor-pointer gap-2 pt-2">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-1 size-4 rounded border-gray-300"
                                                            checked={
                                                                extendedBid.addonOptOut
                                                            }
                                                            onChange={(e) =>
                                                                setExtendedBid(
                                                                    (p) => ({
                                                                        ...p,
                                                                        addonOptOut:
                                                                            e
                                                                                .target
                                                                                .checked,
                                                                        addons: e
                                                                            .target
                                                                            .checked
                                                                            ? {
                                                                                  water:
                                                                                      false,
                                                                                  dropoff:
                                                                                      false,
                                                                                  cleaning:
                                                                                      false,
                                                                                  escort:
                                                                                      false,
                                                                              }
                                                                            : p.addons,
                                                                    })
                                                                )
                                                            }
                                                        />
                                                        <span className="text-xs text-gray-700">
                                                            부가 서비스 수익을
                                                            포기하겠습니다
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 border-t border-gray-200 bg-white px-4 py-3">
                                            <Button
                                                type="button"
                                                className="h-11 w-full rounded-md bg-[#e08030] text-sm font-semibold text-white hover:bg-[#d07526]"
                                                onClick={() =>
                                                    createBid(bidDialogTrip.id)
                                                }
                                            >
                                                입찰하기
                                            </Button>
                                        </div>
                                        </div>
                                    </>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {activeTab === 'contract' && (
                    <div className="mx-auto w-full max-w-xl">
                        <div className="mb-6 grid grid-cols-3 border-b border-gray-200 bg-white">
                            <button
                                type="button"
                                onClick={() => setContractSubTab('reservation')}
                                className={`border-b-2 py-3 text-center text-sm transition-colors ${
                                    contractSubTab === 'reservation'
                                        ? 'border-gray-900 font-semibold text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                예약주문
                            </button>
                            <button
                                type="button"
                                onClick={() => setContractSubTab('bidding')}
                                className={`border-b-2 py-3 text-center text-sm transition-colors ${
                                    contractSubTab === 'bidding'
                                        ? 'border-gray-900 font-semibold text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                입찰
                            </button>
                            <button
                                type="button"
                                onClick={() => setContractSubTab('completed')}
                                className={`border-b-2 py-3 text-center text-sm transition-colors ${
                                    contractSubTab === 'completed'
                                        ? 'border-gray-900 font-semibold text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                운행완료
                            </button>
                        </div>

                        {contractSubTab === 'reservation' && (
                            <>
                                <p className="mb-2 text-left text-sm text-gray-500">
                                    낙찰완료 ({contractReservationCardTrips.length})
                                </p>
                                {contractReservationCardTrips.length > 0 ? (
                                    <div className="divide-y divide-gray-100 overflow-hidden border border-gray-200 bg-white shadow-sm">
                                        {contractReservationCardTrips.map(
                                            (trip) => {
                                                const myBid = trip.bids.find(
                                                    (bid: Bid) =>
                                                        bid.bidder.id ===
                                                            user?.id &&
                                                        bid.status === 'awarded'
                                                );
                                                const partner =
                                                    getRoundPartnerTrip(
                                                        trip,
                                                        contractReservationTrips,
                                                    );
                                                const isRound =
                                                    Boolean(partner);
                                                const km = biddingTripKm(
                                                    trip,
                                                    partner,
                                                    distanceByTripId
                                                );
                                                const { vehicleTag } =
                                                    parseBidNoteForDisplay(
                                                        myBid?.note
                                                    );
                                                const vehicleLabel =
                                                    vehicleTag ||
                                                    getBusLabel(trip.busSize);
                                                const isCancelled =
                                                    trip.status === 'cancelled';

                                                return (
                                                    <div
                                                        key={trip.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        className="cursor-pointer p-4 transition-colors hover:bg-gray-50/80 active:bg-gray-50"
                                                        onClick={() =>
                                                            setMyBidDetail({
                                                                trip,
                                                                partner,
                                                                bidStatus:
                                                                    'awarded',
                                                            })
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key ===
                                                                    'Enter' ||
                                                                e.key === ' '
                                                            ) {
                                                                e.preventDefault();
                                                                setMyBidDetail({
                                                                    trip,
                                                                    partner,
                                                                    bidStatus:
                                                                        'awarded',
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                                                            <p className="text-sm font-semibold leading-snug text-gray-900">
                                                                {formatTripDateLine(
                                                                    trip.dateTime
                                                                )}
                                                                {biddingCompanionSubtitle(
                                                                    trip
                                                                ) ? (
                                                                    <span className="font-normal text-gray-600">
                                                                        {' '}
                                                                        {biddingCompanionSubtitle(
                                                                            trip
                                                                        )}
                                                                    </span>
                                                                ) : null}
                                                            </p>
                                                            <span className="shrink-0 text-sm font-semibold text-gray-900">
                                                                {trip.paxCount}
                                                                명
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-3 py-3">
                                                            <TripRouteTypeColumn
                                                                isRound={isRound}
                                                                km={km}
                                                            />
                                                            <div className="min-w-0 flex-1 space-y-2 text-sm">
                                                                <p className="flex items-start gap-2 leading-snug text-gray-900">
                                                                    <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                                                                        출발지
                                                                    </span>
                                                                    <span className="min-w-0 font-medium">
                                                                        {
                                                                            trip.origin
                                                                        }
                                                                    </span>
                                                                </p>
                                                                <p className="flex items-start gap-2 leading-snug text-gray-900">
                                                                    <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                                                                        도착지
                                                                    </span>
                                                                    <span className="min-w-0 font-medium">
                                                                        {
                                                                            trip.destination
                                                                        }
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                                                                    {Number(
                                                                        myBid?.price ??
                                                                            0
                                                                    ).toLocaleString()}
                                                                    만원
                                                                </span>
                                                                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                                                                    {
                                                                        vehicleLabel
                                                                    }
                                                                </span>
                                                            </div>
                                                            {isCancelled ? (
                                                                <span className="shrink-0 rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600">
                                                                    승객취소
                                                                </span>
                                                            ) : (
                                                                <span className="shrink-0 rounded-full border border-green-500 bg-white px-2.5 py-1 text-xs font-medium text-green-600">
                                                                    낙찰완료
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                ) : (
                                    <p className="py-8 text-center text-gray-500">
                                        예약된 낙찰 여정이 없습니다
                                    </p>
                                )}
                            </>
                        )}

                        {contractSubTab === 'bidding' && (
                            <>
                                <p className="mb-2 text-left text-xs font-medium text-gray-600">
                                    입찰진행중 ({myBidCardTrips.length})
                                </p>
                                {myBidCardTrips.length > 0 ? (
                                    <div className="space-y-3">
                                        {myBidCardTrips.map((trip) => {
                                            const myBid = trip.bids.find(
                                                (bid: Bid) =>
                                                    bid.bidder.id === user?.id &&
                                                    bid.status === 'open'
                                            );
                                            const partner = getRoundPartnerTrip(
                                                trip,
                                                openTripsPool,
                                            );
                                            const isRound = Boolean(partner);
                                            const km = biddingTripKm(
                                                trip,
                                                partner,
                                                distanceByTripId
                                            );
                                            const { vehicleTag } =
                                                parseBidNoteForDisplay(
                                                    myBid?.note
                                                );
                                            const bidAge = formatBidAgeLabel(
                                                myBid?.createdAt
                                            );
                                            const vehicleLabel =
                                                vehicleTag ||
                                                getBusLabel(trip.busSize);
                                            return (
                                                <div
                                                    key={trip.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    className="cursor-pointer border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50/80 active:bg-gray-50"
                                                    onClick={() =>
                                                        setMyBidDetail({
                                                            trip,
                                                            partner,
                                                            bidStatus: 'open',
                                                        })
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (
                                                            e.key ===
                                                                'Enter' ||
                                                            e.key === ' '
                                                        ) {
                                                            e.preventDefault();
                                                            setMyBidDetail({
                                                                trip,
                                                                partner,
                                                                bidStatus:
                                                                    'open',
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                                                        <p className="text-sm font-semibold leading-snug text-gray-900">
                                                            {formatTripDateLine(
                                                                trip.dateTime
                                                            )}
                                                            {biddingCompanionSubtitle(
                                                                trip
                                                            ) ? (
                                                                <span className="font-normal text-gray-600">
                                                                    {' '}
                                                                    {biddingCompanionSubtitle(
                                                                        trip
                                                                    )}
                                                                </span>
                                                            ) : null}
                                                        </p>
                                                        <span className="shrink-0 text-sm font-medium text-gray-900">
                                                            {trip.paxCount}명
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-3 py-3">
                                                        <TripRouteTypeColumn
                                                            isRound={isRound}
                                                            km={km}
                                                        />
                                                        <div className="min-w-0 flex-1 space-y-2 text-sm">
                                                            <p className="flex items-start gap-2 leading-snug text-gray-900">
                                                                <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                                                                    출발지
                                                                </span>
                                                                <span className="min-w-0 font-medium">
                                                                    {trip.origin}
                                                                </span>
                                                            </p>
                                                            <p className="flex items-start gap-2 leading-snug text-gray-900">
                                                                <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                                                                    도착지
                                                                </span>
                                                                <span className="min-w-0 font-medium">
                                                                    {
                                                                        trip.destination
                                                                    }
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                                                                {Number(
                                                                    myBid?.price ??
                                                                        0
                                                                ).toLocaleString()}
                                                                만원
                                                            </span>
                                                            <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                                                                {vehicleLabel}
                                                            </span>
                                                            {bidAge && (
                                                                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                                                    {bidAge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            className="shrink-0 rounded-md border-0 bg-amber-300 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-amber-400"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleWithdrawBid(
                                                                    trip
                                                                );
                                                            }}
                                                        >
                                                            입찰취소하기
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="py-8 text-center text-gray-500">
                                        입찰 진행 중인 여정이 없습니다
                                    </p>
                                )}
                            </>
                        )}

                        {contractSubTab === 'completed' && (
                            <>
                                <p className="mb-2 text-left text-sm text-gray-500">
                                    종료됨 ({contractCompletedCardTrips.length})
                                </p>
                                {contractCompletedCardTrips.length > 0 ? (
                                    <div className="divide-y divide-gray-100 overflow-hidden border border-gray-200 bg-white shadow-sm">
                                        {contractCompletedCardTrips.map(
                                            (trip) => {
                                                const myBid = trip.bids.find(
                                                    (bid: Bid) =>
                                                        bid.bidder.id ===
                                                            user?.id &&
                                                        bid.status === 'awarded'
                                                );
                                                const partner =
                                                    getRoundPartnerTrip(
                                                        trip,
                                                        contractCompletedTrips,
                                                    );
                                                const isRound =
                                                    Boolean(partner);
                                                const km = biddingTripKm(
                                                    trip,
                                                    partner,
                                                    distanceByTripId
                                                );
                                                const { vehicleTag } =
                                                    parseBidNoteForDisplay(
                                                        myBid?.note
                                                    );
                                                const vehicleLabel =
                                                    vehicleTag ||
                                                    getBusLabel(trip.busSize);
                                                return (
                                                    <div
                                                        key={trip.id}
                                                        className="p-4"
                                                    >
                                                        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                                                            <p className="text-sm font-semibold leading-snug text-gray-900">
                                                                {formatTripDateLine(
                                                                    trip.dateTime
                                                                )}
                                                                {biddingCompanionSubtitle(
                                                                    trip
                                                                ) ? (
                                                                    <span className="font-normal text-gray-600">
                                                                        {' '}
                                                                        {biddingCompanionSubtitle(
                                                                            trip
                                                                        )}
                                                                    </span>
                                                                ) : null}
                                                            </p>
                                                            <span className="shrink-0 text-sm font-semibold text-gray-900">
                                                                {trip.paxCount}
                                                                명
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-3 py-3">
                                                            <TripRouteTypeColumn
                                                                isRound={isRound}
                                                                km={km}
                                                            />
                                                            <div className="min-w-0 flex-1 space-y-2 text-sm">
                                                                <p className="flex items-start gap-2 leading-snug text-gray-900">
                                                                    <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                                                                        출발지
                                                                    </span>
                                                                    <span className="min-w-0 font-medium">
                                                                        {
                                                                            trip.origin
                                                                        }
                                                                    </span>
                                                                </p>
                                                                <p className="flex items-start gap-2 leading-snug text-gray-900">
                                                                    <span className="w-11 shrink-0 pt-0.5 text-[11px] font-semibold text-gray-500">
                                                                        도착지
                                                                    </span>
                                                                    <span className="min-w-0 font-medium">
                                                                        {
                                                                            trip.destination
                                                                        }
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                                                                    {Number(
                                                                        myBid?.price ??
                                                                            0
                                                                    ).toLocaleString()}
                                                                    만원
                                                                </span>
                                                                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-800">
                                                                    {
                                                                        vehicleLabel
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                ) : (
                                    <p className="py-8 text-center text-gray-500">
                                        운행 완료된 여정이 없습니다
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'chat' && (
                    <Card className="mx-auto w-full max-w-xl gap-0 rounded-none border-gray-200 py-0 shadow-sm">
                        <CardContent className="p-0">
                            <ChatPanel
                                fillRoomHeight
                                focusRoomId={chatFocusRoomId}
                                onFocusRoomConsumed={() =>
                                    setChatFocusRoomId(null)
                                }
                            />
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'support' && (
                    <SupportCustomerCenter
                        heading="고객센터"
                        showInquiry
                        refreshMyInquiriesKey={driverInquiryListKey}
                        onInquiryClick={() => {
                            setDriverSupportOpen(true);
                            setDriverSupportStep('menu');
                        }}
                    />
                )}


                {activeTab === 'profile' && (
                    <>
                        <div className="fixed inset-x-0 top-0 z-30 border-b bg-white/95 backdrop-blur">
                            <div className="relative flex w-full items-center justify-center px-4 py-3 text-sm">
                                <button
                                    type="button"
                                    className="absolute left-4 text-gray-600"
                                    onClick={() => setActiveTab('available')}
                                >
                                    ←
                                </button>
                                <span className="font-semibold">나의 정보</span>
                                <button
                                    type="button"
                                    className="absolute right-4 text-gray-600"
                                    onClick={() => setActiveTab('available')}
                                >
                                    ⌂
                                </button>
                            </div>
                        </div>

                        <div className="mx-auto w-full max-w-3xl pb-24 pt-12">
                            <div className="overflow-hidden border bg-white">
                                <div className="h-48 bg-gray-200">
                                    {bannerUrl ? (
                                        <button
                                            type="button"
                                            className="h-full w-full"
                                            onClick={() => openGallery(0)}
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
                                        <div className="h-20 w-20 rounded-full bg-gray-200 border-4 border-white overflow-hidden">
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
                                            {(() => {
                                                const { stars, label } =
                                                    formatDriverRatingStars(
                                                        driverReviewStats.avgRating,
                                                        driverReviewStats.count,
                                                    );
                                                return `${stars} ${label}`;
                                            })()}
                                        </p>
                                        <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-gray-600">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    차종
                                                </p>
                                                <p>{vehicleTypeLabel}</p>
                                                {vehicleCapacityLabel && (
                                                    <p>{vehicleCapacityLabel}</p>
                                                )}
                                                {vehicleYearLabel && (
                                                    <p>{vehicleYearLabel}</p>
                                                )}
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
                                        <div className="grid grid-cols-2 border-b text-sm">
                                            <button
                                                type="button"
                                                className={`py-2 ${
                                                    profileSection === 'details'
                                                        ? 'border-b-2 border-black font-semibold text-black'
                                                        : 'text-gray-500'
                                                }`}
                                                onClick={() =>
                                                    setProfileSection('details')
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
                                                    setProfileSection('review')
                                                }
                                            >
                                                후기
                                            </button>
                                        </div>
                                        {profileSection === 'details' ? (
                                            <div className="space-y-4 py-4 text-sm text-gray-700">
                                                <div>
                                                    <p className="mb-2 font-semibold">
                                                        등록 차량
                                                    </p>
                                                    {vehiclePhotos.length > 0 ? (
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {vehiclePhotos.map(
                                                                (photo, idx) => (
                                                                    <img
                                                                        key={
                                                                            photo +
                                                                            idx
                                                                        }
                                                                        src={photo}
                                                                        alt="등록 차량"
                                                                        className="aspect-square w-full cursor-pointer rounded-md object-cover"
                                                                        onClick={() =>
                                                                            openGallery(
                                                                                idx
                                                                            )
                                                                        }
                                                                    />
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-500">
                                                            등록된 차량 사진이
                                                            없습니다.
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="mb-2 font-semibold">
                                                        차량 정보
                                                    </p>
                                                    <div className="rounded-md border bg-gray-50 p-3 text-gray-700">
                                                        <p>{vehicleTypeLabel}</p>
                                                        {vehicleCapacityLabel && (
                                                            <p>
                                                                {
                                                                    vehicleCapacityLabel
                                                                }
                                                            </p>
                                                        )}
                                                        {vehicleYearLabel && (
                                                            <p>{vehicleYearLabel}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="mb-2 font-semibold">
                                                        기사님의 한마디
                                                    </p>
                                                    <div className="rounded-md border bg-gray-50 p-3 text-gray-700">
                                                        {profileForm.driverComment ||
                                                            '아직 작성된 한마디가 없습니다.'}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <DriverReviewsList
                                                    reviews={driverReviews}
                                                    resolveImageUrl={(url) =>
                                                        resolveMediaUrl(url) ??
                                                        url
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-black">
                            <Button
                                className="h-12 w-full rounded-none bg-black text-white hover:bg-black/90"
                                onClick={() => setActiveTab('profileEdit')}
                            >
                                정보 수정하기
                            </Button>
                        </div>

                        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
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
                                    {vehiclePhotos.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
                                                onClick={showPrevPhoto}
                                            >
                                                ‹
                                            </button>
                                            <button
                                                type="button"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
                                                onClick={showNextPhoto}
                                            >
                                                ›
                                            </button>
                                        </>
                                    )}
                                </div>
                                <p className="text-center text-xs text-gray-300">
                                    {galleryIndex + 1} / {vehiclePhotos.length}
                                </p>
                            </DialogContent>
                        </Dialog>
                    </>
                )}

                {activeTab === 'profileEdit' && (
                    <>
                        <div className="fixed inset-x-0 top-0 z-30 border-b bg-white/95 backdrop-blur">
                            <div className="relative flex w-full items-center justify-center px-4 py-3 text-sm">
                                <button
                                    type="button"
                                    className="absolute left-4 text-gray-600"
                                    onClick={() => setActiveTab('profile')}
                                >
                                    ←
                                </button>
                                <span className="font-semibold">정보 수정</span>
                                <button
                                    type="button"
                                    className="absolute right-4 text-gray-600"
                                    onClick={() => setActiveTab('available')}
                                >
                                    ⌂
                                </button>
                            </div>
                        </div>
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
                                            얼굴이 잘 보이는 사진을 등록해주세요.
                                        </p>
                                        <input
                                            id="driver-profile-photo"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file =
                                                    e.target.files?.[0] || null;
                                                setProfilePhotoFile(file);
                                                setProfilePhoto(
                                                    file
                                                        ? URL.createObjectURL(file)
                                                        : null
                                                );
                                            }}
                                        />
                                        <label
                                            htmlFor="driver-profile-photo"
                                            className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-sm bg-[#4a4a4a] px-8 text-sm font-medium text-white transition hover:bg-[#3f3f3f]"
                                        >
                                            사진 등록
                                        </label>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <Label className="text-sm text-gray-700">
                                                이름
                                            </Label>
                                            <Input
                                                className="rounded-none border-x-0 border-t-0 border-b border-gray-200 px-0 shadow-none focus-visible:ring-0"
                                                value={profileForm.name}
                                                onChange={(e) =>
                                                    setProfileForm((prev) => ({
                                                        ...prev,
                                                        name: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm text-gray-700">
                                                소속
                                            </Label>
                                            <Input
                                                className="rounded-none border-x-0 border-t-0 border-b border-gray-200 px-0 shadow-none focus-visible:ring-0"
                                                value={profileForm.company}
                                                onChange={(e) =>
                                                    setProfileForm((prev) => ({
                                                        ...prev,
                                                        company: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm text-gray-700">
                                                휴대전화번호
                                            </Label>
                                            <Input
                                                className="rounded-none border-x-0 border-t-0 border-b border-gray-200 px-0 shadow-none focus-visible:ring-0"
                                                value={profileForm.phone}
                                                onChange={(e) =>
                                                    setProfileForm((prev) => ({
                                                        ...prev,
                                                        phone: e.target.value,
                                                    }))
                                                }
                                                placeholder="010-1234-5678"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm text-gray-700">
                                                차고지 주소
                                            </Label>
                            {garageStatusMessage && (
                                <p className="text-xs text-gray-400">
                                    {garageStatusMessage}
                                </p>
                            )}
                            <div className="relative">
                                <Input
                                    className="rounded-none border-x-0 border-t-0 border-b border-gray-200 px-0 shadow-none focus-visible:ring-0"
                                    value={profileForm.garage}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            garage: value,
                                        }));
                                        searchGaragePlaces(value);
                                    }}
                                />
                                {garageResults.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5">
                                        {garageResults.map((place) => (
                                            <button
                                                key={place.id}
                                                type="button"
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                                                onClick={() => {
                                                    setProfileForm((prev) => ({
                                                        ...prev,
                                                        garage:
                                                            place.road_address_name ||
                                                            place.address_name ||
                                                            place.place_name,
                                                    }));
                                                    setGarageResults([]);
                                                }}
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
                                )}
                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm text-gray-700">
                                                차량 번호
                                            </Label>
                                            <Input
                                                className="rounded-none border-x-0 border-t-0 border-b border-gray-200 px-0 shadow-none focus-visible:ring-0"
                                                value={profileForm.busNumber}
                                                onChange={(e) =>
                                                    setProfileForm((prev) => ({
                                                        ...prev,
                                                        busNumber: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-5 sm:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label className="text-sm text-gray-700">
                                                    차량 종류
                                                </Label>
                                                <Input
                                                    className="rounded-none border-x-0 border-t-0 border-b border-gray-200 px-0 shadow-none focus-visible:ring-0"
                                                    value={profileForm.busType}
                                                    onChange={(e) =>
                                                        setProfileForm((prev) => ({
                                                            ...prev,
                                                            busType: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm text-gray-700">
                                                    연식
                                                </Label>
                                                <Input
                                                    className="rounded-none border-x-0 border-t-0 border-b border-gray-200 px-0 shadow-none focus-visible:ring-0"
                                                    value={profileForm.busYear}
                                                    onChange={(e) =>
                                                        setProfileForm((prev) => ({
                                                            ...prev,
                                                            busYear: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm text-gray-700">
                                                    탑승 정원
                                                </Label>
                                                <Input
                                                    className="rounded-none border-x-0 border-t-0 border-b border-gray-200 px-0 text-right shadow-none focus-visible:ring-0"
                                                    value={profileForm.capacity}
                                                    onChange={(e) =>
                                                        setProfileForm((prev) => ({
                                                            ...prev,
                                                            capacity: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm text-gray-700">
                                                차량 사진
                                            </Label>
                                            <input
                                                id="driver-vehicle-photos"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={(e) =>
                                                    addVehiclePhotos(
                                                        e.target.files
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor="driver-vehicle-photos"
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
                                                                removeVehiclePhoto(
                                                                    idx
                                                                )
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
                                            버스 운전 자격증
                                        </Label>
                                        {driverLicenseUrl ? (
                            <div className="grid grid-cols-4 gap-2">
                                <div className="aspect-square overflow-hidden rounded-md bg-gray-50">
                                    <img
                                        src={`${uploadBaseUrl}${driverLicenseUrl}`}
                                        alt="운전자격증"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">
                                                등록된 자격증이 없습니다.
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-700">
                                            기사님의 한마디
                                        </Label>
                                        <Textarea
                                            className="min-h-24 border-gray-200"
                                            placeholder="예) 안전하고 친절한 운행으로 모시겠습니다."
                                            value={profileForm.driverComment}
                                            onChange={(e) =>
                                                setProfileForm((prev) => ({
                                                    ...prev,
                                                    driverComment:
                                                        e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-black">
                            <Button
                                className="h-12 w-full rounded-none bg-black text-white hover:bg-black/90"
                                onClick={handleProfileSave}
                            >
                                정보 수정 완료
                            </Button>
                        </div>
                    </>
                )}

                {activeTab === 'paymentCards' && (
                    <PaymentCardsPanel userId={user?.id} />
                )}

                {activeTab === 'membership' && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold">콜버스 멤버십</h2>
                            <p className="text-sm text-gray-600">
                                뿌린대로 거두리라
                            </p>
                        </div>
                        <div className="space-y-3">
                            {membershipPlans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className="rounded-lg border bg-white"
                                >
                                    <button
                                        type="button"
                                        className="w-full flex items-center justify-between px-4 py-3"
                                        onClick={() =>
                                            setOpenMembership(
                                                openMembership === plan.id
                                                    ? null
                                                    : plan.id
                                            )
                                        }
                                    >
                                        <span className="font-semibold">
                                            {plan.name}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                            {plan.price}
                                        </span>
                                    </button>
                                    {openMembership === plan.id && (
                                        <div className="border-t px-4 py-4 space-y-3">
                                            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                                                {plan.features.map((feature) => (
                                                    <li key={feature}>
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                            <Button
                                                className="w-full"
                                                onClick={() =>
                                                    alert(
                                                        '결제 기능 구현 전입니다.'
                                                    )
                                                }
                                            >
                                                멤버십 선택
                                            </Button>
                                            <p className="text-xs text-gray-500 text-center">
                                                월 정기결제 상품이며 언제든 취소
                                                가능합니다.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        {menuOpen && (
            <div className="fixed inset-0 z-40 bg-black/30">
                <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-lg p-6 space-y-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden">
                            {profilePhoto ? (
                                <img
                                    src={profilePhoto}
                                    alt="프로필"
                                    className="h-full w-full object-cover"
                                />
                            ) : null}
                        </div>
                        <p className="mt-3 text-lg font-semibold">{displayName}</p>
                        <p className="text-xs text-gray-500">★★★★☆</p>
                    </div>
                    <div className="divide-y border-y">
                        <button
                            type="button"
                            className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                            onClick={() => {
                                setActiveTab('profile');
                                setMenuOpen(false);
                            }}
                        >
                            나의 정보
                        </button>
                        <button
                            type="button"
                            className="w-full flex items-center justify-between px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                            onClick={() => {
                                setMembershipPrevTab(
                                    activeTab === 'membership'
                                        ? 'available'
                                        : activeTab
                                );
                                setActiveTab('membership');
                                setMenuOpen(false);
                            }}
                        >
                            <span>멤버십</span>
                            <span className="text-xs text-gray-500">
                                {currentMembershipLabel}
                            </span>
                        </button>
                        <button
                            type="button"
                            className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                            onClick={() => {
                                setPaymentCardsPrevTab(
                                    activeTab === 'paymentCards'
                                        ? 'available'
                                        : activeTab,
                                );
                                setActiveTab('paymentCards');
                                setMenuOpen(false);
                            }}
                        >
                            결제카드
                        </button>
                        <button
                            type="button"
                            className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setMenuOpen(false)}
                    >
                        닫기
                    </Button>
                </div>
            </div>
        )}
        {activeTab !== 'profile' &&
            activeTab !== 'profileEdit' &&
            activeTab !== 'paymentCards' && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-4 py-2.5 sm:px-5">
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab('available')}
                        className={`h-9 flex-1 rounded-none px-1 text-xs sm:text-sm hover:bg-gray-100 ${
                            activeTab === 'available'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                        }`}
                    >
                        주문
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab('contract')}
                        className={`h-9 flex-1 rounded-none px-1 text-xs sm:text-sm hover:bg-gray-100 ${
                            activeTab === 'contract'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                        }`}
                    >
                        계약
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab('chat')}
                        className={`h-9 flex-1 rounded-none px-1 text-xs sm:text-sm hover:bg-gray-100 ${
                            activeTab === 'chat'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                        }`}
                    >
                        채팅
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setActiveTab('support')}
                        className={`h-9 flex-1 rounded-none px-1 text-xs sm:text-sm hover:bg-gray-100 ${
                            activeTab === 'support'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                        }`}
                    >
                        문의
                    </Button>
                </div>
            </div>
        )}
        <Dialog open={regionFilterOpen} onOpenChange={setRegionFilterOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>원하는 출발지를 모두 선택하세요</DialogTitle>
                    <DialogDescription>
                        지역을 선택하면 필터에 적용됩니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-2">
                    {regions.map((region) => (
                        <Button
                            key={region}
                            variant={
                                selectedRegions.includes(region)
                                    ? 'default'
                                    : 'outline'
                            }
                            onClick={() =>
                                setSelectedRegions((prev) =>
                                    prev.includes(region)
                                        ? prev.filter((r) => r !== region)
                                        : [...prev, region]
                                )
                            }
                        >
                            {region}
                        </Button>
                    ))}
                </div>
                <Button onClick={() => setRegionFilterOpen(false)}>확인</Button>
            </DialogContent>
        </Dialog>

        <Dialog open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>원하는 출발일을 선택하세요</DialogTitle>
                    <DialogDescription>
                        날짜를 선택하면 필터에 적용됩니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <input
                        ref={dateFilterInputRef}
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="sr-only"
                    />
                    <button
                        type="button"
                        onClick={openDateFilterPicker}
                        className="flex h-12 w-full items-center justify-between border-b border-gray-300 px-0 text-left text-sm"
                    >
                        <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
                            {selectedDate || '날짜를 입력하세요'}
                        </span>
                        <CalendarDays className="h-5 w-5 text-black" aria-hidden />
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Button onClick={() => setDateFilterOpen(false)}>확인</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={paxFilterOpen} onOpenChange={setPaxFilterOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>인원수를 입력해주세요</DialogTitle>
                    <DialogDescription>
                        최소/최대 인원으로 필터링합니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            type="number"
                            placeholder="최소"
                            value={minPax}
                            onChange={(e) => setMinPax(e.target.value)}
                            className="no-number-spin h-12 rounded-none border-0 border-b border-gray-300 px-0 shadow-none focus-visible:ring-0"
                        />
                        <Input
                            type="number"
                            placeholder="최대"
                            value={maxPax}
                            onChange={(e) => setMaxPax(e.target.value)}
                            className="no-number-spin h-12 rounded-none border-0 border-b border-gray-300 px-0 shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Button onClick={() => setPaxFilterOpen(false)}>확인</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}

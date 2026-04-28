'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authAPI, tripsAPI, bidsAPI, verificationAPI, profileAPI } from '@/lib/api';
import { Notifications } from '@/components/Notifications';
import { ChatPanel } from '@/components/ChatPanel';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface Trip {
    id: string;
    origin: string;
    destination: string;
    dateTime: string;
    paxCount: number;
    busSize: string;
    status: string;
    bids: Bid[];
}

interface Bid {
    id: string;
    price: number;
    note?: string;
    status: string;
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
}

export default function CompanyDashboard() {
    const [user, setUser] = useState<any>(null);
    const [membershipPlan, setMembershipPlan] = useState<any>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [myBids, setMyBids] = useState<Trip[]>([]);
    const [awardedTrips, setAwardedTrips] = useState<Trip[]>([]);
    const [bidData, setBidData] = useState({ price: 0, note: '' });
    const [verification, setVerification] = useState<any>(null);
    const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
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
        | 'profile'
        | 'profileEdit'
    >('available');
    const [membershipPrevTab, setMembershipPrevTab] = useState<
        'available' | 'contract' | 'chat' | 'support' | 'profile' | 'profileEdit'
    >('available');
    const [regionFilterOpen, setRegionFilterOpen] = useState(false);
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [paxFilterOpen, setPaxFilterOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
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
    });
    const [garageResults, setGarageResults] = useState<KakaoPlace[]>([]);
    const [garageStatusMessage, setGarageStatusMessage] = useState('');
    const displayName = profileForm.name || user?.email?.split('@')[0] || '버스 회사';
    const bannerUrl = vehiclePhotos[0] || null;
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const companyRegistrationUrl =
        verification?.companyRegistrationUrl || user?.companyRegistrationUrl || null;
    const vehicleTypeLabel = profileForm.busType || '미등록';
    const vehicleCapacityLabel = profileForm.capacity
        ? `${profileForm.capacity}인승`
        : null;
    const vehicleYearLabel = profileForm.busYear
        ? `(${profileForm.busYear}년식)`
        : null;
    const insuranceLabel =
        verification?.companyRegistrationStatus === 'approved' ? '인증완료' : '미인증';
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
        if (activeTab === 'contract') {
            loadData();
        }
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

    async function createBid(tripId: string) {
        if (bidData.price <= 0) {
            alert('올바른 가격을 입력해주세요 (양수만 가능)');
            return;
        }

        try {
            if (verification?.companyRegistrationStatus !== 'approved') {
                setVerificationDialogOpen(true);
                return;
            }
            await bidsAPI.create(tripId, bidData.price, bidData.note);
            setBidData({ price: 0, note: '' });
            await loadData();
        } catch (error: any) {
            await loadData();
            alert(error?.message || '입찰 생성에 실패했습니다');
        }
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

    function filterTrips(list: Trip[]) {
        return list.filter((trip) => {
            if (selectedRegion && !trip.origin.includes(selectedRegion)) {
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

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

                <Dialog
                    open={verificationDialogOpen}
                    onOpenChange={setVerificationDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>사업자등록증 등록</DialogTitle>
                            <DialogDescription>
                                입찰을 진행하려면 사업자등록증을 등록하고
                                승인을 받아야 합니다.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            {verification?.companyRegistrationStatus && (
                                <p className="text-sm text-gray-600">
                                    현재 상태:{' '}
                                    {verification.companyRegistrationStatus}
                                </p>
                            )}
                            {verification?.companyRegistrationNote && (
                                <p className="text-sm text-gray-600">
                                    반려 사유: {verification.companyRegistrationNote}
                                </p>
                            )}
                            {verification?.companyRegistrationUrl && (
                                <img
                                    src={`${uploadBaseUrl}${verification.companyRegistrationUrl}`}
                                    alt="사업자등록증"
                                    className="max-h-56 w-full rounded border object-contain bg-white"
                                />
                            )}
                            <div className="space-y-2">
                                <Label>사업자등록증 이미지</Label>
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

                {activeTab === 'available' && (
                    <div>
                        <div className="mb-6 flex justify-center w-full">
                            <div className="flex flex-wrap gap-2 rounded-full border bg-white px-3 py-2 shadow-sm w-full justify-between sm:justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setRegionFilterOpen(true)}
                                    className="rounded-full"
                                >
                                    {selectedRegion
                                        ? `출발지역: ${selectedRegion}`
                                        : '출발지역'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setDateFilterOpen(true)}
                                    className="rounded-full"
                                >
                                    {selectedDate
                                        ? `출발일: ${selectedDate}`
                                        : '출발일'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setPaxFilterOpen(true)}
                                    className="rounded-full"
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
                                        setSelectedRegion(null);
                                        setSelectedDate('');
                                        setMinPax('');
                                        setMaxPax('');
                                    }}
                                    className="rounded-full"
                                >
                                    필터 초기화
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            {filterTrips(trips).map((trip) => (
                                <Card key={trip.id} className="w-full border-gray-200 shadow-sm">
                                    <CardHeader>
                                        <div className="flex justify-between">
                                            <div>
                                                <CardTitle>
                                                    {trip.origin} →{' '}
                                                    {trip.destination}
                                                </CardTitle>
                                                <p className="text-sm text-gray-600">
                                                    {format(
                                                        new Date(trip.dateTime),
                                                        'PPP p'
                                                    )}
                                                </p>
                                            </div>
                                            <Badge>{trip.status === 'open' ? '진행중' : trip.status === 'awarded' ? '낙찰됨' : '취소됨'}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p>승객 수: {trip.paxCount}</p>
                                        <p>버스 크기: {trip.busSize === 'small' ? '소형' : trip.busSize === 'medium' ? '중형' : '대형'}</p>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button className="mt-2 w-full sm:w-auto">
                                                    입찰하기
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        입찰하기
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        입찰 정보를 입력하세요
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div>
                                                        <Label>가격 ($)</Label>
                                                        <Input
                                                            type="number"
                                                            value={
                                                                bidData.price ===
                                                                    0 ||
                                                                bidData.price
                                                                    ? String(
                                                                          bidData.price
                                                                      )
                                                                    : ''
                                                            }
                                                            onChange={(e) =>
                                                                setBidData({
                                                                    ...bidData,
                                                                    price:
                                                                        e.target
                                                                            .value ===
                                                                        ''
                                                                            ? 0
                                                                            : parseFloat(
                                                                                  e
                                                                                      .target
                                                                                      .value
                                                                              ) ||
                                                                              0,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>
                                                            메모 (선택사항)
                                                        </Label>
                                                        <Textarea
                                                            value={bidData.note}
                                                            onChange={(e) =>
                                                                setBidData({
                                                                    ...bidData,
                                                                    note: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={() =>
                                                            createBid(trip.id)
                                                        }
                                                        disabled={
                                                            bidData.price <= 0
                                                        }
                                                    >
                                                        입찰 제출
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'contract' && (
                    <>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-4">
                                낙찰된 여정
                            </h2>
                            {awardedTrips.length > 0 ? (
                                <div className="grid gap-6">
                                    {awardedTrips.map((trip) => {
                                        const myBid = trip.bids.find(
                                            (bid: Bid) =>
                                                bid.bidder.id === user?.id &&
                                                bid.status === 'awarded'
                                        );
                                        return (
                                            <Card
                                                key={trip.id}
                                                className="border-green-500"
                                            >
                                                <CardHeader>
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <CardTitle>
                                                                {trip.origin} →{' '}
                                                                {
                                                                    trip.destination
                                                                }
                                                            </CardTitle>
                                                            <p className="text-sm text-gray-600">
                                                                {format(
                                                                    new Date(
                                                                        trip.dateTime
                                                                    ),
                                                                    'PPP p'
                                                                )}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-green-500">
                                                            낙찰됨
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p>
                                                        승객 수: {trip.paxCount}
                                                    </p>
                                                    <p>
                                                        버스 크기:{' '}
                                                        {trip.busSize === 'small'
                                                            ? '소형'
                                                            : trip.busSize ===
                                                                'medium'
                                                              ? '중형'
                                                              : '대형'}
                                                    </p>
                                                    <div className="mt-4 p-3 bg-green-100 rounded">
                                                        <p className="font-bold text-green-800">
                                                            🎉 낙찰가: $
                                                            {myBid?.price}
                                                        </p>
                                                        {myBid?.note && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {myBid.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    낙찰된 여정이 없습니다
                                </p>
                            )}
                        </div>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-4">
                                내 입찰
                            </h2>
                            {myBids.length > 0 ? (
                                <div className="grid gap-6">
                                    {myBids.map((trip) => {
                                        const myBid = trip.bids.find(
                                            (bid: Bid) =>
                                                bid.bidder.id === user?.id &&
                                                bid.status === 'open'
                                        );
                                        return (
                                            <Card key={trip.id} className="border-gray-200 shadow-sm">
                                                <CardHeader>
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <CardTitle>
                                                                {trip.origin} →{' '}
                                                                {
                                                                    trip.destination
                                                                }
                                                            </CardTitle>
                                                            <p className="text-sm text-gray-600">
                                                                {format(
                                                                    new Date(
                                                                        trip.dateTime
                                                                    ),
                                                                    'PPP p'
                                                                )}
                                                            </p>
                                                        </div>
                                                        <Badge>입찰 완료</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p>
                                                        승객 수: {trip.paxCount}
                                                    </p>
                                                    <p>
                                                        버스 크기:{' '}
                                                        {trip.busSize === 'small'
                                                            ? '소형'
                                                            : trip.busSize ===
                                                                'medium'
                                                              ? '중형'
                                                              : '대형'}
                                                    </p>
                                                    <div className="mt-4 p-3 bg-green-50 rounded">
                                                        <p className="font-semibold text-green-700">
                                                            내 입찰가: $
                                                            {myBid?.price}
                                                        </p>
                                                        {myBid?.note && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {myBid.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="destructive"
                                                        className="mt-4"
                                                        onClick={() =>
                                                            handleWithdrawBid(
                                                                trip
                                                            )
                                                        }
                                                    >
                                                        입찰 철회
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    입찰한 내역이 없습니다
                                </p>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'chat' && (
                    <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-6 space-y-3 text-sm text-gray-600">
                            <ChatPanel />
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'support' && (
                    <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-6 space-y-3 text-sm text-gray-600">
                            고객센터 문의 영역입니다. 문의 유형별로 분류하고
                            처리 상태를 추적하도록 확장할 수 있습니다.
                            <Button className="mt-2 w-full sm:w-auto">
                                문의하기
                            </Button>
                        </CardContent>
                    </Card>
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
                            <div className="rounded-2xl overflow-hidden border bg-white">
                                <div className="h-40 bg-gray-200">
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
                                            ★★★★☆ (4.9)
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
                                    <div className="mt-6 space-y-4">
                                        <h3 className="text-sm font-semibold">
                                            상세내역
                                        </h3>
                                        <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700">
                                            <p>{vehicleTypeLabel}</p>
                                            {vehicleCapacityLabel && (
                                                <p>{vehicleCapacityLabel}</p>
                                            )}
                                            {vehicleYearLabel && (
                                                <p>{vehicleYearLabel}</p>
                                            )}
                                        </div>
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
                                            회사나 기사 이미지가 잘 보이게 등록해주세요.
                                        </p>
                                        <input
                                            id="company-profile-photo"
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
                                            htmlFor="company-profile-photo"
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
                                                                    setProfileForm(
                                                                        (prev) => ({
                                                                            ...prev,
                                                                            garage:
                                                                                place.road_address_name ||
                                                                                place.address_name ||
                                                                                place.place_name,
                                                                        })
                                                                    );
                                                                    setGarageResults(
                                                                        []
                                                                    );
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
                                                id="company-vehicle-photos"
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
                                                htmlFor="company-vehicle-photos"
                                                className="cursor-pointer text-sm text-gray-500 underline underline-offset-4"
                                            >
                                                사진 추가
                                            </label>
                                        </div>
                                        {vehiclePhotos.length > 0 ? (
                                            <div className="grid grid-cols-4 gap-2">
                                                {vehiclePhotos.map((photo, idx) => (
                                                    <img
                                                        key={photo + idx}
                                                        src={photo}
                                                        alt="차량"
                                                        className="aspect-square w-full rounded-md object-cover"
                                                    />
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
                                            사업자 등록증
                                        </Label>
                                        {companyRegistrationUrl ? (
                                            <div className="grid grid-cols-4 gap-2">
                                                <div className="aspect-square overflow-hidden rounded-md bg-gray-50">
                                                    <img
                                                        src={`${uploadBaseUrl}${companyRegistrationUrl}`}
                                                        alt="사업자 등록증"
                                                        className="h-full w-full object-contain"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">
                                                등록된 서류가 없습니다.
                                            </p>
                                        )}
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
        {activeTab !== 'profile' && activeTab !== 'profileEdit' && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between">
                    <Button
                        variant={activeTab === 'available' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('available')}
                        className="text-xs sm:text-sm"
                    >
                        주문
                    </Button>
                    <Button
                        variant={activeTab === 'contract' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('contract')}
                        className="text-xs sm:text-sm"
                    >
                        계약
                    </Button>
                    <Button
                        variant={activeTab === 'chat' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('chat')}
                        className="text-xs sm:text-sm"
                    >
                        채팅
                    </Button>
                    <Button
                        variant={activeTab === 'support' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('support')}
                        className="text-xs sm:text-sm"
                    >
                        고객센터
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
                            variant={selectedRegion === region ? 'default' : 'outline'}
                            onClick={() => setSelectedRegion(region)}
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
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Button
                            variant="outline"
                            onClick={() => setSelectedDate('')}
                        >
                            초기화
                        </Button>
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
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            type="number"
                            placeholder="최소"
                            value={minPax}
                            onChange={(e) => setMinPax(e.target.value)}
                        />
                        <Input
                            type="number"
                            placeholder="최대"
                            value={maxPax}
                            onChange={(e) => setMaxPax(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setMinPax('');
                                setMaxPax('');
                            }}
                        >
                            초기화
                        </Button>
                        <Button onClick={() => setPaxFilterOpen(false)}>확인</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}

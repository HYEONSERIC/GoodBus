'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChatPanel } from '@/components/ChatPanel';
import { SupportCustomerCenter } from '@/components/SupportCustomerCenter';
import { PaymentCardsPanel } from '@/components/PaymentCardsPanel';
import {
    BidderProfileTabPanel,
    formatBidderRatingLine,
} from '@/components/bidder/BidderProfileTabPanel';
import { BidderProfileEditPanel } from '@/components/bidder/BidderProfileEditPanel';
import { OpenTripBidDialog } from '@/components/OpenTripBidDialog';
import { BidderAwardedTripsList } from '@/components/contracts/BidderAwardedTripsList';
import { ContractTabPanel } from '@/components/contracts/ContractTabPanel';
import { ContractOpenBidsList } from '@/components/contracts/ContractOpenBidsList';
import { BidderMyBidDetailOverlay } from '@/components/bidder/BidderMyBidDetailOverlay';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DashboardMobileShell } from '@/components/layout/DashboardMobileShell';
import { OpenTripsList } from '@/components/trips/OpenTripsList';
import { TripFilterDialogs } from '@/components/trips/TripFilterDialogs';
import { TripFiltersBar } from '@/components/trips/TripFiltersBar';
import { VerificationUploadDialog } from '@/components/auth/VerificationUploadDialog';
import { MembershipPlansPanel } from '@/components/membership/MembershipPlansPanel';
import {
    SupportInquiryDialog,
    DRIVER_SUPPORT_MENU,
} from '@/components/support/SupportInquiryDialog';
import { useDriverDashboard } from '@/hooks/useDriverDashboard';

export function DriverDashboardContent() {
    const d = useDriverDashboard();

    return (
        <>
            <DashboardMobileShell
                showHeader={d.showMainHeader}
                headerVariant={d.headerVariant}
                headerTitle={d.headerTitle}
                onMenuClick={() => d.setMenuOpen(true)}
                onBack={() =>
                    d.setActiveTab(
                        d.activeTab === 'paymentCards'
                            ? d.paymentCardsPrevTab
                            : d.membershipPrevTab,
                    )
                }
                onHome={() => d.setActiveTab('available')}
                contentMaxWidth="4xl"
                bottomTabs={
                    d.activeTab !== 'profile' &&
                    d.activeTab !== 'profileEdit' &&
                    d.activeTab !== 'paymentCards'
                        ? {
                              tabs: [
                                  { id: 'available', label: '주문' },
                                  { id: 'contract', label: '계약' },
                                  { id: 'chat', label: '채팅' },
                                  { id: 'support', label: '문의' },
                              ] as const,
                              activeTab: d.activeTab,
                              onChange: d.setActiveTab,
                              hidden: d.menuOpen,
                          }
                        : undefined
                }
            >
                <VerificationUploadDialog
                    open={d.verificationDialogOpen}
                    onOpenChange={d.setVerificationDialogOpen}
                    title="버스운전자격증 등록"
                    description="입찰을 진행하려면 버스운전자격증을 등록하고 승인을 받아야 합니다."
                    status={d.verification?.driverLicenseStatus}
                    rejectionNote={d.verification?.driverLicenseNote}
                    existingImageUrl={
                        d.verification?.driverLicenseUrl
                            ? `${d.uploadBaseUrl}${d.verification.driverLicenseUrl}`
                            : null
                    }
                    imageAlt="운전자격증"
                    fileInputLabel="자격증 이미지"
                    uploading={d.verificationUploading}
                    onUpload={d.handleVerificationUpload}
                    onFileChange={d.setVerificationFile}
                />

                <Dialog
                    open={d.pendingDialogOpen}
                    onOpenChange={d.setPendingDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>승인 대기중입니다</DialogTitle>
                            <DialogDescription>
                                운전자격증이 아직 승인되지 않았습니다. 관리자 승인 후
                                입찰할 수 있습니다.
                            </DialogDescription>
                        </DialogHeader>
                        <Button onClick={() => d.setPendingDialogOpen(false)}>
                            확인
                        </Button>
                    </DialogContent>
                </Dialog>

                <SupportInquiryDialog
                    open={d.driverSupportOpen}
                    onOpenChange={d.setDriverSupportOpen}
                    menuOptions={DRIVER_SUPPORT_MENU}
                    titleInputId="driver-inquiry-title"
                    bodyInputId="driver-inquiry-body"
                    onSubmitted={() => d.setDriverInquiryListKey((k) => k + 1)}
                />

                <BidderMyBidDetailOverlay
                    detail={d.myBidDetail}
                    userId={d.user?.id}
                    distanceByTripId={d.distanceByTripId}
                    role="driver"
                    onClose={() => d.setMyBidDetail(null)}
                    onChatWithPassenger={d.openBidQuoteChat}
                    onWithdrawBid={d.withdrawBidFromDetail}
                    onHome={() => d.setActiveTab('available')}
                />

                {d.activeTab === 'available' && (
                    <div>
                        <TripFiltersBar
                            selectedDate={d.tripFilters.selectedDate}
                            minPax={d.tripFilters.minPax}
                            maxPax={d.tripFilters.maxPax}
                            onRegionClick={() =>
                                d.tripFilters.setRegionFilterOpen(true)
                            }
                            onDateClick={() =>
                                d.tripFilters.setDateFilterOpen(true)
                            }
                            onPaxClick={() =>
                                d.tripFilters.setPaxFilterOpen(true)
                            }
                            onReset={() => {
                                d.tripFilters.resetFilters();
                                d.loadData();
                            }}
                            resetTitle="필터 초기화 및 목록 새로고침"
                        />
                        <div className="mx-auto w-full max-w-xl border border-gray-200 bg-white">
                            <OpenTripsList
                                trips={d.trips}
                                allTrips={d.openTripsPool}
                                filteredTrips={d.tripFilters.filterTrips(d.trips)}
                                distanceByTripId={d.distanceByTripId}
                                onBid={d.handleBidButtonClick}
                                roundOptions={d.DRIVER_ROUND_OPTS}
                                emptyWhenNoTrips="입찰 가능한 여정이 없습니다. 승객이 견적을 등록하면 여기에 표시됩니다. ↻ 버튼으로 새로고침할 수 있어요."
                                emptyWhenFiltered="조건에 맞는 여정이 없습니다. 필터를 바꾸거나 ↻로 새로고침해 보세요."
                            />
                        </div>

                        <OpenTripBidDialog
                            open={Boolean(d.bidDialogTrip)}
                            onOpenChange={(open) => {
                                if (!open) {
                                    d.setBidDialogTrip(null);
                                    d.setBidTripPartner(undefined);
                                }
                            }}
                            trip={d.bidDialogTrip}
                            partner={d.bidTripPartner}
                            distanceKm={
                                d.bidDialogTrip
                                    ? (d.distanceByTripId[d.bidDialogTrip.id] ??
                                      null)
                                    : null
                            }
                            membershipLabel={d.currentMembershipLabel}
                            profileForm={d.profile.profileForm}
                            onSubmit={async ({ tripId, totalManwon, note }) => {
                                await d.submitBid(tripId, totalManwon, note);
                            }}
                        />
                    </div>
                )}

                {d.activeTab === 'contract' && (
                    <ContractTabPanel
                        activeSubTab={d.contractSubTab}
                        onSubTabChange={d.setContractSubTab}
                    >
                        {d.contractSubTab === 'reservation' && (
                            <BidderAwardedTripsList
                                trips={d.contractReservationCardTrips}
                                partnerPool={d.contractReservationTrips}
                                roundOptions={d.DRIVER_ROUND_OPTS}
                                distanceByTripId={d.distanceByTripId}
                                userId={d.user?.id}
                                variant="reservation"
                                onSelectTrip={({ trip, partner }) =>
                                    d.setMyBidDetail({
                                        trip,
                                        partner,
                                        bidStatus: 'awarded',
                                    })
                                }
                            />
                        )}

                        {d.contractSubTab === 'bidding' && (
                            <ContractOpenBidsList
                                cardTrips={d.myBidCardTrips}
                                partnerPool={d.openTripsPool}
                                roundOptions={d.DRIVER_ROUND_OPTS}
                                distanceByTripId={d.distanceByTripId}
                                userId={d.user?.id}
                                onOpenDetail={(trip, partner) =>
                                    d.setMyBidDetail({
                                        trip,
                                        partner,
                                        bidStatus: 'open',
                                    })
                                }
                                onWithdraw={d.handleWithdrawBid}
                            />
                        )}

                        {d.contractSubTab === 'completed' && (
                            <BidderAwardedTripsList
                                trips={d.contractCompletedCardTrips}
                                partnerPool={d.contractCompletedTrips}
                                roundOptions={d.DRIVER_ROUND_OPTS}
                                distanceByTripId={d.distanceByTripId}
                                userId={d.user?.id}
                                variant="completed"
                            />
                        )}
                    </ContractTabPanel>
                )}

                {d.activeTab === 'chat' && (
                    <Card className="mx-auto w-full max-w-xl gap-0 rounded-none border-gray-200 py-0 shadow-sm">
                        <CardContent className="p-0">
                            <ChatPanel
                                fillRoomHeight
                                focusRoomId={d.chatFocusRoomId}
                                onFocusRoomConsumed={() =>
                                    d.setChatFocusRoomId(null)
                                }
                            />
                        </CardContent>
                    </Card>
                )}

                {d.activeTab === 'support' && (
                    <SupportCustomerCenter
                        heading="고객센터"
                        showInquiry
                        refreshMyInquiriesKey={d.driverInquiryListKey}
                        onInquiryClick={() => d.setDriverSupportOpen(true)}
                    />
                )}

                {d.activeTab === 'profile' && (
                    <BidderProfileTabPanel
                        role="driver"
                        displayName={d.profile.displayName}
                        profilePhoto={d.profile.profilePhoto}
                        bannerUrl={d.profile.bannerUrl}
                        vehicleTypeLabel={d.profile.vehicleTypeLabel}
                        vehicleCapacityLabel={d.profile.vehicleCapacityLabel}
                        vehicleYearLabel={d.profile.vehicleYearLabel}
                        insuranceLabel={d.insuranceLabel}
                        companyLabel={d.profile.companyLabel}
                        vehiclePhotos={d.profile.vehiclePhotos}
                        driverComment={d.profile.profileForm.driverComment}
                        ratingLine={formatBidderRatingLine(
                            d.driverReviewStats.avgRating,
                            d.driverReviewStats.count,
                        )}
                        profileSection={d.profileSection}
                        onProfileSectionChange={d.setProfileSection}
                        driverReviews={d.driverReviews}
                        resolveMediaUrl={d.profile.resolveMediaUrl}
                        galleryOpen={d.profile.galleryOpen}
                        onGalleryOpenChange={d.profile.setGalleryOpen}
                        galleryIndex={d.profile.galleryIndex}
                        onOpenGallery={d.profile.openGallery}
                        onGalleryPrev={d.profile.showPrevPhoto}
                        onGalleryNext={d.profile.showNextPhoto}
                        onBack={() => d.setActiveTab('available')}
                        onHome={() => d.setActiveTab('available')}
                        onEdit={() => d.setActiveTab('profileEdit')}
                    />
                )}

                {d.activeTab === 'profileEdit' && (
                    <BidderProfileEditPanel
                        role="driver"
                        profileForm={d.profile.profileForm}
                        onProfileFormChange={d.profile.setProfileForm}
                        profilePhoto={d.profile.profilePhoto}
                        onProfilePhotoPick={d.profile.pickProfilePhoto}
                        vehiclePhotos={d.profile.vehiclePhotos}
                        onAddVehiclePhotos={d.profile.addVehiclePhotos}
                        onRemoveVehiclePhoto={d.profile.removeVehiclePhoto}
                        garageResults={d.profile.garageResults}
                        garageStatusMessage={d.profile.garageStatusMessage}
                        onGarageQueryChange={(value) => {
                            d.profile.setProfileForm((prev) => ({
                                ...prev,
                                garage: value,
                            }));
                            d.profile.searchGaragePlaces(value);
                        }}
                        onGarageSelect={d.profile.selectGaragePlace}
                        documentUrl={d.driverLicenseUrl}
                        uploadBaseUrl={d.uploadBaseUrl}
                        onSave={async () => {
                            await d.profile.handleProfileSave();
                            await d.loadData();
                            d.setActiveTab('profile');
                        }}
                        onBack={() => d.setActiveTab('profile')}
                        onHome={() => d.setActiveTab('available')}
                    />
                )}

                {d.activeTab === 'paymentCards' && (
                    <PaymentCardsPanel userId={d.user?.id} />
                )}

                {d.activeTab === 'membership' && <MembershipPlansPanel />}
            </DashboardMobileShell>
            {d.menuOpen && (
                <div className="fixed inset-0 z-40 bg-black/30">
                    <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-lg p-6 space-y-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden">
                                {d.profile.profilePhoto ? (
                                    <img
                                        src={d.profile.profilePhoto}
                                        alt="프로필"
                                        className="h-full w-full object-cover"
                                    />
                                ) : null}
                            </div>
                            <p className="mt-3 text-lg font-semibold">
                                {d.profile.displayName}
                            </p>
                            <p className="text-xs text-gray-500">★★★★☆</p>
                        </div>
                        <div className="divide-y border-y">
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={() => {
                                    d.setActiveTab('profile');
                                    d.setMenuOpen(false);
                                }}
                            >
                                나의 정보
                            </button>
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={() => {
                                    d.setMembershipPrevTab(
                                        d.activeTab === 'membership'
                                            ? 'available'
                                            : d.activeTab,
                                    );
                                    d.setActiveTab('membership');
                                    d.setMenuOpen(false);
                                }}
                            >
                                <span>멤버십</span>
                                <span className="text-xs text-gray-500">
                                    {d.currentMembershipLabel}
                                </span>
                            </button>
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={() => {
                                    d.setPaymentCardsPrevTab(
                                        d.activeTab === 'paymentCards'
                                            ? 'available'
                                            : d.activeTab,
                                    );
                                    d.setActiveTab('paymentCards');
                                    d.setMenuOpen(false);
                                }}
                            >
                                결제카드
                            </button>
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={d.handleLogout}
                            >
                                로그아웃
                            </button>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => d.setMenuOpen(false)}
                        >
                            닫기
                        </Button>
                    </div>
                </div>
            )}
            <TripFilterDialogs filters={d.tripFilters} />
        </>
    );
}

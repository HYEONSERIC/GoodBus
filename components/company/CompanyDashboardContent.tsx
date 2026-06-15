'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChatPanel } from '@/components/ChatPanel';
import { SupportCustomerCenter } from '@/components/SupportCustomerCenter';
import { PaymentCardsPanel } from '@/components/PaymentCardsPanel';
import { OpenTripBidDialog } from '@/components/OpenTripBidDialog';
import { BidderAwardedTripsList } from '@/components/contracts/BidderAwardedTripsList';
import { BidderMyBidDetailOverlay } from '@/components/bidder/BidderMyBidDetailOverlay';
import { DashboardMobileShell } from '@/components/layout/DashboardMobileShell';
import { BidderProfileTabPanel } from '@/components/bidder/BidderProfileTabPanel';
import { BidderProfileEditPanel } from '@/components/bidder/BidderProfileEditPanel';
import { OpenTripsList } from '@/components/trips/OpenTripsList';
import { TripFilterDialogs } from '@/components/trips/TripFilterDialogs';
import { TripFiltersBar } from '@/components/trips/TripFiltersBar';
import { ContractTabPanel } from '@/components/contracts/ContractTabPanel';
import { ContractOpenBidsList } from '@/components/contracts/ContractOpenBidsList';
import { VerificationUploadDialog } from '@/components/auth/VerificationUploadDialog';
import { MembershipPlansPanel } from '@/components/membership/MembershipPlansPanel';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';

export function CompanyDashboardContent() {
    const c = useCompanyDashboard();

    return (
        <>
            <DashboardMobileShell
                showHeader={c.showMainHeader}
                headerVariant={c.headerVariant}
                headerTitle={c.headerTitle}
                onMenuClick={() => c.setMenuOpen(true)}
                onBack={() =>
                    c.setActiveTab(
                        c.activeTab === 'paymentCards'
                            ? c.paymentCardsPrevTab
                            : c.membershipPrevTab,
                    )
                }
                onHome={() => c.setActiveTab('available')}
                contentMaxWidth="4xl"
                bottomTabs={
                    c.activeTab !== 'profile' &&
                    c.activeTab !== 'profileEdit' &&
                    c.activeTab !== 'paymentCards'
                        ? {
                              tabs: [
                                  { id: 'available', label: '주문' },
                                  { id: 'contract', label: '계약' },
                                  { id: 'chat', label: '채팅' },
                                  { id: 'support', label: '고객센터' },
                              ] as const,
                              activeTab: c.activeTab,
                              onChange: c.setActiveTab,
                              hidden: c.menuOpen,
                          }
                        : undefined
                }
            >
                <VerificationUploadDialog
                    open={c.verificationDialogOpen}
                    onOpenChange={c.setVerificationDialogOpen}
                    title="사업자등록증 등록"
                    description="입찰을 진행하려면 사업자등록증을 등록하고 승인을 받아야 합니다."
                    status={c.verification?.companyRegistrationStatus}
                    rejectionNote={c.verification?.companyRegistrationNote}
                    existingImageUrl={
                        c.verification?.companyRegistrationUrl
                            ? `${c.uploadBaseUrl}${c.verification.companyRegistrationUrl}`
                            : null
                    }
                    imageAlt="사업자등록증"
                    fileInputLabel="사업자등록증 이미지"
                    uploading={c.verificationUploading}
                    onUpload={c.handleVerificationUpload}
                    onFileChange={c.setVerificationFile}
                />

                <BidderMyBidDetailOverlay
                    detail={c.myBidDetail}
                    userId={c.user?.id}
                    distanceByTripId={c.distanceByTripId}
                    role="company"
                    onClose={() => c.setMyBidDetail(null)}
                    onChatWithPassenger={c.openBidQuoteChat}
                    onWithdrawBid={c.withdrawBidFromDetail}
                    onHome={() => c.setActiveTab('available')}
                />

                {c.activeTab === 'available' && (
                    <div>
                        <TripFiltersBar
                            selectedDate={c.tripFilters.selectedDate}
                            minPax={c.tripFilters.minPax}
                            maxPax={c.tripFilters.maxPax}
                            onRegionClick={() =>
                                c.tripFilters.setRegionFilterOpen(true)
                            }
                            onDateClick={() =>
                                c.tripFilters.setDateFilterOpen(true)
                            }
                            onPaxClick={() =>
                                c.tripFilters.setPaxFilterOpen(true)
                            }
                            onReset={c.tripFilters.resetFilters}
                        />
                        <div className="mx-auto w-full max-w-xl border border-gray-200 bg-white">
                            <OpenTripsList
                                trips={c.trips}
                                allTrips={c.openTripsPool}
                                filteredTrips={c.tripFilters.filterTrips(c.trips)}
                                distanceByTripId={c.distanceByTripId}
                                onBid={c.handleBidButtonClick}
                                emptyWhenNoTrips="입찰 가능한 여정이 없습니다. 승객이 견적을 등록하면 여기에 표시됩니다."
                                emptyWhenFiltered="조건에 맞는 여정이 없습니다. 필터를 바꿔 보세요."
                            />
                        </div>

                        <OpenTripBidDialog
                            open={Boolean(c.bidDialogTrip)}
                            onOpenChange={(open) => {
                                if (!open) {
                                    c.setBidDialogTrip(null);
                                    c.setBidTripPartner(undefined);
                                }
                            }}
                            trip={c.bidDialogTrip}
                            partner={c.bidTripPartner}
                            distanceKm={
                                c.bidDialogTrip
                                    ? (c.distanceByTripId[c.bidDialogTrip.id] ??
                                      null)
                                    : null
                            }
                            membershipLabel={c.currentMembershipLabel}
                            profileForm={c.profile.profileForm}
                            onSubmit={async ({ tripId, totalManwon, note }) => {
                                await c.submitBid(tripId, totalManwon, note);
                            }}
                        />
                    </div>
                )}

                {c.activeTab === 'contract' && (
                    <ContractTabPanel
                        activeSubTab={c.contractSubTab}
                        onSubTabChange={c.setContractSubTab}
                    >
                        {c.contractSubTab === 'reservation' && (
                            <BidderAwardedTripsList
                                trips={c.contractReservationCardTrips}
                                partnerPool={c.contractReservationTrips}
                                roundOptions={c.COMPANY_ROUND_OPTS}
                                distanceByTripId={c.distanceByTripId}
                                userId={c.user?.id}
                                variant="reservation"
                                onSelectTrip={({ trip, partner }) =>
                                    c.setMyBidDetail({
                                        trip,
                                        partner,
                                        bidStatus: 'awarded',
                                    })
                                }
                            />
                        )}

                        {c.contractSubTab === 'bidding' && (
                            <ContractOpenBidsList
                                cardTrips={c.myBidCardTrips}
                                partnerPool={c.myBids}
                                distanceByTripId={c.distanceByTripId}
                                userId={c.user?.id}
                                onOpenDetail={(trip, partner) =>
                                    c.setMyBidDetail({
                                        trip,
                                        partner,
                                        bidStatus: 'open',
                                    })
                                }
                                onWithdraw={c.handleWithdrawBid}
                            />
                        )}

                        {c.contractSubTab === 'completed' && (
                            <BidderAwardedTripsList
                                trips={c.contractCompletedCardTrips}
                                partnerPool={c.contractCompletedTrips}
                                roundOptions={c.COMPANY_ROUND_OPTS}
                                distanceByTripId={c.distanceByTripId}
                                userId={c.user?.id}
                                variant="completed"
                            />
                        )}
                    </ContractTabPanel>
                )}

                {c.activeTab === 'chat' && (
                    <Card className="mx-auto w-full max-w-xl gap-0 rounded-none border-gray-200 py-0 shadow-sm">
                        <CardContent className="p-0">
                            <ChatPanel
                                fillRoomHeight
                                focusRoomId={c.chatFocusRoomId}
                                onFocusRoomConsumed={() =>
                                    c.setChatFocusRoomId(null)
                                }
                            />
                        </CardContent>
                    </Card>
                )}

                {c.activeTab === 'support' && (
                    <div className="mx-auto w-full max-w-xl">
                        <SupportCustomerCenter
                            heading="고객센터"
                            showInquiry={false}
                        />
                    </div>
                )}

                {c.activeTab === 'profile' && (
                    <BidderProfileTabPanel
                        role="company"
                        displayName={c.profile.displayName}
                        profilePhoto={c.profile.profilePhoto}
                        bannerUrl={c.profile.bannerUrl}
                        vehicleTypeLabel={c.profile.vehicleTypeLabel}
                        vehicleCapacityLabel={c.profile.vehicleCapacityLabel}
                        vehicleYearLabel={c.profile.vehicleYearLabel}
                        insuranceLabel={c.insuranceLabel}
                        companyLabel={c.profile.companyLabel}
                        vehiclePhotos={c.profile.vehiclePhotos}
                        ratingLine="★★★★☆ (4.9)"
                        galleryOpen={c.profile.galleryOpen}
                        onGalleryOpenChange={c.profile.setGalleryOpen}
                        galleryIndex={c.profile.galleryIndex}
                        onOpenGallery={c.profile.openGallery}
                        onGalleryPrev={c.profile.showPrevPhoto}
                        onGalleryNext={c.profile.showNextPhoto}
                        onBack={() => c.setActiveTab('available')}
                        onHome={() => c.setActiveTab('available')}
                        onEdit={() => c.setActiveTab('profileEdit')}
                    />
                )}

                {c.activeTab === 'profileEdit' && (
                    <BidderProfileEditPanel
                        role="company"
                        profileForm={c.profile.profileForm}
                        onProfileFormChange={c.profile.setProfileForm}
                        profilePhoto={c.profile.profilePhoto}
                        onProfilePhotoPick={c.profile.pickProfilePhoto}
                        vehiclePhotos={c.profile.vehiclePhotos}
                        onAddVehiclePhotos={c.profile.addVehiclePhotos}
                        onRemoveVehiclePhoto={c.profile.removeVehiclePhoto}
                        garageResults={c.profile.garageResults}
                        garageStatusMessage={c.profile.garageStatusMessage}
                        onGarageQueryChange={(value) => {
                            c.profile.setProfileForm((prev) => ({
                                ...prev,
                                garage: value,
                            }));
                            c.profile.searchGaragePlaces(value);
                        }}
                        onGarageSelect={c.profile.selectGaragePlace}
                        documentUrl={c.companyRegistrationUrl}
                        uploadBaseUrl={c.uploadBaseUrl}
                        onSave={async () => {
                            await c.profile.handleProfileSave();
                            await c.loadData();
                            c.setActiveTab('profile');
                        }}
                        onBack={() => c.setActiveTab('profile')}
                        onHome={() => c.setActiveTab('available')}
                    />
                )}

                {c.activeTab === 'paymentCards' && (
                    <PaymentCardsPanel userId={c.user?.id} />
                )}

                {c.activeTab === 'membership' && <MembershipPlansPanel />}
            </DashboardMobileShell>
            {c.menuOpen && (
                <div className="fixed inset-0 z-40 bg-black/30">
                    <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-lg p-6 space-y-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden">
                                {c.profile.profilePhoto ? (
                                    <img
                                        src={c.profile.profilePhoto}
                                        alt="프로필"
                                        className="h-full w-full object-cover"
                                    />
                                ) : null}
                            </div>
                            <p className="mt-3 text-lg font-semibold">
                                {c.profile.displayName}
                            </p>
                            <p className="text-xs text-gray-500">★★★★☆</p>
                        </div>
                        <div className="divide-y border-y">
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={() => {
                                    c.setActiveTab('profile');
                                    c.setMenuOpen(false);
                                }}
                            >
                                나의 정보
                            </button>
                            <button
                                type="button"
                                className="w-full flex items-center justify-between px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={() => {
                                    c.setMembershipPrevTab(
                                        c.activeTab === 'membership'
                                            ? 'available'
                                            : c.activeTab,
                                    );
                                    c.setActiveTab('membership');
                                    c.setMenuOpen(false);
                                }}
                            >
                                <span>멤버십</span>
                                <span className="text-xs text-gray-500">
                                    {c.currentMembershipLabel}
                                </span>
                            </button>
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={() => {
                                    c.setPaymentCardsPrevTab(
                                        c.activeTab === 'paymentCards'
                                            ? 'available'
                                            : c.activeTab,
                                    );
                                    c.setActiveTab('paymentCards');
                                    c.setMenuOpen(false);
                                }}
                            >
                                결제카드
                            </button>
                            <button
                                type="button"
                                className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                onClick={c.handleLogout}
                            >
                                로그아웃
                            </button>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => c.setMenuOpen(false)}
                        >
                            닫기
                        </Button>
                    </div>
                </div>
            )}
            <TripFilterDialogs filters={c.tripFilters} />
        </>
    );
}

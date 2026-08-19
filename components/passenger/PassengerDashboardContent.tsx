'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChatPanel } from '@/components/ChatPanel';
import { SupportCustomerCenter } from '@/components/SupportCustomerCenter';
import { DashboardMobileShell } from '@/components/layout/DashboardMobileShell';
import { PassengerBookingTripsSection } from '@/components/passenger/PassengerBookingTripsSection';
import { PassengerQuoteTripsList } from '@/components/passenger/PassengerQuoteTripsList';
import { PassengerQuoteRequestSection } from '@/components/passenger/PassengerQuoteRequestSection';
import { PassengerTripCreateFlow } from '@/components/passenger/PassengerTripCreateFlow';
import {
    PassengerBidDetailDialog,
    PassengerCancelTripDialog,
    PassengerEditTripDialog,
} from '@/components/passenger/dialogs';
import {
    SupportInquiryDialog,
    PASSENGER_SUPPORT_MENU,
} from '@/components/support/SupportInquiryDialog';
import { usePassengerDashboard } from '@/hooks/usePassengerDashboard';
import type { PassengerBid, PassengerTrip } from '@/types/passenger';

type Trip = PassengerTrip;
type Bid = PassengerBid;

export function PassengerDashboardContent() {
    const p = usePassengerDashboard();

    return (
        <>
            <DashboardMobileShell
                onMenuClick={() => p.setMenuOpen(true)}
                bottomTabs={{
                    tabs: [
                        { id: 'quote', label: '견적' },
                        { id: 'booking', label: '예약' },
                        { id: 'chat', label: '채팅' },
                        { id: 'support', label: '문의' },
                    ] as const,
                    activeTab: p.activeTab,
                    onChange: p.setActiveTab,
                    hidden: p.menuOpen,
                }}
            >
                {p.menuOpen && (
                    <div className="fixed inset-0 z-40 bg-black/30">
                        <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-lg p-6 space-y-6">
                            <div>
                                <p className="text-lg font-semibold">
                                    {p.user?.email ||
                                        p.user?.phoneNumber ||
                                        '내 정보'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Passenger
                                </p>
                            </div>
                            <div className="divide-y border-y">
                                <button
                                    type="button"
                                    className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                    onClick={() => {
                                        p.setSupportOpen(true);
                                        p.setMenuOpen(false);
                                    }}
                                >
                                    문의하기
                                </button>
                                <button
                                    type="button"
                                    className="w-full px-2 py-3 text-sm text-left hover:bg-gray-100 transition"
                                    onClick={p.handleLogout}
                                >
                                    로그아웃
                                </button>
                            </div>
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => p.setMenuOpen(false)}
                            >
                                닫기
                            </Button>
                        </div>
                    </div>
                )}

                {p.activeTab === 'quote' && (
                    <PassengerQuoteRequestSection
                        onOpenCreate={() => p.tripForm.setOpenDialog(true)}
                    />
                )}

                <PassengerTripCreateFlow tripForm={p.tripForm} />

                <PassengerBidDetailDialog
                    open={Boolean(p.bidDetail)}
                    bidDetail={p.bidDetail}
                    onClose={p.closeBidDetail}
                    bidGalleryIndex={p.bidGalleryIndex}
                    setBidGalleryIndex={p.setBidGalleryIndex}
                    resolveMediaUrl={p.resolveMediaUrl}
                    driverReviews={p.bidDetailReviews}
                    driverReviewStats={p.bidDetailReviewStats}
                    reviewsLoading={p.bidDetailReviewsLoading}
                    verificationLabel={p.verificationLabel}
                    onOpenChat={() => {
                        if (!p.bidDetail) return;
                        p.openQuoteChat(p.bidDetail.bidTrip, p.bidDetail.bid);
                    }}
                    onAward={() => {
                        if (!p.bidDetail) return;
                        p.awardSelectedBid(
                            p.bidDetail.bidTrip.id,
                            p.bidDetail.bid.id,
                        );
                    }}
                />

                <PassengerCancelTripDialog
                    open={Boolean(p.cancelDialogTrip)}
                    cancelReason={p.cancelReason}
                    onCancelReasonChange={p.setCancelReason}
                    onClose={p.closeCancelDialog}
                    onConfirm={p.confirmCancelTrip}
                    isAwarded={p.cancelDialogTrip?.status === 'awarded'}
                />

                <PassengerEditTripDialog
                    key={p.editTripDialogTrip?.id ?? 'closed'}
                    trip={p.editTripDialogTrip}
                    submitting={p.editTripSubmitting}
                    onClose={p.closeEditTripDialog}
                    onSubmit={p.submitEditTrip}
                />

                {p.activeTab === 'quote' && (
                    <div className="grid w-full max-w-xl gap-4 mx-auto">
                        <PassengerQuoteTripsList
                            trips={p.trips}
                            distanceByTripId={p.distanceByTripId}
                            expandedTripIds={p.expandedTripIds}
                            quotesExpandedTripIds={p.quotesExpandedTripIds}
                            cancelMenuTripId={p.cancelMenuTripId}
                            roundOptions={p.PASSENGER_ROUND_OPTS}
                            onToggleTripDetail={p.toggleTripDetail}
                            onToggleQuotesTrip={p.toggleQuotesTrip}
                            onToggleCancelMenu={(tripId) =>
                                p.setCancelMenuTripId((prev) =>
                                    prev === tripId ? null : tripId,
                                )
                            }
                            onOpenCancelDialog={(trip) => {
                                p.setCancelDialogTrip(trip as Trip);
                                p.setCancelReason('');
                                p.setCancelMenuTripId(null);
                            }}
                            onOpenEditDialog={(trip) => {
                                p.setEditTripDialogTrip(trip as Trip);
                                p.setCancelMenuTripId(null);
                            }}
                            onSelectBid={(bid, bidTrip) =>
                                p.openBidDetail(bid as Bid, bidTrip as Trip)
                            }
                            formatDriverRating={p.formatDriverRatingForList}
                            resolveMediaUrl={p.resolveMediaUrl}
                        />
                    </div>
                )}

                {p.activeTab === 'booking' && (
                    <PassengerBookingTripsSection
                        activeSubTab={p.bookingSubTab}
                        onSubTabChange={p.setBookingSubTab}
                        reservationTrips={p.passengerReservationCardTrips}
                        completedTrips={p.passengerCompletedCardTrips}
                        allTrips={p.trips}
                        distanceByTripId={p.distanceByTripId}
                        roundOptions={p.PASSENGER_ROUND_OPTS}
                        tripReviewsByTripId={p.tripReviewsByTripId}
                        onCancelAward={(trip) => {
                            p.setCancelDialogTrip(trip as Trip);
                            p.setCancelReason('');
                        }}
                        onOpenChat={(trip, bid) =>
                            p.openQuoteChat(trip as Trip, bid as Bid)
                        }
                        onReviewSubmitted={() => p.loadTripReviews(p.trips)}
                        resolveMediaUrl={p.resolveMediaUrl}
                    />
                )}

                {p.activeTab === 'chat' && (
                    <Card className="w-full max-w-xl mx-auto gap-0 rounded-none border-gray-200 py-0 shadow-sm">
                        <CardContent className="p-0">
                            <ChatPanel
                                focusRoomId={p.chatFocusRoomId}
                                onFocusRoomConsumed={() =>
                                    p.setChatFocusRoomId(null)
                                }
                                fillRoomHeight
                            />
                        </CardContent>
                    </Card>
                )}

                {p.activeTab === 'support' && (
                    <SupportCustomerCenter
                        heading="고객센터"
                        showInquiry
                        refreshMyInquiriesKey={p.supportInquiryListKey}
                        onInquiryClick={() => p.setSupportOpen(true)}
                    />
                )}
            </DashboardMobileShell>

            <SupportInquiryDialog
                open={p.supportOpen}
                onOpenChange={p.setSupportOpen}
                menuOptions={PASSENGER_SUPPORT_MENU}
                titleInputId="passenger-inquiry-title"
                bodyInputId="passenger-inquiry-body"
                onSubmitted={() => p.setSupportInquiryListKey((k) => k + 1)}
            />
        </>
    );
}

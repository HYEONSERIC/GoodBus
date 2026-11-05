'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuoteWizardApi } from '@/hooks/useQuoteWizard';

export function StepRoute({ wizard }: { wizard: QuoteWizardApi }) {
    const {
        form,
        update,
        goNext,
        canProceed,
        originResults,
        setOriginResults,
        destinationResults,
        setDestinationResults,
        searchPlaces,
    } = wizard;

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-6 px-5 pt-8 pb-24">
                <h2 className="text-center text-lg font-bold text-stone-900">
                    경로를 입력해주세요
                </h2>

                <div className="mx-auto max-w-sm space-y-4">
                    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-stone-300">
                        <button
                            type="button"
                            className={`h-11 border-r border-stone-300 text-sm font-semibold transition ${
                                form.tripType === 'round'
                                    ? 'bg-[#2563eb] text-white'
                                    : 'bg-white text-stone-600 hover:bg-stone-50'
                            }`}
                            onClick={() => update({ tripType: 'round' })}
                        >
                            왕복
                        </button>
                        <button
                            type="button"
                            className={`h-11 text-sm font-semibold transition ${
                                form.tripType === 'oneway'
                                    ? 'bg-[#2563eb] text-white'
                                    : 'bg-white text-stone-600 hover:bg-stone-50'
                            }`}
                            onClick={() => update({ tripType: 'oneway' })}
                        >
                            편도
                        </button>
                    </div>

                    <div className="space-y-2">
                        <Label>출발지</Label>
                        <Input
                            className="h-11"
                            placeholder="출발지를 입력하세요"
                            value={form.origin}
                            onChange={(e) => {
                                const value = e.target.value;
                                update({ origin: value, originX: null, originY: null });
                                searchPlaces(value, setOriginResults);
                            }}
                        />
                        {originResults.length > 0 && (
                            <div className="rounded-md border bg-white shadow-sm">
                                {originResults.map((place) => (
                                    <button
                                        key={place.id}
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50"
                                        onClick={() => {
                                            const x = Number(place.x);
                                            const y = Number(place.y);
                                            update({
                                                origin:
                                                    place.road_address_name ||
                                                    place.address_name ||
                                                    place.place_name,
                                                originX: Number.isFinite(x) ? x : null,
                                                originY: Number.isFinite(y) ? y : null,
                                            });
                                            setOriginResults([]);
                                        }}
                                    >
                                        <div className="font-medium">{place.place_name}</div>
                                        <div className="text-xs text-stone-500">
                                            {place.road_address_name || place.address_name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>도착지</Label>
                        <Input
                            className="h-11"
                            placeholder="도착지를 입력하세요"
                            value={form.destination}
                            onChange={(e) => {
                                const value = e.target.value;
                                update({
                                    destination: value,
                                    destinationX: null,
                                    destinationY: null,
                                });
                                searchPlaces(value, setDestinationResults);
                            }}
                        />
                        {destinationResults.length > 0 && (
                            <div className="rounded-md border bg-white shadow-sm">
                                {destinationResults.map((place) => (
                                    <button
                                        key={place.id}
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50"
                                        onClick={() => {
                                            const x = Number(place.x);
                                            const y = Number(place.y);
                                            update({
                                                destination:
                                                    place.road_address_name ||
                                                    place.address_name ||
                                                    place.place_name,
                                                destinationX: Number.isFinite(x) ? x : null,
                                                destinationY: Number.isFinite(y) ? y : null,
                                            });
                                            setDestinationResults([]);
                                        }}
                                    >
                                        <div className="font-medium">{place.place_name}</div>
                                        <div className="text-xs text-stone-500">
                                            {place.road_address_name || place.address_name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-5 py-3">
                <div className="mx-auto max-w-lg">
                    <Button
                        type="button"
                        disabled={!canProceed}
                        onClick={goNext}
                        className="h-12 w-full rounded-full bg-[#2563eb] text-base font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-40"
                    >
                        다음
                    </Button>
                </div>
            </div>
        </div>
    );
}

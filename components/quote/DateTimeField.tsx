'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n: number) {
    return String(n).padStart(2, '0');
}

function toValue(date: Date, hour: number, minute: number) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
        date.getDate(),
    )}T${pad2(hour)}:${pad2(minute)}`;
}

function parseValue(value: string) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

// 모바일 네이티브 datetime-local 피커가 iOS/Android에서 전혀 다르게(안드로이드는
// 숫자 스피너 3단으로 아주 투박하게) 렌더링되는 문제 — 두 플랫폼 다 동일하게
// 생기도록 직접 만든 달력+시간 선택 UI로 대체. value/형식은 기존
// datetime-local input과 동일한 "YYYY-MM-DDTHH:mm" 문자열이라 useQuoteWizard.ts
// 쪽 로직은 그대로 재사용된다.
export function DateTimeField({
    label,
    value,
    minDateTime,
    onChange,
}: {
    label: string;
    value: string;
    minDateTime: Date;
    onChange: (value: string) => void;
}) {
    const selected = parseValue(value);
    const minDay = useMemo(() => startOfDay(minDateTime), [minDateTime]);
    const [viewMonth, setViewMonth] = useState(
        () => selected ?? new Date(minDay),
    );

    const hour = selected ? selected.getHours() : null;
    const minute = selected ? selected.getMinutes() : null;

    const days = useMemo(() => {
        const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
        const startOffset = first.getDay();
        const gridStart = new Date(first);
        gridStart.setDate(first.getDate() - startOffset);
        return Array.from({ length: 42 }, (_, i) => {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + i);
            return d;
        });
    }, [viewMonth]);

    function selectDay(day: Date) {
        if (day < minDay) return;
        const nextHour = hour ?? 9;
        const nextMinute = minute ?? 0;
        onChange(toValue(day, nextHour, nextMinute));
    }

    function selectTime(nextHour: number, nextMinute: number) {
        const day = selected ?? new Date(minDay);
        onChange(toValue(day, nextHour, nextMinute));
    }

    return (
        <div className="space-y-3">
            <Label>{label}</Label>
            <div className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center justify-between px-1 pb-2">
                    <button
                        type="button"
                        aria-label="이전 달"
                        className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
                        onClick={() =>
                            setViewMonth(
                                (prev) =>
                                    new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                            )
                        }
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <span className="text-sm font-semibold text-stone-900">
                        {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
                    </span>
                    <button
                        type="button"
                        aria-label="다음 달"
                        className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
                        onClick={() =>
                            setViewMonth(
                                (prev) =>
                                    new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                            )
                        }
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-y-1 text-center">
                    {WEEKDAYS.map((w) => (
                        <span
                            key={w}
                            className="py-1 text-xs font-medium text-stone-400"
                        >
                            {w}
                        </span>
                    ))}
                    {days.map((day) => {
                        const inMonth = day.getMonth() === viewMonth.getMonth();
                        const disabled = day < minDay;
                        const isSelected = selected && isSameDay(day, selected);
                        return (
                            <button
                                key={day.toISOString()}
                                type="button"
                                disabled={disabled}
                                onClick={() => selectDay(day)}
                                className={`mx-auto flex size-8 items-center justify-center rounded-full text-sm transition ${
                                    isSelected
                                        ? 'bg-[#2563eb] font-semibold text-white'
                                        : disabled
                                          ? 'cursor-not-allowed text-stone-300'
                                          : inMonth
                                            ? 'text-stone-900 hover:bg-stone-100'
                                            : 'text-stone-300 hover:bg-stone-100'
                                }`}
                            >
                                {day.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <select
                    aria-label="시"
                    className="h-11 flex-1 rounded-md border border-stone-300 bg-white px-3 text-sm"
                    value={hour ?? ''}
                    onChange={(e) => selectTime(Number(e.target.value), minute ?? 0)}
                >
                    <option value="" disabled>
                        시
                    </option>
                    {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                            {pad2(h)}시
                        </option>
                    ))}
                </select>
                <select
                    aria-label="분"
                    className="h-11 flex-1 rounded-md border border-stone-300 bg-white px-3 text-sm"
                    value={minute ?? ''}
                    onChange={(e) => selectTime(hour ?? 9, Number(e.target.value))}
                >
                    <option value="" disabled>
                        분
                    </option>
                    {[0, 10, 20, 30, 40, 50].map((m) => (
                        <option key={m} value={m}>
                            {pad2(m)}분
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

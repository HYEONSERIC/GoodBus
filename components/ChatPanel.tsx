'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chatsAPI, authAPI } from '@/lib/api';

interface ChatUser {
    id: string;
    email: string;
    role: string;
    displayName?: string | null;
    companyName?: string | null;
}

interface ChatRoom {
    id: string;
    trip: {
        id: string;
        origin: string;
        destination: string;
        dateTime: string;
    };
    passenger: ChatUser;
    bidder: ChatUser;
    unreadCount: number;
    lastMessage?: ChatMessage | null;
}

interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    message: string;
    createdAt: string;
    readAt?: string | null;
    isMine?: boolean;
    sender: ChatUser;
}

function formatMessageTime(value: string) {
    const date = new Date(value);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();

    if (sameDay) {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return date.toLocaleString([], {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatListTime(value: string) {
    return new Date(value).toLocaleTimeString('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/** 목록·말풍선에 표시할 상대 표기 (이름·상호 없으면 역할 기반) */
function formatChatPeerLabel(u: ChatUser) {
    const name = u.displayName?.trim() || u.companyName?.trim();
    if (name) return name;
    const r = String(u.role);
    if (r === 'Driver') return '기사님';
    if (r === 'BusCompany') return '운수업체';
    if (r === 'Passenger') return '고객님';
    return u.email;
}

function formatTripDepartureDay(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'MM월dd일');
}

/** 목록·방 헤더: 출발 일자 + 구간 (기사·업체 화면에서는 ' 손님' 접미) */
function chatTripHeadline(room: ChatRoom, viewerRole?: string) {
    const day = formatTripDepartureDay(room.trip.dateTime);
    const route = `${room.trip.origin} → ${room.trip.destination}`;
    const prefix = day ? `${day} ` : '';
    const suffix =
        viewerRole === 'Driver' || viewerRole === 'BusCompany' ? ' 손님' : '';
    return `${prefix}${route}${suffix}`;
}

interface ChatPanelProps {
    /** 열린 뒤 이 방을 자동 선택 (견적 상세에서 채팅하기 등) */
    focusRoomId?: string | null;
    onFocusRoomConsumed?: () => void;
    /**
     * true면 채팅방(대화) 화면만 뷰포트에서 헤더·하단 탭을 뺀 높이로 채움 (승객 모바일 레이아웃용)
     */
    fillRoomHeight?: boolean;
}

export function ChatPanel({
    focusRoomId,
    onFocusRoomConsumed,
    fillRoomHeight = false,
}: ChatPanelProps) {
    const [user, setUser] = useState<ChatUser | null>(null);
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!focusRoomId || rooms.length === 0) return;
        const found = rooms.some((r) => r.id === focusRoomId);
        if (found) {
            setSelectedRoomId(focusRoomId);
            onFocusRoomConsumed?.();
        }
    }, [focusRoomId, rooms]); // eslint-disable-line react-hooks/exhaustive-deps -- onFocusRoomConsumed 의도적 제외

    useEffect(() => {
        const interval = setInterval(() => {
            loadRooms();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!selectedRoomId) return;

        loadMessages(selectedRoomId);
        const interval = setInterval(() => {
            loadMessages(selectedRoomId, false);
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedRoomId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, selectedRoomId]);

    async function loadInitialData() {
        setLoading(true);
        setError('');
        try {
            const me = await authAPI.getMe();
            setUser(me.user);
            await loadRooms();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : '채팅 정보를 불러오지 못했습니다.'
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadRooms() {
        const data = await chatsAPI.getRooms();
        const nextRooms = data.rooms || [];
        setRooms(nextRooms);
    }

    async function loadMessages(roomId: string, showError = true) {
        try {
            const data = await chatsAPI.getMessages(roomId);
            setMessages(data.messages || []);
            await chatsAPI.markRead(roomId);
            await loadRooms();
        } catch (err) {
            if (showError) {
                setError(
                    err instanceof Error
                        ? err.message
                        : '메시지를 불러오지 못했습니다.'
                );
            }
        }
    }

    async function sendMessage() {
        const message = draft.trim();
        if (!selectedRoomId || !message) return;

        setSending(true);
        try {
            setDraft('');
            const data = await chatsAPI.sendMessage(selectedRoomId, message);
            setMessages((prev) => [...prev, data.message]);
            await loadRooms();
        } catch (err) {
            setDraft(message);
            setError(
                err instanceof Error ? err.message : '메시지 전송에 실패했습니다.'
            );
        } finally {
            setSending(false);
        }
    }

    function getOtherUser(room: ChatRoom) {
        if (!user) return room.bidder;
        return room.passenger.id === user.id ? room.bidder : room.passenger;
    }

    function leaveRoom() {
        setSelectedRoomId('');
        setMessages([]);
        setError('');
        setDraft('');
    }

    if (loading) {
        return <div className="p-4 text-sm text-gray-500">채팅 로딩 중...</div>;
    }

    if (!selectedRoomId || !selectedRoom) {
        return (
            <div className="flex flex-col bg-white">
                {error && !selectedRoomId && (
                    <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
                        {error}
                    </p>
                )}
                {rooms.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-500">
                        아직 채팅방이 없습니다.
                    </p>
                ) : (
                    <ul>
                        {rooms.map((room) => {
                            const otherUser = getOtherUser(room);
                            const previewTime = room.lastMessage?.createdAt;
                            return (
                                <li
                                    key={room.id}
                                    className="border-b border-gray-100 last:border-b-0"
                                >
                                    <button
                                        type="button"
                                        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50 active:bg-gray-100"
                                        onClick={() => {
                                            setError('');
                                            setSelectedRoomId(room.id);
                                        }}
                                    >
                                        <div
                                            className="h-11 w-11 shrink-0 rounded-full bg-gray-200 ring-1 ring-gray-200/80"
                                            aria-hidden
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 text-[15px] font-medium leading-snug text-gray-900">
                                                {chatTripHeadline(
                                                    room,
                                                    user?.role,
                                                )}
                                            </p>
                                            <p className="mt-0.5 truncate text-sm text-gray-500">
                                                {(room.lastMessage?.message ?? '').trim()
                                                    ? room.lastMessage!.message
                                                    : formatChatPeerLabel(
                                                          otherUser
                                                      )}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            {previewTime && (
                                                <time
                                                    className="text-xs text-gray-500"
                                                    dateTime={previewTime}
                                                >
                                                    {formatListTime(
                                                        previewTime
                                                    )}
                                                </time>
                                            )}
                                            {room.unreadCount > 0 && (
                                                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                                                    {room.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        );
    }

    const other = getOtherUser(selectedRoom);

    return (
        <div
            className={
                fillRoomHeight
                    ? 'flex h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom,0px))] max-h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden bg-white'
                    : 'flex min-h-[min(70vh,560px)] flex-col overflow-hidden bg-white'
            }
        >
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-2 py-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={leaveRoom}
                    aria-label="채팅 목록으로"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1 py-0.5">
                    <p className="truncate text-[15px] font-semibold leading-tight text-gray-900">
                        {chatTripHeadline(selectedRoom, user?.role)}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                        상대: {formatChatPeerLabel(other)}
                    </p>
                </div>
            </div>
            {error && (
                <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
                    {error}
                </p>
            )}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f3f3f5] p-4">
                {messages.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-500">
                        아직 메시지가 없습니다.
                    </p>
                ) : (
                    messages.map((message) => {
                        const isMine =
                            message.isMine ??
                            (message.senderId === user?.id ||
                                message.sender.email === user?.email);
                        return (
                            <div
                                key={message.id}
                                className={`flex w-full ${
                                    isMine ? 'justify-end' : 'justify-start'
                                }`}
                            >
                                <div
                                    className={`flex max-w-[85%] flex-col ${
                                        isMine
                                            ? 'ml-auto items-end'
                                            : 'mr-auto items-start'
                                    }`}
                                >
                                    {!isMine && (
                                        <span className="mb-1 text-xs text-gray-500">
                                            {formatChatPeerLabel(
                                                message.sender
                                            )}
                                        </span>
                                    )}
                                    <div
                                        className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                            isMine
                                                ? 'ml-auto rounded-br-md bg-orange-500 text-white'
                                                : 'mr-auto rounded-bl-md border border-gray-200 bg-white text-slate-950'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">
                                            {message.message}
                                        </p>
                                    </div>
                                    <div
                                        className={`mt-1 text-[11px] ${
                                            isMine
                                                ? 'text-right text-gray-400'
                                                : 'text-left text-gray-400'
                                        }`}
                                    >
                                        <span>
                                            {formatMessageTime(
                                                message.createdAt
                                            )}
                                        </span>
                                        {isMine && (
                                            <span className="ml-2">
                                                {message.readAt
                                                    ? '읽음'
                                                    : '안읽음'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>
            <div className="flex shrink-0 gap-2 border-t border-gray-200 bg-white p-3">
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            sendMessage();
                        }
                    }}
                    placeholder="메시지를 입력하세요"
                    className="rounded-lg bg-gray-50"
                />
                <Button
                    onClick={sendMessage}
                    disabled={sending || !draft.trim()}
                    className="shrink-0"
                >
                    전송
                </Button>
            </div>
        </div>
    );
}

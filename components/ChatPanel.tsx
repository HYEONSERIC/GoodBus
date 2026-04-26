'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chatsAPI, authAPI } from '@/lib/api';

interface ChatUser {
    id: string;
    email: string;
    role: string;
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

export function ChatPanel() {
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
        const interval = setInterval(() => {
            loadRooms(false);
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
            await loadRooms(true);
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

    async function loadRooms(selectFirst: boolean) {
        const data = await chatsAPI.getRooms();
        const nextRooms = data.rooms || [];
        setRooms(nextRooms);

        if (selectFirst && !selectedRoomId && nextRooms.length > 0) {
            setSelectedRoomId(nextRooms[0].id);
        }
    }

    async function loadMessages(roomId: string, showError = true) {
        try {
            const data = await chatsAPI.getMessages(roomId);
            setMessages(data.messages || []);
            await chatsAPI.markRead(roomId);
            await loadRooms(false);
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
            await loadRooms(false);
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

    if (loading) {
        return <div className="p-4 text-sm text-gray-500">채팅 로딩 중...</div>;
    }

    return (
        <div className="grid min-h-[520px] gap-4 md:grid-cols-[260px_1fr]">
            <div className="rounded-lg border bg-white">
                <div className="border-b p-3">
                    <h3 className="font-semibold">채팅방</h3>
                    <p className="text-xs text-gray-500">
                        낙찰된 여정 기준으로 생성됩니다.
                    </p>
                </div>
                <div className="max-h-[455px] overflow-y-auto">
                    {rooms.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">
                            아직 채팅방이 없습니다.
                        </p>
                    ) : (
                        rooms.map((room) => {
                            const otherUser = getOtherUser(room);
                            return (
                                <button
                                    key={room.id}
                                    type="button"
                                    className={`w-full border-b p-3 text-left text-sm hover:bg-gray-50 ${
                                        selectedRoomId === room.id
                                            ? 'bg-orange-50'
                                            : ''
                                    }`}
                                    onClick={() => setSelectedRoomId(room.id)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium">
                                                {room.trip.origin} -{' '}
                                                {room.trip.destination}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {otherUser.email}
                                            </p>
                                        </div>
                                        {room.unreadCount > 0 && (
                                            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                                                {room.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    {room.lastMessage && (
                                        <p className="mt-2 truncate text-xs text-gray-500">
                                            {room.lastMessage.message}
                                        </p>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="flex min-h-[520px] flex-col rounded-lg border bg-white">
                {selectedRoom ? (
                    <>
                        <div className="border-b p-3">
                            <p className="font-semibold">
                                {selectedRoom.trip.origin} -{' '}
                                {selectedRoom.trip.destination}
                            </p>
                            <p className="text-xs text-gray-500">
                                상대방: {getOtherUser(selectedRoom).email}
                            </p>
                        </div>
                        {error && (
                            <p className="border-b bg-red-50 p-2 text-xs text-red-600">
                                {error}
                            </p>
                        )}
                        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
                            {messages.length === 0 ? (
                                <p className="text-center text-sm text-gray-500">
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
                                                isMine
                                                    ? 'justify-end'
                                                    : 'justify-start'
                                            }`}
                                        >
                                            <div
                                                className={`flex max-w-[75%] flex-col ${
                                                    isMine
                                                        ? 'ml-auto items-end'
                                                        : 'mr-auto items-start'
                                                }`}
                                            >
                                                {!isMine && (
                                                    <span className="mb-1 text-xs text-gray-500">
                                                        {message.sender.email}
                                                    </span>
                                                )}
                                                <div
                                                    className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                                        isMine
                                                            ? 'ml-auto rounded-br-md bg-orange-500 text-white'
                                                            : 'mr-auto rounded-bl-md border bg-white text-slate-950'
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
                        <div className="flex gap-2 border-t p-3">
                            <Input
                                value={draft}
                                onChange={(event) =>
                                    setDraft(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' &&
                                        !event.shiftKey
                                    ) {
                                        event.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="메시지를 입력하세요"
                            />
                            <Button
                                onClick={sendMessage}
                                disabled={sending || !draft.trim()}
                            >
                                전송
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-500">
                        채팅방을 선택하세요.
                    </div>
                )}
            </div>
        </div>
    );
}

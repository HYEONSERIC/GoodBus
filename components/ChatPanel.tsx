'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, MoreVertical, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { chatsAPI, authAPI } from '@/lib/api';

interface ChatUser {
    id: string;
    email: string;
    role: string;
    displayName?: string | null;
    companyName?: string | null;
    profileImageUrl?: string | null;
}

interface ChatRoom {
    id: string;
    /** 이 사용자만의 목록·헤더 표시 제목 (API에서 역할에 맞게 채움) */
    customTitle?: string | null;
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

const CHAT_IMAGE_TOKEN = '__CHAT_IMAGE__:';

function parseChatMessageContent(raw: string) {
    const trimmed = (raw || '').trim();
    if (!trimmed.startsWith(CHAT_IMAGE_TOKEN)) {
        return { text: raw, imageUrl: null as string | null };
    }
    const imageUrl = trimmed.slice(CHAT_IMAGE_TOKEN.length).trim();
    return { text: '', imageUrl: imageUrl || null };
}

function resolveChatImageUrl(raw?: string | null): string | null {
    const u = raw?.trim();
    if (!u) return null;
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) {
        return u;
    }
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(
        /\/$/,
        ''
    );
    if (u.startsWith('/uploads')) return `${base}${u}`;
    return u;
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

const DEFAULT_CHAT_AVATAR = '/chat-default-avatar.png';

function resolveProfileImageUrl(raw?: string | null): string | null {
    const u = raw?.trim();
    if (!u) return null;
    if (
        u.startsWith('http://') ||
        u.startsWith('https://') ||
        u.startsWith('data:')
    ) {
        return u;
    }
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
        .replace(/\/$/, '');
    if (u.startsWith('/uploads')) return `${base}${u}`;
    return u;
}

function ChatPeerAvatar({
    profileImageUrl,
    size = 'list',
    className,
}: {
    profileImageUrl?: string | null;
    size?: 'list' | 'header';
    className?: string;
}) {
    const resolved = resolveProfileImageUrl(profileImageUrl);
    const sizeClass = size === 'header' ? 'h-10 w-10' : 'h-11 w-11';
    return (
        <img
            src={resolved ?? DEFAULT_CHAT_AVATAR}
            alt=""
            className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-gray-200/80 ${className ?? ''}`}
            onError={(e) => {
                const el = e.currentTarget;
                if (el.dataset.fallback === '1') return;
                el.dataset.fallback = '1';
                el.src = DEFAULT_CHAT_AVATAR;
            }}
        />
    );
}

function formatTripDepartureDay(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'MM월dd일');
}

function chatTripDefaultTitle(room: ChatRoom) {
    const day = formatTripDepartureDay(room.trip.dateTime);
    const prefix = day ? `${day} ` : '';
    return `${prefix}출발지 ${room.trip.origin} 도착지 ${room.trip.destination}`;
}

/** 목록·방 헤더: 사용자 지정 제목 또는 출발지/도착지 (기사·업체 화면에서는 ' 손님' 접미) */
function chatTripHeadline(room: ChatRoom, viewerRole?: string) {
    const suffix =
        viewerRole === 'Driver' || viewerRole === 'BusCompany' ? ' 손님' : '';
    const t = room.customTitle?.trim();
    if (t) return `${t}${suffix}`;
    return `${chatTripDefaultTitle(room)}${suffix}`;
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
    const [uploadingImage, setUploadingImage] = useState(false);
    const [error, setError] = useState('');
    const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(
        null
    );
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    /** 한글 IME 조합 중 Enter가 전송되지 않도록 (안녕하세요 + 요 중복 전송 방지) */
    const isComposingRef = useRef(false);
    const [roomListMenuId, setRoomListMenuId] = useState<string | null>(null);
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [renameRoom, setRenameRoom] = useState<ChatRoom | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const [renameSaving, setRenameSaving] = useState(false);

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

    useEffect(() => {
        if (!roomListMenuId && !headerMenuOpen) return;
        const close = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (t.closest('[data-chat-room-menu]')) return;
            setRoomListMenuId(null);
            setHeaderMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [roomListMenuId, headerMenuOpen]);

    useEffect(() => {
        return () => {
            if (pendingImagePreview) {
                URL.revokeObjectURL(pendingImagePreview);
            }
        };
    }, [pendingImagePreview]);

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
        if (!selectedRoomId) return;
        if (!message) {
            if (pendingImageFile) {
                await sendImageMessage();
            }
            return;
        }

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

    async function sendImageMessage() {
        if (!selectedRoomId || !pendingImageFile) return;

        setUploadingImage(true);
        setError('');
        try {
            const { imageUrl } = await chatsAPI.uploadImage(
                selectedRoomId,
                pendingImageFile
            );
            const payload = `${CHAT_IMAGE_TOKEN}${imageUrl}`;
            const data = await chatsAPI.sendMessage(selectedRoomId, payload);
            setMessages((prev) => [...prev, data.message]);
            await loadRooms();
            setPendingImageFile(null);
            if (pendingImagePreview) {
                URL.revokeObjectURL(pendingImagePreview);
            }
            setPendingImagePreview(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : '이미지 전송에 실패했습니다.'
            );
        } finally {
            setUploadingImage(false);
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
        if (pendingImagePreview) {
            URL.revokeObjectURL(pendingImagePreview);
        }
        setPendingImageFile(null);
        setPendingImagePreview(null);
        setRoomListMenuId(null);
        setHeaderMenuOpen(false);
    }

    async function handleLeaveChatRoom(roomId: string) {
        if (
            !confirm(
                '채팅방을 나가시겠어요? 내 목록에서는 사라지며, 상대는 남아 있으면 계속 대화할 수 있습니다.',
            )
        ) {
            return;
        }
        try {
            await chatsAPI.leaveRoom(roomId);
            setRoomListMenuId(null);
            setHeaderMenuOpen(false);
            if (selectedRoomId === roomId) {
                leaveRoom();
            }
            await loadRooms();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : '채팅방을 나가지 못했습니다.',
            );
        }
    }

    function openRenameDialog(room: ChatRoom) {
        setRenameRoom(room);
        setRenameDraft(room.customTitle?.trim() ?? '');
        setRoomListMenuId(null);
        setHeaderMenuOpen(false);
    }

    async function saveRenameDialog() {
        if (!renameRoom) return;
        setRenameSaving(true);
        setError('');
        try {
            const trimmed = renameDraft.trim();
            await chatsAPI.updateRoom(renameRoom.id, {
                customTitle: trimmed.length ? trimmed.slice(0, 80) : null,
            });
            setRenameRoom(null);
            await loadRooms();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : '이름을 저장하지 못했습니다.',
            );
        } finally {
            setRenameSaving(false);
        }
    }

    const renameDialogEl = (
        <Dialog
            open={Boolean(renameRoom)}
            onOpenChange={(open) => {
                if (!open && !renameSaving) setRenameRoom(null);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>채팅방 이름</DialogTitle>
                    <DialogDescription>
                        내 채팅 목록과 방 상단에만 적용되며, 상대방 화면에는
                        반영되지 않습니다. 비우면 날짜·출발지·도착지가 제목으로
                        표시됩니다. (최대 80자)
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                    <Label htmlFor="chat-room-title">표시 이름</Label>
                    <Input
                        id="chat-room-title"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        maxLength={80}
                        placeholder={
                            renameRoom
                                ? chatTripDefaultTitle(renameRoom)
                                : ''
                        }
                    />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRenameRoom(null)}
                        disabled={renameSaving}
                    >
                        취소
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void saveRenameDialog()}
                        disabled={renameSaving}
                    >
                        {renameSaving ? '저장 중…' : '저장'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    if (loading) {
        return (
            <>
                <div className="p-4 text-sm text-gray-500">채팅 로딩 중...</div>
                {renameDialogEl}
            </>
        );
    }

    if (!selectedRoomId || !selectedRoom) {
        return (
            <>
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
                            const lastParsed = parseChatMessageContent(
                                room.lastMessage?.message ?? ''
                            );
                            return (
                                <li
                                    key={room.id}
                                    className="border-b border-gray-100 last:border-b-0"
                                >
                                    <div className="flex items-start gap-1 px-3 py-3 sm:px-4">
                                        <button
                                            type="button"
                                            className="flex min-w-0 flex-1 items-start gap-3 rounded-lg py-0.5 pl-1 pr-2 text-left transition hover:bg-gray-50 active:bg-gray-100"
                                            onClick={() => {
                                                setError('');
                                                setRoomListMenuId(null);
                                                setSelectedRoomId(room.id);
                                            }}
                                        >
                                            <ChatPeerAvatar
                                                profileImageUrl={
                                                    otherUser.profileImageUrl
                                                }
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-2 text-[15px] font-medium leading-snug text-gray-900">
                                                    {chatTripHeadline(
                                                        room,
                                                        user?.role,
                                                    )}
                                                </p>
                                                <p className="mt-0.5 truncate text-sm text-gray-500">
                                                    {(
                                                        room.lastMessage
                                                            ?.message ?? ''
                                                    ).trim() &&
                                                    !lastParsed.imageUrl
                                                        ? room.lastMessage!
                                                              .message
                                                        : lastParsed.imageUrl
                                                        ? '사진'
                                                        : formatChatPeerLabel(
                                                              otherUser,
                                                          )}
                                                </p>
                                            </div>
                                        </button>
                                        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                                            {previewTime && (
                                                <time
                                                    className="text-xs text-gray-500"
                                                    dateTime={previewTime}
                                                >
                                                    {formatListTime(
                                                        previewTime,
                                                    )}
                                                </time>
                                            )}
                                            {room.unreadCount > 0 && (
                                                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                                                    {room.unreadCount}
                                                </span>
                                            )}
                                            <div
                                                className="relative"
                                                data-chat-room-menu
                                            >
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0 text-gray-600"
                                                    aria-label="채팅방 메뉴"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setHeaderMenuOpen(false);
                                                        setRoomListMenuId(
                                                            (id) =>
                                                                id === room.id
                                                                    ? null
                                                                    : room.id,
                                                        );
                                                    }}
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                                {roomListMenuId === room.id ? (
                                                    <div
                                                        role="menu"
                                                        className="absolute right-0 top-full z-20 mt-0.5 min-w-[10.5rem] rounded-md border border-gray-200 bg-white py-1 shadow-md"
                                                    >
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openRenameDialog(
                                                                    room,
                                                                );
                                                            }}
                                                        >
                                                            채팅방 이름 바꾸기
                                                        </button>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleLeaveChatRoom(
                                                                    room.id,
                                                                );
                                                            }}
                                                        >
                                                            채팅방 나가기
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
                {renameDialogEl}
            </>
        );
    }

    const other = getOtherUser(selectedRoom);

    return (
        <>
        <div
            className={
                fillRoomHeight
                    ? 'flex h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom,0px))] max-h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden bg-white'
                    : 'flex min-h-[min(70vh,560px)] flex-col overflow-hidden bg-white'
            }
        >
            <div className="flex shrink-0 items-center gap-1 border-b border-gray-100 px-2 py-2">
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
                <ChatPeerAvatar
                    profileImageUrl={other.profileImageUrl}
                    size="header"
                    className="ml-0.5"
                />
                <button
                    type="button"
                    className="min-w-0 flex-1 py-0.5 text-left"
                    onClick={() => openRenameDialog(selectedRoom)}
                >
                    <p className="truncate text-[15px] font-semibold leading-tight text-gray-900">
                        {chatTripHeadline(selectedRoom, user?.role)}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                        상대: {formatChatPeerLabel(other)}
                    </p>
                </button>
                <div className="relative shrink-0" data-chat-room-menu>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-gray-600"
                        aria-label="채팅방 메뉴"
                        onClick={(e) => {
                            e.stopPropagation();
                            setRoomListMenuId(null);
                            setHeaderMenuOpen((o) => !o);
                        }}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                    {headerMenuOpen ? (
                        <div
                            role="menu"
                            className="absolute right-0 top-full z-20 mt-0.5 min-w-[10.5rem] rounded-md border border-gray-200 bg-white py-1 shadow-md"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openRenameDialog(selectedRoom);
                                }}
                            >
                                채팅방 이름 바꾸기
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleLeaveChatRoom(selectedRoom.id);
                                }}
                            >
                                채팅방 나가기
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
            {error && (
                <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
                    {error}
                </p>
            )}
            <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto bg-[#f3f3f5] p-4">
                {messages.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-500">
                        아직 메시지가 없습니다.
                    </p>
                ) : (
                    messages.map((message) => {
                        const { text, imageUrl: rawImageUrl } = parseChatMessageContent(
                            message.message
                        );
                        const imageUrl = resolveChatImageUrl(rawImageUrl);
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
                                    {imageUrl ? (
                                        <a
                                            href={imageUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={isMine ? 'ml-auto' : 'mr-auto'}
                                        >
                                            <img
                                                src={imageUrl}
                                                alt="보낸 이미지"
                                                className="max-h-56 max-w-full rounded-xl object-contain"
                                            />
                                        </a>
                                    ) : (
                                        <div
                                            className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                                isMine
                                                    ? 'ml-auto rounded-br-md bg-orange-500 text-white'
                                                    : 'mr-auto rounded-bl-md border border-gray-200 bg-white text-slate-950'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap break-words">
                                                {text}
                                            </p>
                                        </div>
                                    )}
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
            {pendingImagePreview ? (
                <div className="mx-3 mb-2 mt-2 flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <img
                        src={pendingImagePreview}
                        alt="전송 예정 이미지"
                        className="max-h-28 rounded-md object-contain"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                            setPendingImageFile(null);
                            if (pendingImagePreview) {
                                URL.revokeObjectURL(pendingImagePreview);
                            }
                            setPendingImagePreview(null);
                            if (imageInputRef.current) {
                                imageInputRef.current.value = '';
                            }
                        }}
                        aria-label="선택한 이미지 제거"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : null}
            <div className="flex shrink-0 gap-2 border-t border-gray-200 bg-white p-3">
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                            setError('이미지 파일만 전송할 수 있습니다.');
                            return;
                        }
                        setPendingImageFile(file);
                        if (pendingImagePreview) {
                            URL.revokeObjectURL(pendingImagePreview);
                        }
                        setPendingImagePreview(URL.createObjectURL(file));
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={sending || uploadingImage}
                    aria-label="이미지 선택"
                >
                    <ImagePlus className="h-4 w-4" />
                </Button>
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onCompositionStart={() => {
                        isComposingRef.current = true;
                    }}
                    onCompositionEnd={() => {
                        // 조합 확정 직후 Enter keydown이 한 번 더 오는 브라우저 대응
                        isComposingRef.current = true;
                        window.setTimeout(() => {
                            isComposingRef.current = false;
                        }, 0);
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter' || event.shiftKey) return;
                        if (
                            event.nativeEvent.isComposing ||
                            isComposingRef.current
                        ) {
                            return;
                        }
                        event.preventDefault();
                        void sendMessage();
                    }}
                    placeholder="메시지를 입력하세요"
                    className="rounded-lg bg-gray-50"
                />
                <Button
                    onClick={sendMessage}
                    disabled={
                        sending ||
                        uploadingImage ||
                        (!draft.trim() && !pendingImageFile)
                    }
                    className="shrink-0"
                >
                    전송
                </Button>
            </div>
        </div>
        {renameDialogEl}
        </>
    );
}

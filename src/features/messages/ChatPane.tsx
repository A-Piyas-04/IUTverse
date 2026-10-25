"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, BellOff, X } from "lucide-react";
import { Avatar, Button, useToast } from "@/components/ui/Ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiPage, mediaUrl } from "@/lib/api";
import { conversationName } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Conversation, Message, PaginatedResult } from "@/lib/types";
import { editChatMessage, markConversationRead, reactToChatMessage, sendChatMessage, setBlocked, type OutgoingChatMessage } from "./chatApi";
import { canEditMessage, dayLabel } from "./chatModel";
import { ChatInfoPanel } from "./ChatInfoPanel";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import styles from "./Chat.module.css";

const PAGE_SIZE = 40;
// Signed media links last an hour; reuse one for 45 minutes so photos do not reload on every refresh.
const MEDIA_LINK_REUSE_MS = 45 * 60_000;
const GROUP_GAP_MS = 5 * 60_000;

interface PendingMessage {
  tempId: number;
  outgoing: OutgoingChatMessage;
  status: "sending" | "failed";
  sentAt: string;
}

type MessagePages = InfiniteData<PaginatedResult<Message>>;

const dayKey = (value: string) => new Date(value).toDateString();

function MediaViewer({ media, onClose }: { media: { kind: "image" | "video"; url: string }; onClose(): void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className={styles.viewer} role="dialog" aria-modal="true" aria-label="Photo" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <button type="button" className={styles.viewerClose} aria-label="Close" onClick={onClose} autoFocus><X size={22} /></button>
      {media.kind === "image" ? <img src={media.url} alt="" /> : <video src={media.url} controls autoPlay playsInline />}
    </div>
  );
}

export function ChatPane({ conversation, onBack }: { conversation: Conversation; onBack(): void }) {
  const { user } = useAuth();
  const me = user?.id;
  const cache = useQueryClient();
  const { notify } = useToast();
  const id = conversation.id;
  const name = conversationName(conversation);
  const [editing, setEditing] = useState<Message | null>(null);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [viewer, setViewer] = useState<{ kind: "image" | "video"; url: string } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showJump, setShowJump] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const keepPosition = useRef<{ height: number; top: number } | null>(null);
  const mediaLinks = useRef(new Map<number, { url: string; at: number }>());

  // Re-check which messages are still editable.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(timer);
  }, []);

  const query = useInfiniteQuery({
    queryKey: ["messages", id],
    queryFn: ({ pageParam, signal }) => apiPage<Message>(`/chat/conversations/${id}/messages?page=${pageParam}&limit=${PAGE_SIZE}`, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.data.length === PAGE_SIZE ? pages.length + 1 : undefined),
    // Realtime does the work; this catches anything it missed.
    refetchInterval: 20_000,
  });

  // Pages come newest first; new messages shift the offsets, so de-duplicate by id.
  const messages = useMemo(() => {
    const byId = new Map<number, Message>();
    for (const page of [...(query.data?.pages ?? [])].reverse()) for (const message of page.data) byId.set(message.id, message);
    return [...byId.values()].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime() || a.id - b.id);
  }, [query.data]);

  // Live updates: new messages, delivery and read ticks, edits, reactions.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void cache.invalidateQueries({ queryKey: ["messages", id] });
        void cache.invalidateQueries({ queryKey: ["conversations"] });
      }, 120);
    };
    const channel = supabase
      .channel(`conversation:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${id}` }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [cache, id]);

  // Read receipts: while this chat is on screen, everything sent to me is read.
  const hasUnread = messages.some((message) => message.senderId !== me && !message.readAt);
  useEffect(() => {
    if (!hasUnread) return;
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      void markConversationRead(id).then(() => cache.invalidateQueries({ queryKey: ["conversations"] })).catch(() => {});
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [cache, hasUnread, id, messages.length]);

  const mediaSrc = (message: Message) => {
    const fresh = message.attachment?.url ?? message.attachmentUrl ?? null;
    if (!fresh) return null;
    const known = mediaLinks.current.get(message.id);
    if (known && Date.now() - known.at < MEDIA_LINK_REUSE_MS) return known.url;
    mediaLinks.current.set(message.id, { url: fresh, at: Date.now() });
    return fresh;
  };

  const patchMessage = useCallback(
    (messageId: number, change: (message: Message) => Message) =>
      cache.setQueryData<MessagePages>(["messages", id], (data) =>
        data && { ...data, pages: data.pages.map((page) => ({ ...page, data: page.data.map((message) => (message.id === messageId ? change(message) : message)) })) }),
    [cache, id],
  );

  const send = useCallback(
    async (outgoing: OutgoingChatMessage, retryId?: number) => {
      const tempId = retryId ?? -Date.now();
      setPending((list) => (retryId ? list.map((item) => (item.tempId === tempId ? { ...item, status: "sending" } : item)) : [...list, { tempId, outgoing, status: "sending", sentAt: new Date().toISOString() }]));
      nearBottom.current = true;
      try {
        await sendChatMessage(id, outgoing);
        await cache.invalidateQueries({ queryKey: ["messages", id] });
        void cache.invalidateQueries({ queryKey: ["conversations"] });
        void cache.invalidateQueries({ queryKey: ["chat-media", id] });
        setPending((list) => list.filter((item) => item.tempId !== tempId));
        if (outgoing.media?.previewUrl) URL.revokeObjectURL(outgoing.media.previewUrl);
      } catch (failure) {
        setPending((list) => list.map((item) => (item.tempId === tempId ? { ...item, status: "failed" } : item)));
        notify(failure instanceof Error ? failure.message : "Message not sent.");
      }
    },
    [cache, id, notify],
  );

  const react = useCallback(
    (messageId: number, emoji: string) => {
      if (!me) return;
      // Show it at once; the server's answer (and Realtime) settle it.
      patchMessage(messageId, (message) => {
        const others = (message.reactions || []).filter((reaction) => reaction.userId !== me);
        const current = message.reactions?.find((reaction) => reaction.userId === me)?.emoji;
        return { ...message, reactions: current === emoji ? others : [...others, { emoji, userId: me }] };
      });
      reactToChatMessage(messageId, emoji)
        .catch((failure) => notify(failure instanceof Error ? failure.message : "Reaction not saved."))
        .finally(() => void cache.invalidateQueries({ queryKey: ["messages", id] }));
    },
    [cache, id, me, notify, patchMessage],
  );

  const saveEdit = async (content: string) => {
    if (!editing) return;
    const updated = await editChatMessage(editing.id, content);
    patchMessage(editing.id, () => updated.data);
    setEditing(null);
    void cache.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Stick to the bottom for new messages unless the member scrolled up to read.
  const lastKey = `${messages.at(-1)?.id ?? 0}:${pending.length}`;
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (keepPosition.current) {
      element.scrollTop = element.scrollHeight - keepPosition.current.height + keepPosition.current.top;
      keepPosition.current = null;
      return;
    }
    if (nearBottom.current || messages.at(-1)?.senderId === me) element.scrollTop = element.scrollHeight;
    else setShowJump(true);
  }, [lastKey, me, messages]);

  const loadEarlier = () => {
    const element = scroller.current;
    if (element) keepPosition.current = { height: element.scrollHeight, top: element.scrollTop };
    void query.fetchNextPage();
  };

  const names = useMemo(
    () => new Map((conversation.participants || []).map((participant) => [participant.userId, participant.user?.displayName || "Member"])),
    [conversation.participants],
  );

  const shown: { message: Message; pending?: PendingMessage }[] = [
    ...messages.map((message) => ({ message })),
    ...pending.map((item) => ({
      pending: item,
      message: {
        id: item.tempId,
        conversationId: id,
        senderId: me || "",
        kind: item.outgoing.gif ? "gif" : item.outgoing.media ? item.outgoing.media.kind : "text",
        content: item.outgoing.content?.trim() || "",
        sentAt: item.sentAt,
        attachment: item.outgoing.media
          ? { url: item.outgoing.media.previewUrl ?? null, name: item.outgoing.media.file.name, size: item.outgoing.media.file.size, width: item.outgoing.media.width, height: item.outgoing.media.height, durationMs: item.outgoing.media.durationMs, waveform: item.outgoing.media.waveform }
          : null,
        gif: item.outgoing.gif ?? null,
        reactions: [],
      } satisfies Message,
    })),
  ];

  const subtitle = conversation.conversationType === "group" ? "Group chat" : conversation.otherUser?.department || "Verified IUT member";
  const blocked = conversation.blocked;

  // Opening a chat that was marked as unread clears the mark.
  const markedUnread = useRef(conversation.settings?.markedUnread);
  useEffect(() => {
    if (markedUnread.current) void markConversationRead(id).then(() => cache.invalidateQueries({ queryKey: ["conversations"] })).catch(() => {});
  }, [cache, id]);

  // A search result may be older than what is loaded: load earlier pages until it is there.
  const jumpTo = async (messageId: number) => {
    let result: { data?: MessagePages; hasNextPage: boolean } = { data: query.data, hasNextPage: query.hasNextPage };
    for (let tries = 0; tries < 25; tries += 1) {
      if (result.data?.pages.some((page) => page.data.some((message) => message.id === messageId))) break;
      if (!result.hasNextPage) break;
      result = await query.fetchNextPage();
    }
    requestAnimationFrame(() => {
      document.getElementById(`message-${messageId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      setHighlighted(messageId);
      setTimeout(() => setHighlighted(null), 1800);
    });
  };

  return (
    <div className={`${styles.pane} ${infoOpen ? styles.paneInfoOpen : ""}`}>
      <header className={styles.header}>
        <Button className={styles.back} variant="ghost" iconOnly aria-label="Back to conversations" onClick={onBack}><ArrowLeft /></Button>
        <button type="button" className={styles.headerButton} onClick={() => setInfoOpen(true)} aria-label={`Chat info for ${name}`} aria-expanded={infoOpen}>
          <Avatar name={name} src={mediaUrl(conversation.otherUser?.profilePictureUrl)} />
          <span className={styles.headerText}>
            <strong>{name}{conversation.settings?.muted && <span className={styles.headerMuted} title="Muted"><BellOff size={14} aria-label="Muted" /></span>}</strong>
            <span>{subtitle}</span>
          </span>
        </button>
      </header>

      <div
        ref={scroller}
        className={styles.scroller}
        onScroll={(event) => {
          const element = event.currentTarget;
          nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
          if (nearBottom.current) setShowJump(false);
        }}
      >
        {query.hasNextPage && (
          <div className={styles.loadEarlier}>
            <button type="button" className={styles.reaction} onClick={loadEarlier} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}
        {query.isLoading && <p className={styles.empty}>Loading messages…</p>}
        {query.isError && <p className={styles.empty}>Messages could not load. {query.error.message}</p>}
        {query.isSuccess && !shown.length && <div className={styles.empty}><p>No messages yet.<br />Say hello to {name}. Messages are private between verified IUT members.</p></div>}
        {shown.map(({ message, pending: item }, index) => {
          const previous = shown[index - 1]?.message;
          const newDay = !previous || dayKey(previous.sentAt) !== dayKey(message.sentAt);
          const grouped = !newDay && previous?.senderId === message.senderId && new Date(message.sentAt).getTime() - new Date(previous.sentAt).getTime() < GROUP_GAP_MS;
          const own = message.senderId === me;
          return (
            <Fragment key={message.id}>
              {newDay && <div className={styles.day}><span>{dayLabel(message.sentAt)}</span></div>}
              <MessageBubble
                message={message}
                own={own}
                grouped={grouped}
                mediaSrc={item ? message.attachment?.url : mediaSrc(message)}
                pending={item?.status}
                highlighted={highlighted === message.id}
                userId={me}
                names={names}
                canEdit={!item && canEditMessage(message, me, now)}
                onReact={item ? undefined : (emoji) => react(message.id, emoji)}
                onEdit={() => setEditing(message)}
                onRetry={item ? () => void send(item.outgoing, item.tempId) : undefined}
                onOpenMedia={setViewer}
              />
            </Fragment>
          );
        })}
      </div>

      {showJump && (
        <button
          type="button"
          className={styles.jump}
          onClick={() => {
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
            setShowJump(false);
          }}
        >
          <ArrowDown size={15} />New messages
        </button>
      )}

      {blocked?.byMe ? (
        <div className={styles.blockedBar} role="status">
          <span>You blocked {name}. You can’t message each other until you unblock them.</span>
          <Button
            variant="secondary"
            onClick={() => conversation.otherUser && void setBlocked(conversation.otherUser.id, false).then(() => cache.invalidateQueries({ queryKey: ["conversations"] })).catch((failure) => notify(failure instanceof Error ? failure.message : "Could not unblock."))}
          >
            Unblock
          </Button>
        </div>
      ) : blocked?.byThem ? (
        <div className={styles.blockedBar} role="status">You can’t reply to this conversation.</div>
      ) : (
        <Composer recipientName={name} editing={editing} onCancelEdit={() => setEditing(null)} onEdit={saveEdit} onSend={(outgoing) => void send(outgoing)} />
      )}
      {infoOpen && (
        <ChatInfoPanel
          conversation={conversation}
          userId={me}
          onClose={() => setInfoOpen(false)}
          onLeave={() => { setInfoOpen(false); onBack(); }}
          onJumpTo={(messageId) => void jumpTo(messageId)}
          onOpenMedia={setViewer}
        />
      )}
      {viewer && <MediaViewer media={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

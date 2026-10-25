"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BellOff, Check, CheckCheck, MessageSquarePlus, Search } from "lucide-react";
import { apiPage, apiRequest, mediaUrl } from "@/lib/api";
import type { Conversation, Profile } from "@/lib/types";
import { Avatar, Button, Dialog, DialogActions, EmptyState, Input } from "@/components/ui/Ui";
import { PageFrame } from "@/components/shell/AppShell";
import { useAuth } from "@/features/auth/AuthProvider";
import { conversationName, dateLabel } from "@/lib/format";
import { deliveryStatus, messagePreview } from "./chatModel";
import { ChatPane } from "./ChatPane";
import pageStyles from "@/styles/pages.module.css";
import styles from "./Chat.module.css";

export function MessagesPage() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [started, setStarted] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setParams = (next: Record<string, string>) => {
    const query = new URLSearchParams(next).toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };
  const list = useQuery({ queryKey: ["conversations"], queryFn: ({ signal }) => apiPage<Conversation>("/chat/conversations", signal), refetchInterval: 30_000 });
  const filtered = useMemo(
    () => list.data?.data.filter((conversation) => conversationName(conversation).toLowerCase().includes(search.toLowerCase())) || [],
    [list.data, search],
  );
  // The list is the source of truth once it has the conversation, so names and
  // unread counts stay current; a just-started chat shows until it does.
  const active = list.data?.data.find((conversation) => conversation.id === activeId) ?? (started?.id === activeId ? started : null);

  useEffect(() => {
    if (params.get("new") === "1") setNewOpen(true);
    const id = Number(params.get("conversation"));
    if (id) setActiveId(id);
  }, [params]);

  const select = (conversation: Conversation) => {
    setActiveId(conversation.id);
    setParams({ conversation: String(conversation.id) });
  };
  const closeNew = () => {
    setNewOpen(false);
    if (params.get("new")) setParams({});
  };

  return (
    <PageFrame title="Messages" eyebrow="Private conversations" action={<Button onClick={() => { setNewOpen(true); setParams({ new: "1" }); }}><MessageSquarePlus size={17} />New message</Button>}>
      <div className={pageStyles.chat}>
        <section className={`${pageStyles.conversationList} ${active ? pageStyles.chatHidden : ""}`} aria-label="Conversations">
          <div className={pageStyles.toolbar}>
            <Search size={17} />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people or conversations" aria-label="Search conversations" />
          </div>
          {list.isError && <EmptyState title="Messages could not load" body={list.error.message} />}
          {filtered.length === 0 && !list.isLoading && <EmptyState title="No conversations found" body="Start a new message with a verified IUT member." />}
          {filtered.map((conversation) => {
            const last = conversation.lastMessage;
            const mine = last && last.senderId === user?.id;
            const unread = Boolean(conversation.unreadCount);
            const muted = Boolean(conversation.settings?.muted);
            return (
              <button key={conversation.id} className={`${pageStyles.conversation} ${active?.id === conversation.id ? pageStyles.conversationActive : ""}`} onClick={() => select(conversation)}>
                <Avatar name={conversationName(conversation)} src={mediaUrl(conversation.otherUser?.profilePictureUrl)} />
                <div className={pageStyles.authorMeta} style={{ minWidth: 0, flex: 1 }}>
                  <strong>{conversationName(conversation)}</strong>
                  <span className={`${styles.listPreview} ${unread && !muted ? styles.listPreviewUnread : ""}`}>
                    {mine && (deliveryStatus(last) === "sent" ? <Check size={14} aria-label="Sent" /> : <CheckCheck size={14} aria-label={deliveryStatus(last) === "read" ? "Read" : "Delivered"} color={deliveryStatus(last) === "read" ? "var(--accent)" : undefined} />)}
                    <span>{messagePreview(last, user?.id)}</span>
                  </span>
                </div>
                <span className={styles.listSide}>
                  <small>{dateLabel(conversation.updatedAt)}</small>
                  {muted && <BellOff size={13} aria-label="Muted" className={styles.listMuted} />}
                  {unread && <span className={`${styles.unread} ${muted ? styles.unreadMuted : ""}`} aria-label={`${conversation.unreadCount} unread`}>{conversation.unreadCount}</span>}
                </span>
              </button>
            );
          })}
        </section>
        <section className={`${pageStyles.chatPane} ${!active ? pageStyles.chatHidden : ""}`}>
          {active ? (
            <ChatPane key={active.id} conversation={active} onBack={() => { setActiveId(null); setParams({}); }} />
          ) : (
            <EmptyState title="Select a conversation" body="Your messages will appear here." />
          )}
        </section>
      </div>
      <NewConversation
        open={newOpen}
        onClose={closeNew}
        onStarted={(conversation) => {
          setStarted(conversation);
          setActiveId(conversation.id);
          setNewOpen(false);
          setParams({ conversation: String(conversation.id) });
        }}
      />
    </PageFrame>
  );
}

function NewConversation({ open, onClose, onStarted }: { open: boolean; onClose(): void; onStarted(conversation: Conversation): void }) {
  const [search, setSearch] = useState("");
  const users = useQuery({ queryKey: ["user-search", search], queryFn: ({ signal }) => apiPage<Profile>(`/users/search?q=${encodeURIComponent(search)}`, signal), enabled: search.trim().length >= 2 });
  const start = useMutation({
    mutationFn: (id: string) => apiRequest<Conversation>("/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ otherUserId: id }) }),
    onSuccess: (result) => onStarted(result.data),
  });
  return (
    <Dialog title="New message" open={open} onClose={onClose}>
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Enter name or email…" autoFocus />
      {users.data?.data.map((profile) => (
        <button key={profile.id} className={pageStyles.conversation} onClick={() => start.mutate(profile.id)}>
          <Avatar name={profile.displayName} src={mediaUrl(profile.profilePictureUrl)} />
          <div><strong>{profile.displayName}</strong><div className={pageStyles.meta}>{profile.department}{profile.batch ? ` ${profile.batch}` : ""}</div></div>
        </button>
      ))}
      {search.length < 2 && <EmptyState title="Find an IUT member" body="Type at least two characters." />}
      <DialogActions><Button variant="secondary" onClick={onClose}>Cancel</Button></DialogActions>
    </Dialog>
  );
}

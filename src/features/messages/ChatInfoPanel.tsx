"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Bell, BellOff, ChevronRight, FileText, Images, Link2, MailWarning, PenLine, Play, Search, Trash2, UserRound, X } from "lucide-react";
import { Avatar, Button, Dialog, DialogActions, Input, useToast } from "@/components/ui/Ui";
import { mediaUrl } from "@/lib/api";
import { conversationName } from "@/lib/format";
import type { Conversation, Message } from "@/lib/types";
import { chatMedia, clearChat, searchChat, setBlocked, updateChatSettings, type MuteOption } from "./chatApi";
import { formatBytes, messagePreview, timeLabel } from "./chatModel";
import { Highlight } from "@/components/shared/Highlight";
import styles from "./Chat.module.css";

type View = "main" | "nicknames" | "media" | "search";
type MediaTab = "media" | "files" | "links";

const MUTE_OPTIONS: { value: MuteOption; label: string }[] = [
  { value: "1h", label: "For 1 hour" },
  { value: "8h", label: "For 8 hours" },
  { value: "24h", label: "For 24 hours" },
  { value: "forever", label: "Until I turn it back on" },
];

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

export const mutedLabel = (until?: string | null) => {
  if (!until) return "";
  const date = new Date(until);
  if (date.getFullYear() >= 9999) return "Muted";
  return `Muted until ${date.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`;
};

interface PanelProps {
  conversation: Conversation;
  userId?: string;
  onClose(): void;
  /** Leave the chat (after "Mark as unread" or "Delete chat"). */
  onLeave(): void;
  onJumpTo(messageId: number): void;
  onOpenMedia(media: { kind: "image" | "video"; url: string }): void;
}

/** Messenger's conversation info: the person, quick actions, nicknames, shared media, privacy. */
export function ChatInfoPanel({ conversation, userId, onClose, onLeave, onJumpTo, onOpenMedia }: PanelProps) {
  const cache = useQueryClient();
  const { notify } = useToast();
  const [view, setView] = useState<View>("main");
  const [tab, setTab] = useState<MediaTab>("media");
  const [muteOpen, setMuteOpen] = useState(false);
  const [confirm, setConfirm] = useState<"block" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const other = conversation.otherUser;
  const name = conversationName(conversation);
  const muted = Boolean(conversation.settings?.muted);
  const blockedByMe = Boolean(conversation.blocked?.byMe);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || confirm) return;
      if (view === "main") onClose();
      else setView("main");
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [confirm, onClose, view]);

  const refresh = () => Promise.all([cache.invalidateQueries({ queryKey: ["conversations"] }), cache.invalidateQueries({ queryKey: ["messages", conversation.id] })]);
  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      await refresh();
      notify(done);
      return true;
    } catch (failure) {
      notify(failure instanceof Error ? failure.message : "That didn’t work. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const mute = (value: MuteOption) => {
    setMuteOpen(false);
    void act(() => updateChatSettings(conversation.id, { mute: value }), value === "off" ? "Unmuted." : "Muted.");
  };

  const heading = { main: "", nicknames: "Nicknames", media: "Media, files and links", search: "Search in conversation" }[view];

  return (
    <aside className={styles.info} aria-label={`About ${name}`}>
      <header className={styles.infoHeader}>
        {view === "main" ? <span /> : <button type="button" className={styles.tool} aria-label="Back" onClick={() => setView("main")}><ArrowLeft size={19} /></button>}
        <strong>{heading}</strong>
        <button type="button" className={styles.tool} aria-label="Close chat info" onClick={onClose}><X size={19} /></button>
      </header>

      {view === "main" && (
        <div className={styles.infoBody}>
          <div className={styles.infoHero}>
            <Avatar size={84} name={name} src={mediaUrl(other?.profilePictureUrl)} />
            <h3>{name}</h3>
            {conversation.otherNickname && other?.displayName && <p>{other.displayName}</p>}
            <p>{[other?.department, other?.batch ? `Batch ${other.batch}` : null].filter(Boolean).join(" · ") || "Verified IUT member"}</p>
            {muted && <span className={styles.mutedPill}><BellOff size={13} />{mutedLabel(conversation.settings?.mutedUntil)}</span>}
          </div>

          <div className={styles.quick}>
            {other && <Link href={`/profile/${other.id}`} className={styles.quickAction}><span><UserRound size={19} /></span>Profile</Link>}
            <button type="button" className={styles.quickAction} onClick={() => (muted ? mute("off") : setMuteOpen((open) => !open))} disabled={busy} aria-expanded={muteOpen}>
              <span>{muted ? <Bell size={19} /> : <BellOff size={19} />}</span>{muted ? "Unmute" : "Mute"}
            </button>
            <button type="button" className={styles.quickAction} onClick={() => setView("search")}><span><Search size={19} /></span>Search</button>
          </div>
          {muteOpen && (
            <div className={styles.muteMenu} role="menu" aria-label="Mute for">
              <p>Mute messages from {name}? Their messages won’t count in your unread badge.</p>
              {MUTE_OPTIONS.map((option) => <button key={option.value} type="button" role="menuitem" onClick={() => mute(option.value)}>{option.label}</button>)}
            </div>
          )}

          <p className={styles.infoLabel}>Customize chat</p>
          <button type="button" className={styles.infoRow} onClick={() => setView("nicknames")}><PenLine size={18} /><span>Edit nicknames</span><ChevronRight size={17} /></button>

          <p className={styles.infoLabel}>Media, files and links</p>
          <button type="button" className={styles.infoRow} onClick={() => { setTab("media"); setView("media"); }}><Images size={18} /><span>Media</span><ChevronRight size={17} /></button>
          <button type="button" className={styles.infoRow} onClick={() => { setTab("files"); setView("media"); }}><FileText size={18} /><span>Files</span><ChevronRight size={17} /></button>
          <button type="button" className={styles.infoRow} onClick={() => { setTab("links"); setView("media"); }}><Link2 size={18} /><span>Links</span><ChevronRight size={17} /></button>

          <p className={styles.infoLabel}>Privacy &amp; support</p>
          <button type="button" className={styles.infoRow} disabled={busy} onClick={() => (muted ? mute("off") : setMuteOpen(true))}>{muted ? <Bell size={18} /> : <BellOff size={18} />}<span>{muted ? "Unmute notifications" : "Mute notifications"}</span></button>
          <button
            type="button"
            className={styles.infoRow}
            disabled={busy}
            onClick={async () => {
              if (await act(() => updateChatSettings(conversation.id, { markedUnread: true }), "Marked as unread.")) onLeave();
            }}
          >
            <MailWarning size={18} /><span>Mark as unread</span>
          </button>
          {other && (
            <button type="button" className={styles.infoRow} disabled={busy} onClick={() => (blockedByMe ? void act(() => setBlocked(other.id, false), `${name} unblocked.`) : setConfirm("block"))}>
              <Ban size={18} /><span>{blockedByMe ? `Unblock ${name}` : "Block"}</span>
            </button>
          )}
          <button type="button" className={`${styles.infoRow} ${styles.infoDanger}`} disabled={busy} onClick={() => setConfirm("delete")}><Trash2 size={18} /><span>Delete chat</span></button>
        </div>
      )}

      {view === "nicknames" && <Nicknames conversation={conversation} userId={userId} onSaved={refresh} />}
      {view === "media" && <MediaView conversationId={conversation.id} tab={tab} onTab={setTab} onOpenMedia={onOpenMedia} />}
      {view === "search" && <SearchView conversation={conversation} userId={userId} onPick={(id) => { onJumpTo(id); onClose(); }} />}

      <Dialog title={confirm === "block" ? `Block ${name}?` : "Delete this chat?"} open={confirm !== null} onClose={() => setConfirm(null)}>
        <p>
          {confirm === "block"
            ? `${name} won’t be able to message you, and you won’t be able to message them until you unblock them. They won’t be told.`
            : "This deletes your copy of the conversation. The other person still has theirs. If someone writes again, the chat comes back with only the new messages."}
        </p>
        <DialogActions>
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              const kind = confirm;
              setConfirm(null);
              if (kind === "block" && other) await act(() => setBlocked(other.id, true), `${name} blocked.`);
              if (kind === "delete" && (await act(() => clearChat(conversation.id), "Chat deleted."))) onLeave();
            }}
          >
            {confirm === "block" ? "Block" : "Delete chat"}
          </Button>
        </DialogActions>
      </Dialog>
    </aside>
  );
}

function Nicknames({ conversation, userId, onSaved }: { conversation: Conversation; userId?: string; onSaved(): Promise<unknown> }) {
  const { notify } = useToast();
  const people = conversation.participants || [];
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(people.map((person) => [person.userId, person.nickname || ""])));
  const save = async (personId: string, value: string | null) => {
    try {
      await updateChatSettings(conversation.id, { nickname: { userId: personId, value } });
      await onSaved();
      notify(value ? "Nickname set." : "Nickname removed.");
      if (!value) setDrafts((current) => ({ ...current, [personId]: "" }));
    } catch (failure) {
      notify(failure instanceof Error ? failure.message : "Nickname not saved.");
    }
  };
  return (
    <div className={styles.infoBody}>
      <p className={styles.infoNote}>Nicknames are seen by everyone in this chat.</p>
      {people.map((person) => {
        const label = person.userId === userId ? "You" : person.user?.displayName || "Member";
        return (
          <form key={person.userId} className={styles.nickname} onSubmit={(event) => { event.preventDefault(); void save(person.userId, drafts[person.userId]?.trim() || null); }}>
            <Avatar size={38} name={person.user?.displayName} src={mediaUrl(person.user?.profilePictureUrl)} />
            <label>
              <span>{label}</span>
              <Input value={drafts[person.userId] ?? ""} maxLength={40} placeholder="Set nickname" aria-label={`Nickname for ${label}`} onChange={(event) => setDrafts((current) => ({ ...current, [person.userId]: event.target.value }))} />
            </label>
            <Button type="submit" variant="secondary">Save</Button>
            {person.nickname && <Button variant="ghost" onClick={() => void save(person.userId, null)}>Remove</Button>}
          </form>
        );
      })}
    </div>
  );
}

function MediaView({ conversationId, tab, onTab, onOpenMedia }: { conversationId: number; tab: MediaTab; onTab(tab: MediaTab): void; onOpenMedia: PanelProps["onOpenMedia"] }) {
  const items = useInfiniteQuery({
    queryKey: ["chat-media", conversationId, tab],
    queryFn: ({ pageParam, signal }) => chatMedia(conversationId, tab, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.data.length === 30 ? pages.length + 1 : undefined),
  });
  const messages = items.data?.pages.flatMap((page) => page.data) ?? [];
  const empty = { media: "No photos or videos yet.", files: "No files yet.", links: "No links yet." }[tab];
  return (
    <div className={styles.infoBody}>
      <div className={styles.pickerTabs} role="tablist">
        {(["media", "files", "links"] as const).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} aria-pressed={tab === value} onClick={() => onTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>
        ))}
      </div>
      {items.isLoading && <p className={styles.pickerNote}>Loading…</p>}
      {items.isSuccess && !messages.length && <p className={styles.pickerNote}>{empty}</p>}
      {tab === "media" && (
        <div className={styles.mediaGrid}>
          {messages.map((message) => {
            const url = message.kind === "gif" ? message.gif?.url : message.attachment?.url;
            if (!url) return null;
            const video = message.kind === "video";
            return (
              <button key={message.id} type="button" aria-label={video ? "Open video" : "Open photo"} onClick={() => onOpenMedia({ kind: video ? "video" : "image", url })}>
                {video ? <><video src={`${url}#t=0.1`} preload="metadata" muted playsInline /><span className={styles.mediaPlay}><Play size={18} /></span></> : <img src={url} alt="" loading="lazy" />}
              </button>
            );
          })}
        </div>
      )}
      {tab === "files" && messages.map((message) => (
        <a key={message.id} className={styles.infoRow} href={message.attachment?.url || undefined} target="_blank" rel="noreferrer">
          <FileText size={18} /><span>{message.attachment?.name || "File"}<small>{[formatBytes(message.attachment?.size), new Date(message.sentAt).toLocaleDateString()].filter(Boolean).join(" · ")}</small></span>
        </a>
      ))}
      {tab === "links" && messages.flatMap((message) => (message.content.match(URL_PATTERN) || []).map((url, index) => (
        <a key={`${message.id}-${index}`} className={styles.infoRow} href={url} target="_blank" rel="noreferrer noopener">
          <Link2 size={18} /><span>{url.replace(/^https?:\/\//, "")}<small>{new Date(message.sentAt).toLocaleDateString()}</small></span>
        </a>
      )))}
      {items.hasNextPage && <div className={styles.loadEarlier}><button type="button" className={styles.reaction} onClick={() => void items.fetchNextPage()}>Load more</button></div>}
    </div>
  );
}

function SearchView({ conversation, userId, onPick }: { conversation: Conversation; userId?: string; onPick(messageId: number): void }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const results = useQuery({ queryKey: ["chat-search", conversation.id, query], queryFn: ({ signal }) => searchChat(conversation.id, query, signal), enabled: query.length >= 2 });
  const names = new Map((conversation.participants || []).map((person) => [person.userId, person.userId === userId ? "You" : person.nickname || person.user?.displayName || "Member"]));
  return (
    <div className={styles.infoBody}>
      <div className={styles.pickerSearch}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search in conversation" aria-label="Search in conversation" autoFocus /></div>
      {query.length >= 2 && results.isSuccess && !results.data.data.length && <p className={styles.pickerNote}>No messages match “{query}”.</p>}
      {results.data?.data.map((message: Message) => (
        <button key={message.id} type="button" className={styles.searchHit} onClick={() => onPick(message.id)}>
          <strong>{names.get(message.senderId) || "Member"}</strong>
          <span><Highlight text={messagePreview(message)} query={query} /></span>
          <small>{new Date(message.sentAt).toLocaleDateString()} {timeLabel(message.sentAt)}</small>
        </button>
      ))}
    </div>
  );
}

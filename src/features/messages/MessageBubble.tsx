"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, CheckCheck, Clock3, FileText, Pause, Pencil, Play, Plus, SmilePlus } from "lucide-react";
import { Avatar } from "@/components/ui/Ui";
import { mediaUrl } from "@/lib/api";
import type { Message } from "@/lib/types";
import { deliveryStatus, formatBytes, formatDuration, groupReactions, timeLabel } from "./chatModel";
import { QUICK_REACTIONS } from "./emojiData";
import { EmojiPicker, useDismiss } from "./Pickers";
import styles from "./Chat.module.css";

export interface BubbleProps {
  message: Message;
  own: boolean;
  /** Same sender as the message above: tighter spacing. */
  grouped: boolean;
  /** Stable signed link for the attachment (see ChatPane). */
  mediaSrc?: string | null;
  /** Shown while a message is being sent or after it failed. */
  pending?: "sending" | "failed";
  /** Briefly outlined after jumping to it from search. */
  highlighted?: boolean;
  canEdit?: boolean;
  names?: Map<string, string>;
  userId?: string;
  onReact?(emoji: string): void;
  onEdit?(): void;
  onRetry?(): void;
  onOpenMedia?(media: { kind: "image" | "video"; url: string }): void;
}

const statusLabel = { sent: "Sent", delivered: "Delivered", read: "Read" } as const;

function Ticks({ message, pending, onRetry }: { message: Message; pending?: BubbleProps["pending"]; onRetry?(): void }) {
  if (pending === "sending") return <span className={styles.tick} title="Sending"><Clock3 size={13} aria-label="Sending" /></span>;
  if (pending === "failed") return <button type="button" className={styles.failed} onClick={onRetry}><AlertCircle size={13} />Not sent. Retry</button>;
  const status = deliveryStatus(message);
  const when = status === "read" ? message.readAt : status === "delivered" ? message.deliveredAt : message.sentAt;
  const title = `${statusLabel[status]}${when ? ` ${new Date(when).toLocaleString()}` : ""}`;
  return (
    <span className={`${styles.tick} ${status === "read" ? styles.tickRead : ""}`} title={title}>
      {status === "sent" ? <Check size={14} aria-label={title} /> : <CheckCheck size={14} aria-label={title} />}
    </span>
  );
}

/** Play/pause, a seekable waveform and the time, like WhatsApp's voice notes. */
export function VoicePlayer({ src, durationMs, waveform }: { src?: string | null; durationMs?: number | null; waveform?: number[] | null }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const total = durationMs || 0;
  const bars = waveform?.length ? waveform : Array.from({ length: 40 }, () => 30);
  const progress = total ? Math.min(1, position / total) : 0;
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    const tick = () => setPosition(element.currentTime * 1000);
    const end = () => { setPlaying(false); setPosition(0); };
    const paused = () => setPlaying(false);
    const started = () => setPlaying(true);
    element.addEventListener("timeupdate", tick);
    element.addEventListener("ended", end);
    element.addEventListener("pause", paused);
    element.addEventListener("play", started);
    return () => {
      element.removeEventListener("timeupdate", tick);
      element.removeEventListener("ended", end);
      element.removeEventListener("pause", paused);
      element.removeEventListener("play", started);
    };
  }, []);
  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) {
      // Only one voice message plays at a time.
      document.querySelectorAll("audio").forEach((other) => { if (other !== element) other.pause(); });
      void element.play();
    } else element.pause();
  };
  const seek = (fraction: number) => {
    const element = audio.current;
    if (!element || !total) return;
    element.currentTime = (fraction * total) / 1000;
    setPosition(fraction * total);
  };
  return (
    <div className={styles.voice}>
      <audio ref={audio} src={src || undefined} preload="metadata" />
      <button type="button" className={styles.voicePlay} onClick={toggle} disabled={!src} aria-label={playing ? "Pause voice message" : "Play voice message"}>
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      <button
        type="button"
        className={styles.wave}
        aria-label="Seek"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          seek(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
        }}
      >
        {bars.map((bar, index) => <span key={index} className={index / bars.length < progress ? styles.played : ""} style={{ height: `${Math.max(10, bar)}%` }} />)}
      </button>
      <span className={styles.voiceTime}>{formatDuration(playing || position ? position : total)}</span>
    </div>
  );
}

function SharedPost({ message }: { message: Message }) {
  const post = message.sharedPost;
  if (!post?.available || !post.id) return <div className={styles.postGone}>This post is no longer available.</div>;
  const author = post.isAnonymous ? "Anonymous" : post.author?.displayName || "IUT member";
  return (
    <Link className={styles.post} href={`/posts/${post.id}`}>
      <span className={styles.postAuthor}><Avatar size={24} name={author} src={post.isAnonymous ? undefined : mediaUrl(post.author?.profilePictureUrl)} />{author}</span>
      {post.content && <span className={styles.postText}>{post.content}</span>}
      {post.imageUrl && <img src={mediaUrl(post.imageUrl)} alt="" loading="lazy" />}
      <span className={styles.postLink}>View post</span>
    </Link>
  );
}

function Body({ message, mediaSrc, onOpenMedia }: Pick<BubbleProps, "message" | "mediaSrc" | "onOpenMedia">) {
  const kind = message.kind || "text";
  const attachment = message.attachment;
  const ratio = attachment?.width && attachment?.height ? `${attachment.width} / ${attachment.height}` : undefined;
  switch (kind) {
    case "image":
      return (
        <button type="button" className={`${styles.media} ${styles.mediaButton}`} style={{ aspectRatio: ratio }} onClick={() => mediaSrc && onOpenMedia?.({ kind: "image", url: mediaSrc })} aria-label="Open photo">
          {mediaSrc && <img src={mediaSrc} alt={attachment?.name || "Photo"} loading="lazy" />}
        </button>
      );
    case "video":
      return (
        <span className={styles.media} style={{ aspectRatio: ratio || "16 / 9" }}>
          {/* #t=0.1 makes browsers paint the first frame instead of black. */}
          {mediaSrc && <video src={`${mediaSrc}#t=0.1`} controls playsInline preload="metadata" />}
        </span>
      );
    case "gif":
      return message.gif ? (
        <span className={`${styles.media} ${styles.gif}`} style={{ aspectRatio: `${message.gif.width} / ${message.gif.height}` }}>
          <img src={message.gif.url} alt="GIF" loading="lazy" />
          <span className={styles.gifBadge}>GIF</span>
        </span>
      ) : null;
    case "audio":
      return <VoicePlayer src={mediaSrc} durationMs={attachment?.durationMs} waveform={attachment?.waveform} />;
    case "file":
      return (
        <a className={styles.file} href={mediaSrc || undefined} target="_blank" rel="noreferrer">
          <FileText size={26} />
          <span><strong>{attachment?.name || message.attachmentName || "File"}</strong><small>{formatBytes(attachment?.size) || "Open file"}</small></span>
        </a>
      );
    case "post":
      return <SharedPost message={message} />;
    default:
      return null;
  }
}

function MessageBubbleView({ message, own, grouped, mediaSrc, pending, highlighted, canEdit, names, userId, onReact, onEdit, onRetry, onOpenMedia }: BubbleProps) {
  const [menu, setMenu] = useState<"closed" | "bar" | "picker">("closed");
  const bar = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useDismiss(bar, menu === "bar", () => setMenu("closed"), toggle);
  const kind = message.kind || "text";
  const isMedia = ["image", "video", "gif"].includes(kind);
  const reactions = groupReactions(message.reactions, userId);
  const mine = message.reactions?.find((reaction) => reaction.userId === userId)?.emoji;
  const react = (emoji: string) => {
    setMenu("closed");
    onReact?.(emoji);
  };
  const who = (ids: string[]) => ids.map((id) => (id === userId ? "You" : names?.get(id) || "Member")).join(", ");

  return (
    <div id={`message-${message.id}`} className={`${styles.row} ${own ? styles.rowOwn : ""} ${grouped ? styles.rowGrouped : ""} ${highlighted ? styles.rowHighlight : ""}`}>
      <div className={styles.stack}>
        <div className={`${styles.bubble} ${isMedia ? styles.bubbleMedia : ""} ${pending ? styles.bubblePending : ""}`}>
          <Body message={message} mediaSrc={mediaSrc} onOpenMedia={onOpenMedia} />
          {message.content && <div className={`${styles.text} ${kind !== "text" ? styles.caption : ""}`}>{message.content}</div>}
          <div className={styles.meta}>
            {message.editedAt && <span className={styles.edited} title={`Edited ${new Date(message.editedAt).toLocaleString()}`}>edited</span>}
            <time dateTime={message.sentAt}>{timeLabel(message.sentAt)}</time>
            {own && <Ticks message={message} pending={pending} onRetry={onRetry} />}
          </div>
        </div>
        {reactions.length > 0 && (
          <div className={styles.reactions}>
            {reactions.map((group) => (
              <button key={group.emoji} type="button" className={`${styles.reaction} ${group.mine ? styles.reactionMine : ""}`} onClick={() => react(group.emoji)} title={who(group.userIds)} aria-label={`${group.emoji} ${group.count}, ${who(group.userIds)}`}>
                {group.emoji}{group.count > 1 && <small>{group.count}</small>}
              </button>
            ))}
          </div>
        )}
      </div>
      {!pending && (onReact || canEdit) && (
        <div className={`${styles.actions} ${menu !== "closed" ? styles.actionsOpen : ""}`}>
          {onReact && <button ref={toggle} type="button" className={styles.actionButton} aria-label="React" aria-expanded={menu !== "closed"} onClick={() => setMenu(menu === "closed" ? "bar" : "closed")}><SmilePlus size={17} /></button>}
          {canEdit && <button type="button" className={styles.actionButton} aria-label="Edit message" onClick={onEdit}><Pencil size={15} /></button>}
          {menu === "bar" && (
            <div ref={bar} className={styles.reactBar} role="menu" aria-label="Reactions">
              {QUICK_REACTIONS.map((emoji) => <button key={emoji} type="button" role="menuitem" className={mine === emoji ? styles.reactChosen : ""} aria-label={`React ${emoji}`} onClick={() => react(emoji)}>{emoji}</button>)}
              <button type="button" role="menuitem" className={styles.reactMore} aria-label="More reactions" onClick={() => setMenu("picker")}><Plus size={18} /></button>
            </div>
          )}
          {menu === "picker" && <EmojiPicker className={styles.pickerFloating} onPick={react} onClose={() => setMenu("closed")} toggle={toggle} />}
        </div>
      )}
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleView);

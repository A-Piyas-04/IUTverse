"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, FileText, Mic, Paperclip, Pencil, Send, Smile, Trash2, Video, X } from "lucide-react";
import type { Message } from "@/lib/types";
import { measureMedia, type MediaDraft, type OutgoingChatMessage } from "./chatApi";
import { CHAT_FILE_ACCEPT, classifyChatFile, formatBytes, formatDuration } from "./chatModel";
import { EmojiPicker, GifPicker } from "./Pickers";
import { useVoiceRecorder } from "./useVoiceRecorder";
import styles from "./Chat.module.css";

interface ComposerProps {
  recipientName: string;
  editing: Message | null;
  onCancelEdit(): void;
  onEdit(content: string): Promise<void>;
  /** Sending happens in the chat, so the composer clears at once. */
  onSend(message: OutgoingChatMessage): void;
}

const RECORDER_ERRORS = {
  unsupported: "This browser can’t record voice messages.",
  denied: "Allow microphone access to record a voice message.",
} as const;

export function Composer({ recipientName, editing, onCancelEdit, onEdit, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<MediaDraft | null>(null);
  const [panel, setPanel] = useState<"none" | "emoji" | "gif">("none");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const emojiToggle = useRef<HTMLButtonElement>(null);
  const gifToggle = useRef<HTMLButtonElement>(null);
  const recorder = useVoiceRecorder();

  useEffect(() => {
    if (!editing) return;
    setText(editing.content);
    setPanel("none");
    textarea.current?.focus();
  }, [editing]);

  // Grow with the text, up to about five lines.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
  }, [text]);

  const removeDraft = () => {
    if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const pickFile = async (file?: File | null) => {
    if (!file) return;
    const checked = classifyChatFile(file);
    if (checked.error !== undefined) {
      setError(checked.error);
      return;
    }
    setError("");
    const kind = checked.kind;
    const measured = kind === "file" ? {} : await measureMedia(file, kind);
    if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft({ file, kind, previewUrl: kind === "file" ? undefined : URL.createObjectURL(file), ...measured });
    textarea.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    const element = textarea.current;
    const start = element?.selectionStart ?? text.length;
    const end = element?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const cancelEdit = () => {
    setText("");
    setError("");
    onCancelEdit();
  };

  const submit = async () => {
    if (editing) {
      const value = text.trim();
      if (!value && (editing.kind || "text") === "text") return;
      setSaving(true);
      try {
        await onEdit(value);
        setText("");
        setError("");
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "The message could not be edited.");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!text.trim() && !draft) return;
    // The draft's preview URL now belongs to the pending message in the chat.
    onSend({ content: text, media: draft });
    setText("");
    setDraft(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const startRecording = async () => {
    setPanel("none");
    setError("");
    await recorder.start();
  };

  const sendRecording = async () => {
    const voice = await recorder.stop();
    if (voice) onSend({ media: voice });
  };

  const hasContent = Boolean(text.trim() || draft);
  const recorderError = recorder.state === "unsupported" || recorder.state === "denied" ? RECORDER_ERRORS[recorder.state] : "";

  return (
    <div
      className={styles.composer}
      onDragOver={(event) => { if (!editing && event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDrop={(event) => {
        if (editing || !event.dataTransfer.files.length) return;
        event.preventDefault();
        void pickFile(event.dataTransfer.files[0]);
      }}
    >
      {editing && (
        <div className={styles.banner}>
          <Pencil size={16} />
          <div><strong>Editing message</strong><span>{editing.content}</span></div>
          <button type="button" className={styles.tool} aria-label="Cancel editing" onClick={cancelEdit}><X size={18} /></button>
        </div>
      )}
      {draft && !editing && (
        <div className={styles.draft}>
          {draft.kind === "image" && draft.previewUrl && <img src={draft.previewUrl} alt="" />}
          {draft.kind === "video" && draft.previewUrl && <video src={draft.previewUrl} muted playsInline />}
          {draft.kind === "file" && <span className={styles.draftIcon}><FileText size={26} /></span>}
          <div>
            <strong>{draft.file.name}</strong>
            <small>
              {draft.kind === "video" ? <><Video size={12} /> Video</> : draft.kind === "image" ? "Photo" : "PDF"} · {formatBytes(draft.file.size)}
              {draft.durationMs ? ` · ${formatDuration(draft.durationMs)}` : ""}
            </small>
          </div>
          <button type="button" className={styles.tool} aria-label="Remove attachment" onClick={removeDraft}><X size={18} /></button>
        </div>
      )}
      {panel === "emoji" && <EmojiPicker onPick={insertEmoji} onClose={() => setPanel("none")} toggle={emojiToggle} />}
      {panel === "gif" && (
        <GifPicker
          toggle={gifToggle}
          onClose={() => setPanel("none")}
          onPick={(gif) => {
            setPanel("none");
            onSend({ gif: gif.full });
          }}
        />
      )}

      <div className={styles.inputRow}>
        {recorder.state === "recording" ? (
          <>
            <button type="button" className={styles.tool} aria-label="Cancel recording" onClick={recorder.cancel}><Trash2 size={19} /></button>
            <div className={styles.recording} role="status" aria-label="Recording a voice message">
              <span className={styles.recDot} />
              <span className={styles.recTime}>{formatDuration(recorder.elapsedMs)}</span>
              <span className={styles.recLevel}><span style={{ width: `${Math.round(recorder.level * 100)}%` }} /></span>
            </div>
            <button type="button" className={styles.send} aria-label="Send voice message" onClick={() => void sendRecording()}><Send size={19} /></button>
          </>
        ) : (
          <>
            <div className={styles.tools}>
              <button ref={emojiToggle} type="button" className={`${styles.tool} ${panel === "emoji" ? styles.toolActive : ""}`} aria-label="Emoji" aria-expanded={panel === "emoji"} onClick={() => setPanel(panel === "emoji" ? "none" : "emoji")}><Smile size={20} /></button>
              {!editing && (
                <>
                  <button type="button" className={styles.tool} aria-label="Attach photo, video or file" onClick={() => fileInput.current?.click()}><Paperclip size={19} /></button>
                  <button ref={gifToggle} type="button" className={`${styles.tool} ${styles.gifTool} ${panel === "gif" ? styles.toolActive : ""}`} aria-label="GIF" aria-expanded={panel === "gif"} onClick={() => setPanel(panel === "gif" ? "none" : "gif")}>GIF</button>
                  <input ref={fileInput} className="sr-only" type="file" accept={CHAT_FILE_ACCEPT} tabIndex={-1} aria-hidden="true" onChange={(event) => void pickFile(event.target.files?.[0])} />
                </>
              )}
            </div>
            <div className={styles.field}>
              <textarea
                ref={textarea}
                className={styles.textarea}
                rows={1}
                value={text}
                maxLength={4000}
                aria-label={editing ? "Edit message" : `Message ${recipientName}`}
                placeholder={editing ? "Edit message" : draft ? "Add a caption…" : `Message ${recipientName}…`}
                onChange={(event) => setText(event.target.value)}
                onPaste={(event) => {
                  const file = [...event.clipboardData.files][0];
                  if (file && !editing) {
                    event.preventDefault();
                    void pickFile(file);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void submit();
                  } else if (event.key === "Escape" && editing) {
                    cancelEdit();
                  }
                }}
              />
            </div>
            {editing ? (
              <button type="button" className={styles.send} aria-label="Save edit" disabled={saving || (!text.trim() && (editing.kind || "text") === "text")} onClick={() => void submit()}><Check size={20} /></button>
            ) : hasContent ? (
              <button type="button" className={styles.send} aria-label="Send message" onClick={() => void submit()}><Send size={19} /></button>
            ) : (
              <button type="button" className={styles.send} aria-label="Record voice message" onClick={() => void startRecording()}><Mic size={20} /></button>
            )}
          </>
        )}
      </div>
      <p className={styles.status} role="status" aria-live="polite">{error || recorderError}</p>
    </div>
  );
}

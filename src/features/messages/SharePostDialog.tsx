"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Send } from "lucide-react";
import { Avatar, Button, Dialog, DialogActions, Input, useToast } from "@/components/ui/Ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiPage, mediaUrl } from "@/lib/api";
import { conversationName } from "@/lib/format";
import type { Conversation, Profile } from "@/lib/types";
import { sharePostToChats } from "./chatApi";
import styles from "./Chat.module.css";

const MAX_RECIPIENTS = 15;

interface Recipient {
  key: string;
  name: string;
  detail?: string;
  picture?: string;
  conversationId?: number;
  userId?: string;
}

/** Send a post to chats: recent conversations first, anyone else by search. */
export function SharePostDialog({ postId, open, onClose }: { postId: number; open: boolean; onClose(): void }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [chosen, setChosen] = useState<Map<string, Recipient>>(new Map());

  const conversations = useQuery({ queryKey: ["conversations"], queryFn: ({ signal }) => apiPage<Conversation>("/chat/conversations", signal), enabled: open, staleTime: 30_000 });
  const people = useQuery({
    queryKey: ["user-search", search],
    queryFn: ({ signal }) => apiPage<Profile>(`/users/search?q=${encodeURIComponent(search)}`, signal),
    enabled: open && search.trim().length >= 2,
  });

  const recipients = useMemo<Recipient[]>(() => {
    if (search.trim().length >= 2) {
      return (people.data?.data || [])
        .filter((profile) => profile.id !== user?.id)
        .map((profile) => ({ key: `user:${profile.id}`, userId: profile.id, name: profile.displayName, detail: [profile.department, profile.batch].filter(Boolean).join(" "), picture: mediaUrl(profile.profilePictureUrl) }));
    }
    return (conversations.data?.data || []).map((conversation) => ({
      key: conversation.otherUser ? `user:${conversation.otherUser.id}` : `conversation:${conversation.id}`,
      conversationId: conversation.id,
      name: conversationName(conversation),
      detail: conversation.otherUser?.department || undefined,
      picture: mediaUrl(conversation.otherUser?.profilePictureUrl),
    }));
  }, [conversations.data, people.data, search, user?.id]);

  const close = () => {
    setSearch("");
    setNote("");
    setChosen(new Map());
    onClose();
  };

  const toggle = (recipient: Recipient) =>
    setChosen((current) => {
      const next = new Map(current);
      if (next.has(recipient.key)) next.delete(recipient.key);
      else if (next.size < MAX_RECIPIENTS) next.set(recipient.key, recipient);
      return next;
    });

  const send = useMutation({
    mutationFn: () => {
      const list = [...chosen.values()];
      return sharePostToChats(postId, {
        conversationIds: list.filter((item) => item.conversationId).map((item) => item.conversationId!),
        userIds: list.filter((item) => !item.conversationId && item.userId).map((item) => item.userId!),
        message: note.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      notify(result.data.sent === 1 ? "Sent." : `Sent to ${result.data.sent} chats.`);
      void cache.invalidateQueries({ queryKey: ["conversations"] });
      void cache.invalidateQueries({ queryKey: ["messages"] });
      close();
    },
    onError: (error) => notify(error instanceof Error ? error.message : "The post could not be sent."),
  });

  const copyLink = () => {
    void navigator.clipboard.writeText(`${location.origin}/posts/${postId}`).then(() => notify("Link copied."));
  };

  return (
    <Dialog title="Send post" open={open} onClose={close}>
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search IUT members" aria-label="Search members" />
      <div className={styles.shareList} role="group" aria-label="Recipients">
        {!recipients.length && <p className={styles.pickerNote}>{search.trim().length >= 2 ? "No members found." : "No recent chats yet. Search for a member."}</p>}
        {recipients.map((recipient) => (
          <label key={recipient.key} className={styles.shareItem}>
            <Avatar size={38} name={recipient.name} src={recipient.picture} />
            <span><strong>{recipient.name}</strong>{recipient.detail && <small>{recipient.detail}</small>}</span>
            <input type="checkbox" checked={chosen.has(recipient.key)} onChange={() => toggle(recipient)} aria-label={`Send to ${recipient.name}`} />
          </label>
        ))}
      </div>
      <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a message (optional)" aria-label="Message" maxLength={1000} />
      <DialogActions>
        <Button variant="ghost" onClick={copyLink}><Link2 size={17} />Copy link</Button>
        <Button onClick={() => send.mutate()} disabled={!chosen.size || send.isPending}>
          <Send size={16} />{send.isPending ? "Sending…" : chosen.size > 1 ? `Send to ${chosen.size}` : "Send"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

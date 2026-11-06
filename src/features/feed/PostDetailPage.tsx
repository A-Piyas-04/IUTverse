"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { apiRequest, jsonBody, mediaUrl } from "@/lib/api";
import type { Comment, Post } from "@/lib/types";
import { Avatar, Button, Card, EmptyState, Textarea } from "@/components/ui/Ui";
import { PageFrame } from "@/components/shell/AppShell";
import { PostCard } from "./FeedPage";
import { dateLabel } from "@/lib/format";
import styles from "@/styles/pages.module.css";

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>(); const query = useQuery({ queryKey: ["post", postId], queryFn: ({ signal }) => apiRequest<Post>(`/posts/${postId}`, {}, signal), enabled: Boolean(postId) });
  if (query.isLoading) return <PageFrame title="Post"><div className={styles.stack}><Card padded>Loading discussion…</Card></div></PageFrame>;
  if (query.isError || !query.data?.data) return <PageFrame title="Post"><EmptyState title="This post is no longer available" body="It may have been removed or you may not have access." /></PageFrame>;
  const post = query.data.data;
  return <PageFrame title="Post" eyebrow="Discussion"><div className={styles.stack}><PostCard post={post} detailed /><ReplyComposer postId={post.id} />{post.comments?.length ? post.comments.map(comment => <CommentCard key={comment.id} comment={comment} postId={post.id} />) : <EmptyState title="No replies yet" body="Be the first to continue the discussion." />}</div></PageFrame>;
}

function ReplyComposer({ postId, parentCommentId, onDone }: { postId: number; parentCommentId?: number; onDone?: () => void }) {
  const [content, setContent] = useState(""); const cache = useQueryClient(); const mutation = useMutation({ mutationFn: () => apiRequest(`/posts/${postId}/comments`, { method: "POST", ...jsonBody({ content, parentCommentId }) }), onSuccess: () => { setContent(""); void cache.invalidateQueries({ queryKey: ["post", String(postId)] }); void cache.invalidateQueries({ queryKey: ["posts"] }); void cache.invalidateQueries({ queryKey: ["profile-posts"] }); onDone?.(); } });
  return <Card padded><label><span style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Post your reply</span><Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write a thoughtful reply…" /></label><div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><Button disabled={!content.trim() || mutation.isPending} onClick={() => mutation.mutate()}><Send size={17} />Reply</Button></div></Card>;
}

function CommentCard({ comment, postId, nested = false }: { comment: Comment; postId: number; nested?: boolean }) {
  const [replying, setReplying] = useState(false);
  const person = comment.author || comment.user;
  const name = comment.isAnonymous ? "Anonymous" : person?.displayName || "IUT member";
  return <Card padded>
    <div className={styles.author}><Avatar name={name} src={comment.isAnonymous ? undefined : mediaUrl(person?.profilePictureUrl)} size={38} /><div className={styles.authorMeta}><strong>{name}</strong><span>{dateLabel(comment.createdAt)}</span></div></div>
    <p className={styles.postText}>{comment.content}</p>
    {!nested && <Button variant="ghost" aria-expanded={replying} onClick={() => setReplying(value => !value)}>Reply</Button>}
    {comment.replies?.map(reply => <div key={reply.id} style={{ marginLeft: 26, borderLeft: "2px solid var(--border)", paddingLeft: 14 }}><CommentCard comment={reply} postId={postId} nested /></div>)}
    {replying && <ReplyComposer postId={postId} parentCommentId={comment.id} onDone={() => setReplying(false)} />}
  </Card>;
}

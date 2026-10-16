import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { apiRequest, jsonBody } from "@/lib/api";
import type { Comment, Post } from "@/lib/types";
import { Avatar, Button, Card, EmptyState, Textarea } from "@/components/ui/Ui";
import { PageFrame } from "@/components/shell/AppShell";
import { PostCard } from "./FeedPage";
import { dateLabel } from "./pageUtils";
import styles from "./Pages.module.css";

export function PostDetailPage() {
  const { postId } = useParams(); const query = useQuery({ queryKey: ["post", postId], queryFn: ({ signal }) => apiRequest<Post>(`/posts/${postId}`, {}, signal), enabled: Boolean(postId) });
  if (query.isLoading) return <PageFrame title="Post"><div className={styles.stack}><Card padded>Loading discussion…</Card></div></PageFrame>;
  if (query.isError || !query.data?.data) return <PageFrame title="Post"><EmptyState title="This post is no longer available" body="It may have been removed or you may not have access." /></PageFrame>;
  const post = query.data.data;
  return <PageFrame title="Post" eyebrow="Discussion"><div className={styles.stack}><PostCard post={post} detailed /><ReplyComposer postId={post.id} />{post.comments?.length ? post.comments.map(comment => <CommentCard key={comment.id} comment={comment} />) : <EmptyState title="No replies yet" body="Be the first to continue the discussion." />}</div></PageFrame>;
}

function ReplyComposer({ postId, parentCommentId }: { postId: number; parentCommentId?: number }) {
  const [content, setContent] = useState(""); const cache = useQueryClient(); const mutation = useMutation({ mutationFn: () => apiRequest(`/posts/${postId}/comments`, { method: "POST", ...jsonBody({ content, parentCommentId }) }), onSuccess: () => { setContent(""); void cache.invalidateQueries({ queryKey: ["post", String(postId)] }); } });
  return <Card padded><label><span style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Post your reply</span><Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write a thoughtful reply…" /></label><div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><Button disabled={!content.trim() || mutation.isPending} onClick={() => mutation.mutate()}><Send size={17} />Reply</Button></div></Card>;
}

function CommentCard({ comment }: { comment: Comment }) { return <Card padded><div className={styles.author}><Avatar name={comment.author?.displayName} size={38} /><div className={styles.authorMeta}><strong>{comment.author?.displayName || "IUT member"}</strong><span>{dateLabel(comment.createdAt)}</span></div></div><p className={styles.postText}>{comment.content}</p>{comment.replies?.map(reply => <div key={reply.id} style={{ marginLeft: 26, borderLeft: "2px solid var(--border)", paddingLeft: 14 }}><CommentCard comment={reply} /></div>)}</Card>; }

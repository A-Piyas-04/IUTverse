import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Image, MessageCircle, MoreHorizontal, Send, Trash2, X } from "lucide-react";
import { apiPage, apiRequest, jsonBody, mediaUrl } from "@/lib/api";
import type { Post, PostReaction, ReactionType } from "@/lib/types";
import { Avatar, Button, Card, Chip, Dialog, DialogActions, EmptyState, Textarea, useToast } from "@/components/ui/Ui";
import { PageFrame } from "@/components/shell/AppShell";
import { EntityActions } from "@/features/shared/EntityActions";
import { useAuth } from "@/features/auth/AuthProvider";
import { dateLabel, queryString } from "./pageUtils";
import styles from "./Pages.module.css";

const homeTabs = ["For you", "Department", "Batch", "Resources"];
const communityTabs = ["All", "Department", "Batch", "Questions", "Resources", "Media"];
const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
const POST_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const POST_REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "funny", emoji: "😂", label: "Funny" },
  { type: "relatable", emoji: "🤝", label: "Relatable" },
  { type: "angry", emoji: "😠", label: "Angry" },
  { type: "insightful", emoji: "✨", label: "Insightful" },
  { type: "helpful", emoji: "💡", label: "Helpful" },
  { type: "wholesome", emoji: "💚", label: "Wholesome" },
];

const emptySummary = (): Record<ReactionType, number> => ({ like: 0, funny: 0, relatable: 0, angry: 0, insightful: 0, helpful: 0, wholesome: 0 });
export function summarizeReactions(reactions: PostReaction[] = []) { return reactions.reduce((summary, reaction) => { if (reaction.reactionType in summary) summary[reaction.reactionType] += 1; return summary; }, emptySummary()); }

export function FeedPage({ scope }: { scope: "home" | "community" }) {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(scope === "home" ? "For you" : "All");
  const [compose, setCompose] = useState(params.get("compose") === "1");
  const [search, setSearch] = useState(params.get("q") || "");
  const tabs = scope === "home" ? homeTabs : communityTabs;
  const endpoint = scope === "home" ? `/feed${queryString({ scope: tab.toLowerCase().replace(" ", "_"), search })}` : `/posts${queryString({ scope: "community", category: tab === "All" ? undefined : tab, search })}`;
  const posts = useQuery({ queryKey: ["posts", scope, tab, search], queryFn: ({ signal }) => apiPage<Post>(endpoint, signal), staleTime: 30_000 });
  useEffect(() => { if (params.get("compose") === "1") setCompose(true); }, [params]);
  return <PageFrame title={scope === "home" ? "Home" : "Community"} eyebrow={scope === "home" ? "Your IUTverse" : "Campus network"} tabs={tabs.map(item => <Chip key={item} active={tab === item} onClick={() => setTab(item)}>{item}</Chip>)}>
    <div className={styles.toolbar}><input className={styles.toolbarGrow} aria-label={`Search ${scope}`} value={search} onChange={event => setSearch(event.target.value)} placeholder={scope === "home" ? "Search campus content" : "Search community"} style={{ minHeight: 42, border: "1px solid var(--border)", borderRadius: 999, background: "var(--surface-2)", color: "var(--fg)", padding: "0 14px" }} /><Button onClick={() => setCompose(value => !value)}>{compose ? "Close" : "Post"}</Button></div>
    <div className={styles.stack}>{compose && <PostComposer onDone={() => setCompose(false)} />}{posts.isLoading && <FeedLoading />}{posts.isError && <EmptyState title="We couldn’t load your feed." body={posts.error instanceof Error ? posts.error.message : "Check your connection and try again."} action={<Button onClick={() => void posts.refetch()}>Try again</Button>} />}{posts.data?.data.length === 0 && <EmptyState title="No campus posts found" body="Start a conversation or change the selected filters." action={<Button onClick={() => setCompose(true)}>Start a conversation</Button>} />}{posts.data?.data.map(post => <PostCard key={post.id} post={post} />)}</div>
  </PageFrame>;
}

function FeedLoading() { return <>{[1, 2, 3].map(index => <Card key={index} padded><div style={{ height: 110, borderRadius: 12, background: "var(--surface-2)" }} /></Card>)}</>; }

export function PostComposer({ onDone }: { onDone?: () => void }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Discussion");
  const [anonymous, setAnonymous] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [preview, setPreview] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const query = useQueryClient();
  const { notify } = useToast();
  useEffect(() => { if (!imageFile) { setPreview(""); return; } const url = URL.createObjectURL(imageFile); setPreview(url); return () => URL.revokeObjectURL(url); }, [imageFile]);
  const clearImage = () => { setImageFile(null); setImageError(""); if (inputRef.current) inputRef.current.value = ""; };
  const selectImage = (file?: File) => {
    setImageError("");
    if (!file) return;
    if (!POST_IMAGE_TYPES.has(file.type)) { clearImage(); setImageError("Choose a JPEG, PNG, WebP, or GIF image."); return; }
    if (file.size > MAX_POST_IMAGE_BYTES) { clearImage(); setImageError("Image must be 5 MB or smaller."); return; }
    setImageFile(file);
  };
  const create = useMutation({ mutationFn: async () => { const body = new FormData(); body.append("content", text.trim()); body.append("category", category.toLowerCase()); body.append("isAnonymous", String(anonymous)); if (imageFile) body.append("image", imageFile); return apiRequest<Post>("/posts", { method: "POST", body }); }, onSuccess: () => { setText(""); clearImage(); notify("Post shared."); void query.invalidateQueries({ queryKey: ["posts"] }); onDone?.(); } });
  const categories = ["Discussion", "Resource", "Question", "Lost & Found", "Confession"];
  return <Card className={styles.composer}><div className={styles.composerRow}><Avatar name="You" /><Textarea aria-label="Post text" placeholder="What's on your mind?" value={text} maxLength={5000} onChange={event => setText(event.target.value)} /></div><div className={styles.categoryRow}>{categories.map(item => <Chip key={item} active={category === item} onClick={() => setCategory(item)}>{item}</Chip>)}</div>{preview && <div className={styles.imagePreview}><img src={preview} alt="Selected post attachment preview" /><div><strong>{imageFile?.name}</strong><span>{imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ""}</span></div><Button variant="ghost" iconOnly aria-label="Remove selected image" onClick={clearImage}><X /></Button></div>}<div className={styles.composerActions}><div className={styles.composerTools}><input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => selectImage(event.target.files?.[0])} /><Button variant="ghost" onClick={() => inputRef.current?.click()} disabled={create.isPending}><Image size={18} />{imageFile ? "Change image" : "Image"}</Button><Chip active={anonymous} onClick={() => setAnonymous(value => !value)}>Anonymous</Chip></div><Button onClick={() => create.mutate()} disabled={create.isPending || (!text.trim() && !imageFile)}><Send size={17} />{create.isPending ? "Uploading…" : "Post"}</Button></div><div className={styles.composerStatus} aria-live="polite">{imageError || (create.isError ? create.error.message : "")}</div></Card>;
}

type ReactionState = { summary: Record<ReactionType, number>; current: ReactionType | null; total: number };
function reactionState(post: Post, currentUserId?: string): ReactionState {
  const summary = post.reactionSummary ? { ...emptySummary(), ...post.reactionSummary } : summarizeReactions(post.reactions);
  const current = post.currentReaction ?? post.reactions?.find(reaction => reaction.userId === currentUserId)?.reactionType ?? null;
  return { summary, current, total: typeof post.reactionCount === "number" ? post.reactionCount : Object.values(summary).reduce((sum, count) => sum + Number(count || 0), 0) };
}

export function PostCard({ post, detailed = false }: { post: Post; detailed?: boolean }) {
  const { user } = useAuth();
  const query = useQueryClient();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reaction, setReaction] = useState(() => reactionState(post, user?.id));
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const author = post.isAnonymous ? undefined : post.author || post.user;
  const ownerId = post.authorId || post.userId;
  const isOwner = Boolean(user?.id && ownerId === user.id);
  const comments = post.commentCount ?? post.comments?.length ?? 0;
  const picture = mediaUrl(author?.profilePictureUrl);
  const image = mediaUrl(post.imageUrl || post.image);
  useEffect(() => setReaction(reactionState(post, user?.id)), [post, user?.id]);
  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    if (menuOpen) menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    const close = (event: MouseEvent) => { if (menuOpen && !menuRef.current?.contains(event.target as Node) && event.target !== moreRef.current) setMenuOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); setPickerOpen(false); moreRef.current?.focus(); } };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [menuOpen, pickerOpen]);
  const react = useMutation({ mutationFn: (type: ReactionType) => apiRequest(`/posts/${post.id}/react`, { method: "POST", ...jsonBody({ reactionType: type.toUpperCase() }) }), onMutate: type => { const previous = reaction; const nextSummary = { ...previous.summary }; if (previous.current) nextSummary[previous.current] = Math.max(0, nextSummary[previous.current] - 1); const nextCurrent = previous.current === type ? null : type; if (nextCurrent) nextSummary[nextCurrent] += 1; setReaction({ summary: nextSummary, current: nextCurrent, total: Math.max(0, previous.total + (previous.current ? -1 : 0) + (nextCurrent ? 1 : 0)) }); setPickerOpen(false); return previous; }, onError: (_error, _type, previous) => { if (previous) setReaction(previous); notify("Reaction could not be updated."); }, onSettled: () => { void query.invalidateQueries({ queryKey: ["posts"] }); void query.invalidateQueries({ queryKey: ["post", String(post.id)] }); } });
  const remove = useMutation({ mutationFn: () => apiRequest(`/posts/${post.id}`, { method: "DELETE" }), onSuccess: () => { notify("Post deleted."); setDeleteOpen(false); void query.invalidateQueries({ queryKey: ["posts"] }); void query.invalidateQueries({ queryKey: ["profile-posts"] }); void query.removeQueries({ queryKey: ["post", String(post.id)] }); if (detailed) navigate("/community", { replace: true }); }, onError: error => notify(error.message) });
  const copyLink = () => { void navigator.clipboard.writeText(`${location.origin}/posts/${post.id}`).then(() => notify("Post link copied.")); setMenuOpen(false); };

  return <Card className={styles.post}><div className={styles.author}><Avatar name={post.isAnonymous ? "Anonymous" : author?.displayName} src={picture} /><div className={styles.authorMeta}><strong>{post.isAnonymous ? "Anonymous" : author?.displayName || "IUT member"}</strong><span>{author?.department}{author?.batch ? ` ${author.batch}` : ""}{author && " · "}{dateLabel(post.createdAt)}</span></div><div className={styles.postMenuWrap}><Button ref={moreRef} variant="ghost" iconOnly aria-label="Post options" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen(value => !value); setPickerOpen(false); }}><MoreHorizontal /></Button>{menuOpen && <div ref={menuRef} role="menu" className={styles.postMenu}><button role="menuitem" type="button" onClick={copyLink}><Copy size={17} />Copy link</button>{isOwner && <button role="menuitem" type="button" className={styles.deleteMenuItem} onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}><Trash2 size={17} />Delete post</button>}</div>}</div></div><div className={styles.postText}>{post.content}</div>{image && <img className={styles.postImage} src={image} alt="Post attachment" loading="lazy" />}<div className={styles.stats}><span className={styles.reactionSummary} aria-label={`${reaction.total} reactions`}>{POST_REACTIONS.filter(item => reaction.summary[item.type] > 0).map(item => <span title={`${item.label}: ${reaction.summary[item.type]}`} key={item.type}>{item.emoji}</span>)}<strong>{reaction.total}</strong> reactions</span><span>{comments} replies</span></div><div className={styles.actions}><div className={styles.reactionControl}><Button variant={reaction.current ? "secondary" : "ghost"} aria-expanded={pickerOpen} onClick={() => { setPickerOpen(value => !value); setMenuOpen(false); }}>{reaction.current ? POST_REACTIONS.find(item => item.type === reaction.current)?.emoji : "♡"} {reaction.current ? POST_REACTIONS.find(item => item.type === reaction.current)?.label : "React"}</Button>{pickerOpen && <div className={styles.reactionPicker} aria-label="Choose a reaction">{POST_REACTIONS.map(item => <button type="button" key={item.type} aria-pressed={reaction.current === item.type} aria-label={`${item.label}, ${reaction.summary[item.type]} reactions`} onClick={() => react.mutate(item.type)}><span>{item.emoji}</span><small>{item.label}</small><strong>{reaction.summary[item.type]}</strong></button>)}</div>}</div>{!detailed && <Link className={styles.actionLink} to={`/posts/${post.id}`}><MessageCircle size={17} />Reply</Link>}<EntityActions kind="post" id={post.id} saved={post.saved} invalidate={["posts"]} /></div><Dialog title="Delete post?" open={deleteOpen} onClose={() => setDeleteOpen(false)}><p>This permanently removes the post and its replies from IUTverse.</p>{remove.isError && <p role="alert" className={styles.composerStatus}>{remove.error.message}</p>}<DialogActions><Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? "Deleting…" : "Delete post"}</Button></DialogActions></Dialog></Card>;
}

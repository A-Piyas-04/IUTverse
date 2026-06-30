export type EntityKind = "post" | "comment" | "resource" | "job" | "lost_found" | "confession" | "cat_post" | "event";
export type ReactionType = "like" | "funny" | "relatable" | "angry" | "insightful" | "helpful" | "wholesome";
export type ContentStatus = "active" | "resolved" | "archived" | "deleted" | "flagged";

export interface ApiResult<T> { success: boolean; data: T; message?: string; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface PaginatedResult<T> extends ApiResult<T[]> { pagination: Pagination; }

export interface Profile {
  id: string;
  displayName: string;
  name?: string;
  email?: string;
  handle?: string;
  department?: string;
  departmentId?: number;
  batch?: number;
  studentId?: string;
  bio?: string;
  interests?: string[];
  badges?: string[];
  role?: "user" | "mod" | "admin";
  profilePictureUrl?: string;
  coverPictureUrl?: string;
  schoolName?: string;
  collegeName?: string;
  currentProgram?: string;
  currentYear?: string;
  currentSemester?: string;
  hometown?: string;
  currentResidence?: string;
  currentHall?: string;
  currentRoom?: string;
  currentBed?: string;
  privacy?: Record<string, boolean>;
}

export interface Comment {
  id: number;
  content: string;
  author?: Profile;
  authorId?: string;
  createdAt: string;
  parentCommentId?: number | null;
  replies?: Comment[];
}

export interface PostReaction {
  id: number;
  postId: number;
  userId: string;
  reactionType: ReactionType;
  user?: Profile;
}

export interface Post {
  id: number;
  content: string;
  author?: Profile;
  user?: Profile;
  authorId?: string;
  userId?: string;
  imageUrl?: string;
  image?: string;
  category?: string;
  isAnonymous?: boolean;
  createdAt: string;
  reactionCount?: number;
  commentCount?: number;
  reactions?: PostReaction[];
  reactionSummary?: Record<ReactionType, number>;
  currentReaction?: ReactionType | null;
  saved?: boolean;
  muted?: boolean;
  comments?: Comment[];
}

export interface Resource {
  id: number;
  title: string;
  description?: string;
  type: string;
  department?: { id: number; name: string };
  courseCode?: string;
  fileUrl?: string;
  fileDownloadUrl?: string;
  externalLink?: string;
  uploader?: Profile;
  helpfulCount?: number;
  commentCount?: number;
  saved?: boolean;
  createdAt: string;
}

export interface Job {
  id: number;
  title: string;
  type: string;
  description: string;
  requirements: string[];
  compensation?: string;
  deadline?: string;
  organization?: string;
  format?: string;
  skills?: string[];
  department?: string;
  postedBy?: Profile;
  postedById?: string;
  applicationCount?: number;
  applied?: boolean;
  saved?: boolean;
  createdAt: string;
}

export interface LostFoundItem {
  id: number;
  type: "lost" | "found";
  title: string;
  description: string;
  location: string;
  category?: string;
  occurredAt?: string;
  contact?: string;
  contactPreference?: string;
  contactNote?: string;
  returnLocation?: string;
  availability?: string;
  imageUrl?: string;
  image?: string;
  status: ContentStatus;
  userId?: string;
  user?: Profile;
  saved?: boolean;
  createdAt: string;
}

export interface ConfessionPollOption { id: number; text: string; votes: number; }
export interface Confession {
  id: number;
  content: string;
  tag: string;
  createdAt: string;
  reactionCount?: number;
  reactions?: Record<string, number>;
  poll?: { id: number; question: string; totalVotes: number; options: ConfessionPollOption[] };
  comments?: Comment[];
  saved?: boolean;
}

export interface CatPost {
  id: number;
  caption: string;
  imageUrl?: string;
  category?: string;
  location?: string;
  user?: Profile;
  likeCount?: number;
  commentCount?: number;
  saved?: boolean;
  createdAt: string;
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  type?: string;
  clubName?: string;
  category?: string;
  imageUrl?: string;
  createdBy?: Profile;
  rsvpStatus?: "going" | "interested" | "not_going";
  saved?: boolean;
}

export interface Conversation {
  id: number;
  otherUser?: Profile;
  participants?: Profile[];
  lastMessage?: string;
  updatedAt?: string;
  unreadCount?: number;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  content: string;
  sentAt: string;
  readAt?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface ReportItem {
  id: number;
  entityKind: EntityKind;
  entityId: number;
  reason: string;
  details?: string;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: string;
}

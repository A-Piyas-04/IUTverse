const {
  ensureSupabaseAdmin,
  mapProfile,
  pageRange,
  profileSelect,
} = require("../utils/supabaseData");
const { badRequest, forbidden, notFound, serverError } = require("../utils/responses");
const { positiveInt, requiredText } = require("../utils/validation");

const mapComment = (comment) => ({
  id: comment.id,
  postId: comment.post_id,
  userId: comment.author_id,
  content: comment.content,
  createdAt: comment.created_at,
  updatedAt: comment.updated_at,
  parentCommentId: comment.parent_comment_id,
  user: mapProfile(comment.user),
  replies: (comment.replies || []).map(mapComment),
});

exports.createComment = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const postIdResult = positiveInt(req.params.postId, "Post ID");
    if (postIdResult.error) return badRequest(res, postIdResult.error);

    const contentResult = requiredText(req.body.content, "Comment content", { max: 2000 });
    if (contentResult.error) return badRequest(res, contentResult.error);

    const parentResult = req.body.parentCommentId
      ? positiveInt(req.body.parentCommentId, "Parent comment ID")
      : { value: null };
    if (parentResult.error) return badRequest(res, parentResult.error);

    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postIdResult.value,
        author_id: req.user.id,
        content: contentResult.value,
        parent_comment_id: parentResult.value,
      })
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data: mapComment(data) });
  } catch (error) {
    console.error("Error creating comment:", error);
    return serverError(res, "Failed to create comment", error.message);
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const postIdResult = positiveInt(req.params.postId, "Post ID");
    if (postIdResult.error) return badRequest(res, postIdResult.error);

    const { page, limit, from, to } = pageRange(req.query.page || 1, req.query.limit || 20);
    const { data, count, error } = await supabase
      .from("post_comments")
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`, { count: "exact" })
      .eq("post_id", postIdResult.value)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return res.status(200).json({
      success: true,
      data: data.map(mapComment),
      pagination: { page, limit, totalComments: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return serverError(res, "Failed to fetch comments", error.message);
  }
};

exports.getCommentReplies = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const commentIdResult = positiveInt(req.params.commentId, "Comment ID");
    if (commentIdResult.error) return badRequest(res, commentIdResult.error);

    const { data, error } = await supabase
      .from("post_comments")
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`)
      .eq("parent_comment_id", commentIdResult.value)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, data: data.map(mapComment) });
  } catch (error) {
    console.error("Error fetching replies:", error);
    return serverError(res, "Failed to fetch replies", error.message);
  }
};

exports.updateComment = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(req.params.commentId, "Comment ID");
    if (idResult.error) return badRequest(res, idResult.error);
    const id = idResult.value;

    const contentResult = requiredText(req.body.content, "Comment content", { max: 2000 });
    if (contentResult.error) return badRequest(res, contentResult.error);

    const { data: existing, error: findError } = await supabase.from("post_comments").select("*").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!existing) return notFound(res, "Comment not found");
    if (existing.author_id !== req.user.id) return forbidden(res, "Unauthorized");

    const { data, error } = await supabase
      .from("post_comments")
      .update({ content: contentResult.value })
      .eq("id", id)
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data: mapComment(data) });
  } catch (error) {
    console.error("Error updating comment:", error);
    return serverError(res, "Failed to update comment", error.message);
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const idResult = positiveInt(req.params.commentId, "Comment ID");
    if (idResult.error) return badRequest(res, idResult.error);
    const id = idResult.value;

    const { data: existing, error: findError } = await supabase.from("post_comments").select("*").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!existing) return notFound(res, "Comment not found");
    if (existing.author_id !== req.user.id) return forbidden(res, "Unauthorized");

    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return serverError(res, "Failed to delete comment", error.message);
  }
};

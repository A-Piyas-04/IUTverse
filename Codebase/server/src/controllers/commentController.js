const {
  ensureSupabaseAdmin,
  mapProfile,
  pageRange,
  profileSelect,
} = require("../utils/supabaseData");

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
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Comment content is required" });
    }

    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: Number(postId),
        author_id: req.user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId ? Number(parentCommentId) : null,
      })
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data: mapComment(data) });
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({ success: false, message: "Failed to create comment", error: error.message });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const { page, limit, from, to } = pageRange(req.query.page || 1, req.query.limit || 20);
    const { data, count, error } = await supabase
      .from("post_comments")
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`, { count: "exact" })
      .eq("post_id", Number(req.params.postId))
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
    return res.status(500).json({ success: false, message: "Failed to fetch comments", error: error.message });
  }
};

exports.getCommentReplies = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("post_comments")
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`)
      .eq("parent_comment_id", Number(req.params.commentId))
      .order("created_at", { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, data: data.map(mapComment) });
  } catch (error) {
    console.error("Error fetching replies:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch replies", error: error.message });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const id = Number(req.params.commentId);
    const { data: existing, error: findError } = await supabase.from("post_comments").select("*").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!existing) return res.status(404).json({ success: false, message: "Comment not found" });
    if (existing.author_id !== req.user.id) return res.status(403).json({ success: false, message: "Unauthorized" });

    const { data, error } = await supabase
      .from("post_comments")
      .update({ content: req.body.content })
      .eq("id", id)
      .select(`*, user:profiles!post_comments_author_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data: mapComment(data) });
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.status(500).json({ success: false, message: "Failed to update comment", error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const supabase = ensureSupabaseAdmin();
    const id = Number(req.params.commentId);
    const { data: existing, error: findError } = await supabase.from("post_comments").select("*").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!existing) return res.status(404).json({ success: false, message: "Comment not found" });
    if (existing.author_id !== req.user.id) return res.status(403).json({ success: false, message: "Unauthorized" });

    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ success: false, message: "Failed to delete comment", error: error.message });
  }
};

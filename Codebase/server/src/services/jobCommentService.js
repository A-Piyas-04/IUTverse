const {
  ensureSupabaseAdmin,
  mapProfile,
  profileSelect,
} = require("../utils/supabaseData");

const mapComment = (comment) => ({
  id: comment.id,
  content: comment.content,
  jobId: comment.job_id,
  authorId: comment.author_id,
  parentCommentId: comment.parent_comment_id,
  createdAt: comment.created_at,
  updatedAt: comment.updated_at,
  author: mapProfile(comment.author),
  replies: (comment.replies || []).map(mapComment),
});

class JobCommentService {
  async createComment(data) {
    const supabase = ensureSupabaseAdmin();
    const { data: comment, error } = await supabase
      .from("job_comments")
      .insert({
        content: data.content,
        job_id: Number(data.jobId),
        author_id: data.authorId,
        parent_comment_id: data.parentCommentId || null,
      })
      .select(`*, author:profiles!job_comments_author_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return mapComment(comment);
  }

  async getCommentsByJobId(jobId) {
    const supabase = ensureSupabaseAdmin();
    const { data: comments, error } = await supabase
      .from("job_comments")
      .select(`*, author:profiles!job_comments_author_id_fkey(${profileSelect})`)
      .eq("job_id", Number(jobId))
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const ids = comments.map((comment) => comment.id);
    let replies = [];
    if (ids.length) {
      const result = await supabase
        .from("job_comments")
        .select(`*, author:profiles!job_comments_author_id_fkey(${profileSelect})`)
        .in("parent_comment_id", ids)
        .order("created_at", { ascending: true });
      if (result.error) throw result.error;
      replies = result.data;
    }

    return comments.map((comment) =>
      mapComment({
        ...comment,
        replies: replies.filter((reply) => reply.parent_comment_id === comment.id),
      })
    );
  }

  async createReply(commentId, data) {
    return this.createComment({
      ...data,
      parentCommentId: Number(commentId),
    });
  }

  async updateComment(commentId, content, userId) {
    const supabase = ensureSupabaseAdmin();
    const comment = await this.getRawComment(commentId);
    if (!comment || comment.author_id !== userId) {
      throw new Error("Unauthorized to update this comment");
    }

    const { data, error } = await supabase
      .from("job_comments")
      .update({ content })
      .eq("id", Number(commentId))
      .select(`*, author:profiles!job_comments_author_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return mapComment(data);
  }

  async deleteComment(commentId, userId) {
    const supabase = ensureSupabaseAdmin();
    const comment = await this.getRawComment(commentId);
    if (!comment || comment.author_id !== userId) {
      throw new Error("Unauthorized to delete this comment");
    }

    const { data, error } = await supabase
      .from("job_comments")
      .delete()
      .eq("id", Number(commentId))
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRawComment(commentId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("job_comments")
      .select("*")
      .eq("id", Number(commentId))
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getCommentById(commentId) {
    const supabase = ensureSupabaseAdmin();
    const { data: comment, error } = await supabase
      .from("job_comments")
      .select(`*, author:profiles!job_comments_author_id_fkey(${profileSelect})`)
      .eq("id", Number(commentId))
      .maybeSingle();

    if (error) throw error;
    if (!comment) return null;

    const { data: replies, error: repliesError } = await supabase
      .from("job_comments")
      .select(`*, author:profiles!job_comments_author_id_fkey(${profileSelect})`)
      .eq("parent_comment_id", Number(commentId))
      .order("created_at", { ascending: true });

    if (repliesError) throw repliesError;
    return mapComment({ ...comment, replies });
  }
}

module.exports = new JobCommentService();

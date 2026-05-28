const { ensureSupabaseAdmin, pageRange } = require("../utils/supabaseData");

const defaultReactionCounts = {
  like: 0,
  funny: 0,
  relatable: 0,
  angry: 0,
  insightful: 0,
};

class ConfessionService {
  async createConfession(data) {
    const supabase = ensureSupabaseAdmin();
    const { content, tag, poll } = data;

    const { data: confession, error } = await supabase
      .from("confessions")
      .insert({ content, tag })
      .select("*")
      .single();

    if (error) throw error;

    if (poll) {
      const { data: pollRow, error: pollError } = await supabase
        .from("confession_polls")
        .insert({
          confession_id: confession.id,
          question: poll.question,
        })
        .select("*")
        .single();

      if (pollError) throw pollError;

      const { error: optionError } = await supabase
        .from("confession_poll_options")
        .insert(
          poll.options.map((option, index) => ({
            poll_id: pollRow.id,
            text: option.text,
            order_index: index,
          }))
        );

      if (optionError) throw optionError;
    }

    return this.getConfessionById(confession.id);
  }

  async getAllConfessions(page = 1, limit = 20, tag = null, sortBy = "recent") {
    const supabase = ensureSupabaseAdmin();
    const range = pageRange(page, limit);
    let query = supabase
      .from("confessions")
      .select("*")
      .eq("status", "active")
      .range(range.from, range.to);

    if (tag && tag !== "all") query = query.eq("tag", tag);
    if (sortBy === "mostReacted") {
      query = query.order("reaction_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return Promise.all(data.map((confession) => this.hydrateConfession(confession)));
  }

  async getConfessionById(id) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("confessions")
      .select("*")
      .eq("id", Number(id))
      .maybeSingle();

    if (error) throw error;
    return data ? this.hydrateConfession(data) : null;
  }

  async getRandomConfession() {
    const supabase = ensureSupabaseAdmin();
    const { count, error: countError } = await supabase
      .from("confessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    if (countError) throw countError;
    if (!count) return null;

    const offset = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from("confessions")
      .select("*")
      .eq("status", "active")
      .range(offset, offset)
      .single();

    if (error) throw error;
    return this.hydrateConfession(data);
  }

  async addReaction(confessionId, userId, reactionType) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("confession_reactions")
      .upsert(
        {
          confession_id: Number(confessionId),
          user_id: userId,
          reaction_type: reactionType,
        },
        { onConflict: "confession_id,user_id" }
      )
      .select()
      .single();

    if (error) throw error;
    await this.recountReactions(confessionId);
    return data;
  }

  async removeReaction(confessionId, userId) {
    const supabase = ensureSupabaseAdmin();
    const { error } = await supabase
      .from("confession_reactions")
      .delete()
      .eq("confession_id", Number(confessionId))
      .eq("user_id", userId);

    if (error) throw error;
    await this.recountReactions(confessionId);
    return { success: true };
  }

  async voteOnPoll(pollId, optionId, userId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("confession_poll_votes")
      .insert({
        poll_id: Number(pollId),
        option_id: Number(optionId),
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("User has already voted on this poll");
      throw error;
    }

    return data;
  }

  async getUserReactions(confessionId, userId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("confession_reactions")
      .select("reaction_type")
      .eq("confession_id", Number(confessionId))
      .eq("user_id", userId);

    if (error) throw error;
    return data.map((reaction) => ({ reactionType: reaction.reaction_type }));
  }

  async hasUserVoted(pollId, userId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("confession_poll_votes")
      .select("id")
      .eq("poll_id", Number(pollId))
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  async hydrateConfession(confession) {
    const supabase = ensureSupabaseAdmin();
    const { data: reactions, error: reactionsError } = await supabase
      .from("confession_reactions")
      .select("reaction_type")
      .eq("confession_id", confession.id);

    if (reactionsError) throw reactionsError;

    const reactionCounts = reactions.reduce(
      (acc, reaction) => {
        acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
        return acc;
      },
      { ...defaultReactionCounts }
    );

    const { data: poll } = await supabase
      .from("confession_polls")
      .select("*")
      .eq("confession_id", confession.id)
      .maybeSingle();

    let pollData = null;
    if (poll) {
      const { data: options, error: optionsError } = await supabase
        .from("confession_poll_options")
        .select("*")
        .eq("poll_id", poll.id)
        .order("order_index", { ascending: true });

      if (optionsError) throw optionsError;
      pollData = {
        id: poll.id,
        question: poll.question,
        totalVotes: poll.total_votes,
        options: options.map((option) => ({
          id: option.id,
          text: option.text,
          votes: option.vote_count,
          percentage: poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0,
        })),
      };
    }

    return {
      id: confession.id,
      content: confession.content,
      tag: confession.tag,
      timestamp: confession.created_at,
      reactions: reactionCounts,
      poll: pollData,
    };
  }

  async recountReactions(confessionId) {
    const supabase = ensureSupabaseAdmin();
    const { count, error } = await supabase
      .from("confession_reactions")
      .select("id", { count: "exact", head: true })
      .eq("confession_id", Number(confessionId));
    if (error) throw error;
    await supabase.from("confessions").update({ reaction_count: count || 0 }).eq("id", Number(confessionId));
  }

  async getConfessionAnalytics() {
    const supabase = ensureSupabaseAdmin();
    const { count: totalConfessions, error } = await supabase
      .from("confessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if (error) throw error;

    const { data: confessions, error: listError } = await supabase
      .from("confessions")
      .select("*")
      .eq("status", "active");
    if (listError) throw listError;

    const tagCounts = new Map();
    for (const confession of confessions) {
      tagCounts.set(confession.tag, (tagCounts.get(confession.tag) || 0) + 1);
    }

    const topTags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const mostReacted = confessions.sort((a, b) => b.reaction_count - a.reaction_count)[0];

    return {
      totalConfessions: totalConfessions || 0,
      topTags,
      mostReacted: mostReacted
        ? { confession: await this.hydrateConfession(mostReacted), total: mostReacted.reaction_count }
        : { confession: null, total: 0 },
      mostVotedPoll: { poll: { totalVotes: 0 } },
    };
  }
}

module.exports = new ConfessionService();

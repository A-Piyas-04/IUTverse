const {
  ensureSupabaseAdmin,
  mapProfile,
  profileSelect,
} = require("../utils/supabaseData");
const { optionalText, sanitizePlainText, sanitizePlainTextArray } = require("../utils/validation");

const mapJob = (job) => ({
  id: job.id,
  title: job.title,
  type: job.type,
  description: job.description,
  requirements: job.requirements || [],
  compensation: job.compensation,
  deadline: job.deadline,
  postedById: job.posted_by_id,
  createdAt: job.created_at,
  updatedAt: job.updated_at,
  status: job.status,
  postedBy: mapProfile(job.postedBy),
});

class JobService {
  async createJob(data) {
    const supabase = ensureSupabaseAdmin();
    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        title: sanitizePlainText(data.title, { max: 160 }),
        type: data.type,
        description: sanitizePlainText(data.description, { max: 5000 }),
        requirements: sanitizePlainTextArray(data.requirements || [], { max: 300 }),
        compensation: optionalText(data.compensation, { max: 200 }),
        deadline: data.deadline || null,
        posted_by_id: data.postedById,
      })
      .select(`*, postedBy:profiles!jobs_posted_by_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return mapJob(job);
  }

  async getAllJobs() {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("jobs")
      .select(`*, postedBy:profiles!jobs_posted_by_id_fkey(${profileSelect})`)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data.map(mapJob);
  }

  async getJobById(id) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("jobs")
      .select(`*, postedBy:profiles!jobs_posted_by_id_fkey(${profileSelect})`)
      .eq("id", Number(id))
      .maybeSingle();

    if (error) throw error;
    return data ? mapJob(data) : null;
  }

  async updateJob(id, data, userId) {
    const supabase = ensureSupabaseAdmin();
    const existing = await this.getJobById(id);

    if (!existing) throw new Error("Job not found");
    if (existing.postedById !== userId) {
      throw new Error("Unauthorized to update this job");
    }

    const payload = {};
    if (data.title !== undefined) payload.title = sanitizePlainText(data.title, { max: 160 });
    if (data.type !== undefined) payload.type = data.type;
    if (data.description !== undefined) payload.description = sanitizePlainText(data.description, { max: 5000 });
    if (data.requirements !== undefined) payload.requirements = sanitizePlainTextArray(data.requirements, { max: 300 });
    if (data.compensation !== undefined) payload.compensation = optionalText(data.compensation, { max: 200 });
    if (data.deadline !== undefined) payload.deadline = data.deadline;
    if (data.status !== undefined) payload.status = data.status;

    const { data: job, error } = await supabase
      .from("jobs")
      .update(payload)
      .eq("id", Number(id))
      .select(`*, postedBy:profiles!jobs_posted_by_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return mapJob(job);
  }

  async deleteJob(id, userId, role = "user") {
    const supabase = ensureSupabaseAdmin();
    const existing = await this.getJobById(id);

    if (!existing) throw new Error("Job not found");
    const canModerate = ["admin", "mod", "moderator"].includes(String(role).toLowerCase());
    if (existing.postedById !== userId && !canModerate) {
      throw new Error("Unauthorized to delete this job");
    }

    const { data: job, error } = await supabase
      .from("jobs")
      .update({ status: "deleted" })
      .eq("id", Number(id))
      .select(`*, postedBy:profiles!jobs_posted_by_id_fkey(${profileSelect})`)
      .single();

    if (error) throw error;
    return mapJob(job);
  }
}

module.exports = new JobService();

const {
  ensureSupabaseAdmin,
  mapProfile,
  profileSelect,
} = require("../utils/supabaseData");
const { canModerate } = require("../middleware/authorization");

const mapApplication = (application) => ({
  id: application.id,
  jobId: application.job_id,
  applicantId: application.applicant_id,
  appliedAt: application.applied_at,
  applicant: mapProfile(application.applicant),
});

class JobApplicationService {
  async applyToJob(jobId, applicantId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        job_id: Number(jobId),
        applicant_id: applicantId,
      })
      .select(`*, applicant:profiles!job_applications_applicant_id_fkey(${profileSelect})`)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("You have already applied to this job");
      }
      throw error;
    }

    return mapApplication(data);
  }

  async removeApplication(jobId, applicantId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("job_applications")
      .delete()
      .eq("job_id", Number(jobId))
      .eq("applicant_id", applicantId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Application not found");
    return { message: "Application removed successfully" };
  }

  async getJobApplications(jobId, requesterId, requesterRole = "user", { page = 1, limit = 20 } = {}) {
    const supabase = ensureSupabaseAdmin();
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, posted_by_id")
      .eq("id", Number(jobId))
      .maybeSingle();

    if (jobError) throw jobError;
    if (!job) throw new Error("Job not found");
    if (job.posted_by_id !== requesterId && !canModerate({ role: requesterRole })) {
      throw new Error("Unauthorized to view job applications");
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count, error } = await supabase
      .from("job_applications")
      .select(`*, applicant:profiles!job_applications_applicant_id_fkey(${profileSelect})`, { count: "exact" })
      .eq("job_id", Number(jobId))
      .order("applied_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return {
      applications: data.map(mapApplication),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getUserApplicationStatus(jobId, userId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_id", Number(jobId))
      .eq("applicant_id", userId)
      .maybeSingle();

    if (error) throw error;
    return { hasApplied: !!data };
  }

  async getApplicationCount(jobId) {
    const supabase = ensureSupabaseAdmin();
    const { count, error } = await supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", Number(jobId));

    if (error) throw error;
    return { count: count || 0 };
  }
}

module.exports = new JobApplicationService();

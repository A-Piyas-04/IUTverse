const {
  ensureSupabaseAdmin,
  mapProfile,
  profileSelect,
} = require("../utils/supabaseData");

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

  async getJobApplications(jobId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("job_applications")
      .select(`*, applicant:profiles!job_applications_applicant_id_fkey(${profileSelect})`)
      .eq("job_id", Number(jobId))
      .order("applied_at", { ascending: false });

    if (error) throw error;
    return data.map(mapApplication);
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

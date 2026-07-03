const { supabaseAdmin, isSupabaseAdminConfigured } = require("../config/supabase");
const { sanitizePlainText, sanitizePlainTextArray } = require("../utils/validation");

const ensureSupabaseAdmin = () => {
  if (!isSupabaseAdminConfigured) throw new Error("Supabase Admin is not configured");
};

const publicProfileSelect = `
  id, display_name, handle, department_id, batch, bio, interests, badges,
  profile_image_path, cover_image_path, created_at,
  department:departments(name)
`;

const privateProfileSelect = `
  user_id, student_id, privacy, college_name, school_name, hometown,
  current_program, current_year, current_semester, current_hall,
  current_residence, current_room, current_bed
`;

const toPublicUser = (profile) => profile ? ({
  id: profile.id,
  name: profile.display_name,
  displayName: profile.display_name,
  handle: profile.handle,
  department: profile.department?.name || null,
  departmentId: profile.department_id,
  batch: profile.batch,
  createdAt: profile.created_at,
  profile: {
    bio: profile.bio,
    profilePicture: profile.profile_image_path,
    coverPicture: profile.cover_image_path,
    interests: profile.interests || [],
    badges: profile.badges || [],
  },
}) : null;

const toOwnerUser = (profile, privateProfile) => {
  const user = toPublicUser(profile);
  if (!user) return null;
  return {
    ...user,
    studentId: privateProfile?.student_id || null,
    privacy: privateProfile?.privacy || {},
    profile: {
      ...user.profile,
      collegeName: privateProfile?.college_name || null,
      schoolName: privateProfile?.school_name || null,
      hometown: privateProfile?.hometown || null,
      currentProgram: privateProfile?.current_program || null,
      currentYear: privateProfile?.current_year || null,
      currentSemester: privateProfile?.current_semester || null,
      currentHall: privateProfile?.current_hall || null,
      currentResidence: privateProfile?.current_residence || null,
      currentRoom: privateProfile?.current_room || null,
      currentBed: privateProfile?.current_bed || null,
    },
  };
};

const publicPayload = (data = {}) => {
  const mapping = {
    bio: "bio", interests: "interests", name: "display_name", displayName: "display_name",
    handle: "handle", departmentId: "department_id", batch: "batch",
    profilePicture: "profile_image_path", coverPicture: "cover_image_path",
  };
  return Object.entries(data).reduce((result, [key, value]) => {
    const column = mapping[key];
    if (!column) return result;
    result[column] = Array.isArray(value)
      ? sanitizePlainTextArray(value, { max: 100 })
      : typeof value === "string" ? sanitizePlainText(value, { max: 1000 }) : value;
    return result;
  }, {});
};

const privatePayload = (data = {}) => {
  const mapping = {
    studentId: "student_id", privacy: "privacy", collegeName: "college_name",
    schoolName: "school_name", hometown: "hometown", currentProgram: "current_program",
    currentYear: "current_year", currentSemester: "current_semester", currentHall: "current_hall",
    currentResidence: "current_residence", currentRoom: "current_room", currentBed: "current_bed",
  };
  return Object.entries(data).reduce((result, [key, value]) => {
    const column = mapping[key];
    if (!column) return result;
    result[column] = typeof value === "string" ? sanitizePlainText(value, { max: 1000 }) : value;
    return result;
  }, {});
};

class UserService {
  async getProfile(userId) {
    ensureSupabaseAdmin();
    const { data, error } = await supabaseAdmin.from("profiles").select(publicProfileSelect).eq("id", userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async getPublicUserById(userId) {
    return toPublicUser(await this.getProfile(userId));
  }

  async getOwnerUserById(userId) {
    ensureSupabaseAdmin();
    const [profile, privateResult] = await Promise.all([
      this.getProfile(userId),
      supabaseAdmin.from("profile_private").select(privateProfileSelect).eq("user_id", userId).maybeSingle(),
    ]);
    if (privateResult.error) throw privateResult.error;
    return toOwnerUser(profile, privateResult.data);
  }

  async createProfile(userId, profileData) {
    ensureSupabaseAdmin();
    const safePublic = publicPayload(profileData);
    const safePrivate = privatePayload(profileData);
    const { error } = await supabaseAdmin.from("profiles").upsert({ id: userId, ...safePublic });
    if (error) throw error;
    const { error: privateError } = await supabaseAdmin.from("profile_private").upsert({ user_id: userId, ...safePrivate });
    if (privateError) throw privateError;
    return this.getOwnerUserById(userId);
  }

  async updateProfile(userId, profileData) {
    ensureSupabaseAdmin();
    const safePublic = publicPayload(profileData);
    const safePrivate = privatePayload(profileData);
    if (Object.keys(safePublic).length) {
      const { error } = await supabaseAdmin.from("profiles").update(safePublic).eq("id", userId);
      if (error) throw error;
    }
    if (Object.keys(safePrivate).length) {
      const { error } = await supabaseAdmin.from("profile_private").upsert({ user_id: userId, ...safePrivate });
      if (error) throw error;
    }
    return this.getOwnerUserById(userId);
  }

  async updateUserName(userId, name) {
    await this.updateProfile(userId, { name });
    return this.getOwnerUserById(userId);
  }

  async getUserById(userId) { return this.getOwnerUserById(userId); }

  async searchUsers(query, excludeUserId, limit = 20) {
    ensureSupabaseAdmin();
    const { data, error } = await supabaseAdmin.from("profiles").select(publicProfileSelect)
      .neq("id", excludeUserId).ilike("display_name", `%${query}%`).limit(limit).order("display_name");
    if (error) throw error;
    return data.map(toPublicUser);
  }

  async updateStudentId(userId, studentId) {
    ensureSupabaseAdmin();
    const { error } = await supabaseAdmin.from("profile_private").upsert({ user_id: userId, student_id: studentId });
    if (error?.code === "23505") throw new Error("Student ID already exists");
    if (error) throw error;
    return this.getOwnerUserById(userId);
  }

  async deleteStudentId(userId) {
    ensureSupabaseAdmin();
    const { error } = await supabaseAdmin.from("profile_private").update({ student_id: null }).eq("user_id", userId);
    if (error) throw error;
    return this.getOwnerUserById(userId);
  }

  async checkStudentIdExists(studentId, excludeUserId = null) {
    ensureSupabaseAdmin();
    let query = supabaseAdmin.from("profile_private").select("user_id").eq("student_id", studentId).limit(1);
    if (excludeUserId) query = query.neq("user_id", excludeUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data.length > 0;
  }

  async getUserByStudentId(studentId) {
    ensureSupabaseAdmin();
    const { data, error } = await supabaseAdmin.from("profile_private").select("user_id").eq("student_id", studentId).maybeSingle();
    if (error) throw error;
    return data ? this.getPublicUserById(data.user_id) : null;
  }

  async disconnect() {}
}

module.exports = new UserService();

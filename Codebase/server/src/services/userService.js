const {
  supabaseAdmin,
  isSupabaseAdminConfigured,
} = require("../config/supabase");
const { sanitizePlainText, sanitizePlainTextArray } = require("../utils/validation");

const ensureSupabaseAdmin = () => {
  if (!isSupabaseAdminConfigured) {
    throw new Error("Supabase Admin is not configured");
  }
};

const toLegacyUser = (profile, authUser = null) => {
  if (!profile) return null;

  return {
    id: profile.id,
    legacyUserId: profile.legacy_user_id,
    email: authUser?.email || null,
    name: profile.display_name,
    department: profile.department?.name || null,
    departmentId: profile.department_id,
    batch: profile.batch,
    studentId: profile.student_id,
    role: profile.role,
    createdAt: profile.created_at,
    profile: {
      bio: profile.bio,
      profilePicture: profile.profile_image_path,
      coverPicture: profile.cover_image_path,
      interests: profile.interests || [],
      badges: profile.badges || [],
      collegeName: profile.college_name,
      currentBed: profile.current_bed,
      currentHall: profile.current_hall,
      currentProgram: profile.current_program,
      currentResidence: profile.current_residence,
      currentRoom: profile.current_room,
      currentSemester: profile.current_semester,
      currentYear: profile.current_year,
      hometown: profile.hometown,
      schoolName: profile.school_name,
    },
  };
};

const profileSelect = `
  id,
  legacy_user_id,
  display_name,
  department_id,
  batch,
  student_id,
  role,
  bio,
  interests,
  badges,
  college_name,
  current_bed,
  current_hall,
  current_program,
  current_residence,
  current_room,
  current_semester,
  current_year,
  hometown,
  school_name,
  profile_image_path,
  cover_image_path,
  created_at,
  department:departments(name)
`;

const profilePayload = (profileData) => {
  const allowed = {
    bio: "bio",
    interests: "interests",
    badges: "badges",
    collegeName: "college_name",
    currentBed: "current_bed",
    currentHall: "current_hall",
    currentProgram: "current_program",
    currentResidence: "current_residence",
    currentRoom: "current_room",
    currentSemester: "current_semester",
    currentYear: "current_year",
    hometown: "hometown",
    schoolName: "school_name",
    profilePicture: "profile_image_path",
    coverPicture: "cover_image_path",
    departmentId: "department_id",
    batch: "batch",
    studentId: "student_id",
    name: "display_name",
    displayName: "display_name",
  };

  return Object.entries(profileData || {}).reduce((payload, [key, value]) => {
    const column = allowed[key];
    if (!column) return payload;

    if (Array.isArray(value)) {
      payload[column] = sanitizePlainTextArray(value, { max: 100 });
    } else if (typeof value === "string") {
      payload[column] = sanitizePlainText(value, { max: 1000 });
    } else {
      payload[column] = value;
    }
    return payload;
  }, {});
};

class UserService {
  async createUser(email, password, additionalData = {}) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: additionalData.name || email.split("@")[0],
      },
    });

    if (error) throw error;

    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      display_name: additionalData.name || email.split("@")[0],
      ...profilePayload(additionalData),
    });

    return toLegacyUser(await this.getProfile(data.user.id), data.user);
  }

  async findUserByEmail(email) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const authUser = data.users.find((user) => user.email === email);
    if (!authUser) return null;

    const profile = await this.getProfile(authUser.id);
    return toLegacyUser(profile, authUser);
  }

  async verifyPassword() {
    throw new Error("Password verification has moved to Supabase Auth");
  }

  async getAllUsers() {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data.map((profile) => toLegacyUser(profile));
  }

  async userExists(email) {
    return Boolean(await this.findUserByEmail(email));
  }

  async getUserByEmail(email) {
    return this.findUserByEmail(email);
  }

  async getProfile(userId) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createProfile(userId, profileData) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        ...profilePayload(profileData),
      })
      .select(profileSelect)
      .single();

    if (error) throw error;
    return toLegacyUser(data).profile;
  }

  async updateProfile(userId, profileData) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(profilePayload(profileData))
      .eq("id", userId)
      .select(profileSelect)
      .single();

    if (error) throw error;
    return toLegacyUser(data).profile;
  }

  async updateUserName(userId, name) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ display_name: name })
      .eq("id", userId)
      .select(profileSelect)
      .single();

    if (error) throw error;
    return toLegacyUser(data);
  }

  async getUserById(userId) {
    const profile = await this.getProfile(userId);
    return toLegacyUser(profile);
  }

  async searchUsers(query, excludeUserId, limit = 20) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .neq("id", excludeUserId)
      .ilike("display_name", `%${query}%`)
      .limit(limit)
      .order("display_name", { ascending: true });

    if (error) throw error;
    return data.map((profile) => toLegacyUser(profile));
  }

  async updateStudentId(userId, studentId) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ student_id: studentId })
      .eq("id", userId)
      .select(profileSelect)
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("Student ID already exists");
      throw error;
    }

    return toLegacyUser(data);
  }

  async deleteStudentId(userId) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ student_id: null })
      .eq("id", userId)
      .select(profileSelect)
      .single();

    if (error) throw error;
    return toLegacyUser(data);
  }

  async checkStudentIdExists(studentId, excludeUserId = null) {
    ensureSupabaseAdmin();

    let query = supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("student_id", studentId)
      .limit(1);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data.length > 0;
  }

  async getUserByStudentId(studentId) {
    ensureSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) throw error;
    return toLegacyUser(data);
  }

  async disconnect() {}
}

module.exports = new UserService();

import "server-only";
import { supabaseAdmin, isSupabaseAdminConfigured } from "../config/supabase";
import { sanitizePlainText, sanitizePlainTextArray } from "../utils/validation";
import * as storageService from "./storageService";

const ensureSupabaseAdmin = () => {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) throw new Error("Supabase Admin is not configured");
  return supabaseAdmin;
};

const publicProfileSelect = `
  id, display_name, handle, department_id, batch, bio, interests, badges,
  profile_image_path, cover_image_path, created_at,
  department:departments(name)
`;

const privateProfileSelect = `
  user_id, student_id, privacy, college_name, school_name, hometown,
  current_program, current_year, current_semester, current_hall,
  current_residence, current_room, current_bed, residency_type, resident_gender,
  program_id, hall_id, room_id,
  program:programs(id, code, name, department_id),
  hall:residence_halls(id, name),
  room:hall_rooms(id, room_number, hall_id)
`;

const toPublicUser = (profile: any) => profile ? ({
  id: profile.id,
  name: profile.display_name,
  displayName: profile.display_name,
  handle: profile.handle,
  department: profile.department?.name || null,
  departmentId: profile.department_id,
  batch: profile.batch,
  createdAt: profile.created_at,
  profilePictureUrl: storageService.publicUrl("avatars", profile.profile_image_path),
  coverPictureUrl: storageService.publicUrl("covers", profile.cover_image_path),
  profile: {
    bio: profile.bio,
    profilePicture: profile.profile_image_path,
    coverPicture: profile.cover_image_path,
    interests: profile.interests || [],
    badges: profile.badges || [],
  },
}) : null;

const toOwnerUser = (profile: any, privateProfile: any) => {
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
      currentProgram: privateProfile?.program?.code || privateProfile?.current_program || null,
      programId: privateProfile?.program_id || null,
      currentYear: privateProfile?.current_year || null,
      currentSemester: privateProfile?.current_semester || null,
      currentHall: privateProfile?.hall?.name || privateProfile?.current_hall || null,
      hallId: privateProfile?.hall_id || null,
      currentResidence: privateProfile?.current_residence || null,
      residencyType: privateProfile?.residency_type || null,
      residentGender: privateProfile?.resident_gender || null,
      currentRoom: privateProfile?.room?.room_number || privateProfile?.current_room || null,
      roomId: privateProfile?.room_id || null,
      currentBed: privateProfile?.current_bed || null,
    },
  };
};

type ProfileInput = Record<string, any>;

const publicPayload = (data: ProfileInput = {}) => {
  const mapping: Record<string, string> = {
    bio: "bio", interests: "interests", name: "display_name", displayName: "display_name",
    handle: "handle", departmentId: "department_id", batch: "batch",
    profilePicture: "profile_image_path", coverPicture: "cover_image_path",
  };
  return Object.entries(data).reduce<Record<string, unknown>>((result, [key, value]) => {
    const column = mapping[key];
    if (!column) return result;
    result[column] = Array.isArray(value)
      ? sanitizePlainTextArray(value, { max: 100 })
      : typeof value === "string" ? sanitizePlainText(value, { max: 1000 }) : value;
    return result;
  }, {});
};

const privatePayload = (data: ProfileInput = {}) => {
  const mapping: Record<string, string> = {
    studentId: "student_id", privacy: "privacy", collegeName: "college_name",
    schoolName: "school_name", hometown: "hometown", programId: "program_id",
    currentYear: "current_year", currentSemester: "current_semester", hallId: "hall_id",
    residenceValue: "current_residence", residencyType: "residency_type",
    residentGender: "resident_gender", roomId: "room_id", currentBed: "current_bed",
  };
  return Object.entries(data).reduce<Record<string, unknown>>((result, [key, value]) => {
    const column = mapping[key];
    if (!column) return result;
    result[column] = typeof value === "string" ? sanitizePlainText(value, { max: 1000 }) : value;
    return result;
  }, {});
};

const badReference = (message: string) => Object.assign(new Error(message), { statusCode: 400 });

class UserService {
  async validateReferenceSelection(userId: string, data: ProfileInput) {
    const supabase = ensureSupabaseAdmin();
    const result: ProfileInput = { ...data };
    const currentProfile = await this.getProfile(userId);
    if (!currentProfile) throw badReference("Profile not found");

    const departmentId = data.departmentId !== undefined
      ? (data.departmentId === null || data.departmentId === "" ? null : Number(data.departmentId))
      : currentProfile.department_id;
    if (departmentId !== null && (!Number.isInteger(departmentId) || departmentId <= 0)) throw badReference("Invalid department");
    if (data.departmentId !== undefined && departmentId !== null) {
      const { data: department, error } = await supabase.from("departments").select("id").eq("id", departmentId).maybeSingle();
      if (error) throw error;
      if (!department) throw badReference("Selected department does not exist");
      result.departmentId = departmentId;
    }

    const { data: currentPrivate, error: privateError } = await supabase
      .from("profile_private").select("program_id, hall_id, room_id").eq("user_id", userId).maybeSingle();
    if (privateError) throw privateError;

    if (data.departmentId !== undefined && data.programId === undefined) result.programId = null;
    if (data.programId !== undefined && data.programId !== null && data.programId !== "") {
      const programId = Number(data.programId);
      const { data: program, error } = await supabase.from("programs").select("id, department_id, active").eq("id", programId).maybeSingle();
      if (error) throw error;
      if (!program?.active) throw badReference("Selected program does not exist or is inactive");
      if (!departmentId || program.department_id !== departmentId) throw badReference("Selected program does not belong to the selected department");
      result.programId = programId;
    } else if (data.programId !== undefined) result.programId = null;

    const hallId = data.hallId !== undefined
      ? (data.hallId === null || data.hallId === "" ? null : Number(data.hallId))
      : currentPrivate?.hall_id || null;
    let selectedHall: any = null;
    let selectedRoom: any = null;
    if (data.hallId !== undefined && hallId !== null) {
      const { data: hall, error } = await supabase.from("residence_halls").select("id, name, active").eq("id", hallId).maybeSingle();
      if (error) throw error;
      if (!hall?.active) throw badReference("Selected hall does not exist or is inactive");
      selectedHall = hall;
      result.hallId = hallId;
    } else if (data.hallId !== undefined) result.hallId = null;

    if (data.hallId !== undefined && data.roomId === undefined) result.roomId = null;
    if (data.roomId !== undefined && data.roomId !== null && data.roomId !== "") {
      const roomId = Number(data.roomId);
      const { data: room, error } = await supabase.from("hall_rooms").select("id, hall_id, room_number, active").eq("id", roomId).maybeSingle();
      if (error) throw error;
      if (!room?.active) throw badReference("Selected room does not exist or is inactive");
      if (!hallId || room.hall_id !== hallId) throw badReference("Selected room does not belong to the selected hall");
      selectedRoom = room;
      result.roomId = roomId;
    } else if (data.roomId !== undefined) result.roomId = null;

    if (data.residencyType !== undefined) {
      const residencyType = data.residencyType || null;
      if (residencyType !== null && !["resident", "non_resident"].includes(residencyType)) {
        throw badReference("Residency type must be resident or non-resident");
      }
      result.residencyType = residencyType;
      if (residencyType === "non_resident") {
        const address = sanitizePlainText(data.nonResidentAddress, { max: 500 });
        if (!address || address.length < 8) throw badReference("A complete non-resident address is required");
        result.residentGender = null;
        result.hallId = null;
        result.roomId = null;
        result.residenceValue = address;
      } else if (residencyType === "resident") {
        if (!["male", "female"].includes(data.residentGender)) throw badReference("Resident gender must be selected");
        result.residentGender = data.residentGender;
        if (data.residentGender === "male") {
          if (!selectedHall || !selectedRoom) throw badReference("Male residents must select a hall and room");
          if (!["North", "South", "Utility"].includes(selectedHall.name)) throw badReference("Selected hall is not available for male residents");
          result.residenceValue = selectedHall.name + " " + selectedRoom.room_number;
        } else {
          result.hallId = null;
          result.roomId = null;
          result.residenceValue = "Female resident";
        }
      } else {
        result.residentGender = null;
        result.hallId = null;
        result.roomId = null;
        result.residenceValue = null;
      }
    }
    return result;
  }

  async getProfileReferenceData() {
    const supabase = ensureSupabaseAdmin();
    const [departments, programs, halls, rooms] = await Promise.all([
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("programs").select("id, department_id, code, name").eq("active", true).order("code"),
      supabase.from("residence_halls").select("id, name").eq("active", true).order("name"),
      supabase.from("hall_rooms").select("id, hall_id, room_number").eq("active", true).order("room_number"),
    ]);
    for (const query of [departments, programs, halls, rooms]) if (query.error) throw query.error;
    return {
      departments: departments.data,
      programs: (programs.data as any[]).map((item) => ({ id: item.id, departmentId: item.department_id, code: item.code, name: item.name })),
      halls: halls.data,
      rooms: (rooms.data as any[]).map((item) => ({ id: item.id, hallId: item.hall_id, roomNumber: item.room_number })),
    };
  }

  async getProfile(userId: string): Promise<any> {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase.from("profiles").select(publicProfileSelect).eq("id", userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async getPublicUserById(userId: string) {
    return toPublicUser(await this.getProfile(userId));
  }

  async getOwnerUserById(userId: string) {
    const supabase = ensureSupabaseAdmin();
    const [profile, privateResult] = await Promise.all([
      this.getProfile(userId),
      supabase.from("profile_private").select(privateProfileSelect).eq("user_id", userId).maybeSingle(),
    ]);
    if (privateResult.error) throw privateResult.error;
    return toOwnerUser(profile, privateResult.data);
  }

  async createProfile(userId: string, profileData: ProfileInput) {
    const supabase = ensureSupabaseAdmin();
    const validatedData = await this.validateReferenceSelection(userId, profileData);
    const safePublic = publicPayload(validatedData);
    const safePrivate = privatePayload(validatedData);
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...safePublic });
    if (error) throw error;
    const { error: privateError } = await supabase.from("profile_private").upsert({ user_id: userId, ...safePrivate });
    if (privateError) throw privateError;
    return this.getOwnerUserById(userId);
  }

  async updateProfile(userId: string, profileData: ProfileInput) {
    const supabase = ensureSupabaseAdmin();
    const validatedData = await this.validateReferenceSelection(userId, profileData);
    const safePublic = publicPayload(validatedData);
    const safePrivate = privatePayload(validatedData);
    if (Object.keys(safePublic).length) {
      const { error } = await supabase.from("profiles").update(safePublic).eq("id", userId);
      if (error) throw error;
    }
    if (Object.keys(safePrivate).length) {
      const { error } = await supabase.from("profile_private").upsert({ user_id: userId, ...safePrivate });
      if (error) throw error;
    }
    return this.getOwnerUserById(userId);
  }

  async updateUserName(userId: string, name: string) {
    await this.updateProfile(userId, { name });
    return this.getOwnerUserById(userId);
  }

  async getUserById(userId: string) { return this.getOwnerUserById(userId); }

  async searchUsers(query: string, excludeUserId: string, limit = 20) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase.from("profiles").select(publicProfileSelect)
      .neq("id", excludeUserId).ilike("display_name", `%${query}%`).limit(limit).order("display_name");
    if (error) throw error;
    return (data as any[]).map(toPublicUser);
  }

  async updateStudentId(userId: string, studentId: string) {
    const supabase = ensureSupabaseAdmin();
    const { error } = await supabase.from("profile_private").upsert({ user_id: userId, student_id: studentId });
    if (error?.code === "23505") throw new Error("Student ID already exists");
    if (error) throw error;
    return this.getOwnerUserById(userId);
  }

  async deleteStudentId(userId: string) {
    const supabase = ensureSupabaseAdmin();
    const { error } = await supabase.from("profile_private").update({ student_id: null }).eq("user_id", userId);
    if (error) throw error;
    return this.getOwnerUserById(userId);
  }

  async checkStudentIdExists(studentId: string, excludeUserId: string | null = null) {
    const supabase = ensureSupabaseAdmin();
    let query = supabase.from("profile_private").select("user_id").eq("student_id", studentId).limit(1);
    if (excludeUserId) query = query.neq("user_id", excludeUserId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as any[]).length > 0;
  }

  async getUserByStudentId(studentId: string) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase.from("profile_private").select("user_id").eq("student_id", studentId).maybeSingle();
    if (error) throw error;
    return data ? this.getPublicUserById(data.user_id) : null;
  }
}

const userService = new UserService();
export default userService;

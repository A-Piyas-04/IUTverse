const {
  ensureSupabaseAdmin,
  mapProfile,
  profileSelect,
  publicUrl,
} = require("../utils/supabaseData");

const mapDepartment = (department) => ({
  id: department.id,
  name: department.name,
  createdAt: department.created_at,
});

const mapResource = (resource) => ({
  id: resource.id,
  title: resource.title,
  type: resource.type,
  departmentId: resource.department_id,
  department: resource.department ? mapDepartment(resource.department) : null,
  fileUrl: resource.file_path,
  filePublicUrl: publicUrl(resource.file_bucket, resource.file_path),
  fileBucket: resource.file_bucket,
  externalLink: resource.external_link,
  courseCode: resource.course_code,
  uploadedById: resource.uploaded_by_id,
  uploadedBy: mapProfile(resource.uploadedBy),
  status: resource.status,
  createdAt: resource.created_at,
  updatedAt: resource.updated_at,
});

const resourceSelect = `*, department:departments(id, name, created_at), uploadedBy:profiles!academic_resources_uploaded_by_id_fkey(${profileSelect})`;

const createAcademicResource = async (resourceData) => {
  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("academic_resources")
    .insert({
      title: resourceData.title,
      type: resourceData.type,
      department_id: resourceData.departmentId,
      file_path: resourceData.filePath || null,
      file_bucket: resourceData.fileBucket || null,
      file_mime_type: resourceData.fileMimeType || null,
      file_size_bytes: resourceData.fileSizeBytes || null,
      external_link: resourceData.externalLink || null,
      course_code: resourceData.courseCode || null,
      uploaded_by_id: resourceData.uploadedById,
    })
    .select(resourceSelect)
    .single();

  if (error) throw error;
  return mapResource(data);
};

const getAllAcademicResources = async (filters = {}) => {
  const supabase = ensureSupabaseAdmin();
  let query = supabase
    .from("academic_resources")
    .select(resourceSelect)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (filters.departmentId) query = query.eq("department_id", Number(filters.departmentId));
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.courseCode) query = query.ilike("course_code", `%${filters.courseCode}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapResource);
};

const getAcademicResourceById = async (id) => {
  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("academic_resources")
    .select(resourceSelect)
    .eq("id", Number(id))
    .maybeSingle();

  if (error) throw error;
  return data ? mapResource(data) : null;
};

const getAllDepartments = async () => {
  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data.map(mapDepartment);
};

const createDepartment = async (name) => {
  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("departments")
    .insert({ name })
    .select("*")
    .single();

  if (error) throw error;
  return mapDepartment(data);
};

const updateAcademicResource = async (id, updateData, userId) => {
  const existing = await getAcademicResourceById(id);
  if (!existing) throw new Error("Academic resource not found");
  if (existing.uploadedById && existing.uploadedById !== userId) {
    throw new Error("Unauthorized to update this academic resource");
  }

  const payload = {};
  if (updateData.title !== undefined) payload.title = updateData.title;
  if (updateData.type !== undefined) payload.type = updateData.type;
  if (updateData.departmentId !== undefined) payload.department_id = updateData.departmentId;
  if (updateData.externalLink !== undefined) payload.external_link = updateData.externalLink || null;
  if (updateData.courseCode !== undefined) payload.course_code = updateData.courseCode || null;
  if (updateData.filePath !== undefined) payload.file_path = updateData.filePath;
  if (updateData.fileBucket !== undefined) payload.file_bucket = updateData.fileBucket;
  if (updateData.fileMimeType !== undefined) payload.file_mime_type = updateData.fileMimeType;
  if (updateData.fileSizeBytes !== undefined) payload.file_size_bytes = updateData.fileSizeBytes;

  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("academic_resources")
    .update(payload)
    .eq("id", Number(id))
    .select(resourceSelect)
    .single();

  if (error) throw error;
  return mapResource(data);
};

const deleteAcademicResource = async (id, userId) => {
  const existing = await getAcademicResourceById(id);
  if (!existing) throw new Error("Academic resource not found");
  if (existing.uploadedById && existing.uploadedById !== userId) {
    throw new Error("Unauthorized to delete this academic resource");
  }

  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("academic_resources")
    .delete()
    .eq("id", Number(id))
    .select(resourceSelect)
    .single();

  if (error) throw error;
  return mapResource(data);
};

module.exports = {
  createAcademicResource,
  getAllAcademicResources,
  getAcademicResourceById,
  getAllDepartments,
  createDepartment,
  updateAcademicResource,
  deleteAcademicResource,
};

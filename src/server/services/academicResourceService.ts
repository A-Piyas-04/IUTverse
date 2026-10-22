import "server-only";
import { ensureSupabaseAdmin, mapProfile, profileSelect, publicUrl } from "../utils/supabaseData";
import { filterSearchTerm, optionalText, sanitizePlainText } from "../utils/validation";

const mapDepartment = (department: any) => ({
  id: department.id,
  name: department.name,
  createdAt: department.created_at,
});

const mapResource = (resource: any) => ({
  id: resource.id,
  title: resource.title,
  type: resource.type,
  departmentId: resource.department_id,
  department: resource.department ? mapDepartment(resource.department) : null,
  filePath: resource.file_path,
  fileUrl: resource.file_path ? `/api/academic/resources/${resource.id}/file` : null,
  fileDownloadUrl: resource.file_path ? `/api/academic/resources/${resource.id}/file` : null,
  filePublicUrl: publicUrl(resource.file_bucket, resource.file_path),
  fileBucket: resource.file_bucket,
  externalLink: resource.external_link,
  courseCode: resource.course_code,
  description: resource.description,
  tags: resource.tags || [],
  helpfulCount: resource.helpful_count || 0,
  commentCount: resource.comment_count || 0,
  uploadedById: resource.uploaded_by_id as string | null,
  uploadedBy: mapProfile(resource.uploadedBy),
  status: resource.status as string,
  createdAt: resource.created_at,
  updatedAt: resource.updated_at,
});

const resourceSelect = `*, department:departments(id, name, created_at), uploadedBy:profiles!academic_resources_uploaded_by_id_fkey(${profileSelect})`;

export interface ResourceInput {
  title?: string;
  type?: string;
  departmentId?: number;
  filePath?: string | null;
  fileBucket?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
  externalLink?: string | null;
  courseCode?: string | null;
  description?: string | null;
  tags?: string[];
  uploadedById?: string;
}

export const createAcademicResource = async (resourceData: ResourceInput) => {
  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("academic_resources")
    .insert({
      title: sanitizePlainText(resourceData.title, { max: 160 }),
      type: resourceData.type,
      department_id: resourceData.departmentId,
      file_path: resourceData.filePath || null,
      file_bucket: resourceData.fileBucket || null,
      file_mime_type: resourceData.fileMimeType || null,
      file_size_bytes: resourceData.fileSizeBytes || null,
      external_link: optionalText(resourceData.externalLink, { max: 500 }),
      course_code: optionalText(resourceData.courseCode, { max: 60 }),
      description: optionalText(resourceData.description, { max: 3000 }),
      tags: resourceData.tags || [],
      uploaded_by_id: resourceData.uploadedById,
    })
    .select(resourceSelect)
    .single();

  if (error) throw error;
  return mapResource(data);
};

export const getAllAcademicResources = async (
  filters: { departmentId?: number; type?: string; courseCode?: string | null; search?: string | null } = {},
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
) => {
  const supabase = ensureSupabaseAdmin();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from("academic_resources")
    .select(resourceSelect, { count: "exact" })
    .eq("status", "active");

  if (filters.departmentId) query = query.eq("department_id", Number(filters.departmentId));
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.courseCode) query = query.ilike("course_code", `%${filters.courseCode}%`);
  const search = filterSearchTerm(filters.search);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,course_code.ilike.%${search}%`);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return {
    resources: (data as any[]).map(mapResource),
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

export const getAcademicResourceById = async (id: number | string) => {
  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("academic_resources")
    .select(resourceSelect)
    .eq("id", Number(id))
    .maybeSingle();

  if (error) throw error;
  return data ? mapResource(data) : null;
};

export const getAllDepartments = async () => {
  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as any[]).map(mapDepartment);
};

export const createDepartment = async (name: string) => {
  const supabase = ensureSupabaseAdmin();
  const { data, error } = await supabase
    .from("departments")
    .insert({ name: sanitizePlainText(name, { max: 120 }) })
    .select("*")
    .single();

  if (error) throw error;
  return mapDepartment(data);
};

export const updateAcademicResource = async (id: number, updateData: ResourceInput, userId: string) => {
  const existing = await getAcademicResourceById(id);
  if (!existing) throw new Error("Academic resource not found");
  if (existing.uploadedById && existing.uploadedById !== userId) {
    throw new Error("Unauthorized to update this academic resource");
  }

  const payload: Record<string, unknown> = {};
  if (updateData.title !== undefined) payload.title = sanitizePlainText(updateData.title, { max: 160 });
  if (updateData.type !== undefined) payload.type = updateData.type;
  if (updateData.departmentId !== undefined) payload.department_id = updateData.departmentId;
  if (updateData.externalLink !== undefined) payload.external_link = optionalText(updateData.externalLink, { max: 500 });
  if (updateData.courseCode !== undefined) payload.course_code = optionalText(updateData.courseCode, { max: 60 });
  if (updateData.description !== undefined) payload.description = optionalText(updateData.description, { max: 3000 });
  if (updateData.tags !== undefined) payload.tags = updateData.tags;
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

export const deleteAcademicResource = async (id: number, userId: string) => {
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

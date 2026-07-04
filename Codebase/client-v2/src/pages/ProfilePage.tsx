import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Camera, CheckCircle2, Edit3, LockKeyhole, MessageSquare, ShieldCheck } from "lucide-react";
import { apiRequest, jsonBody, mediaUrl } from "@/lib/api";
import type { Post, Profile } from "@/lib/types";
import { Avatar, Button, Card, Chip, Dialog, DialogActions, EmptyState, Field, Input, Select, Textarea, useToast } from "@/components/ui/Ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { PageFrame } from "@/components/shell/AppShell";
import { PostCard } from "./FeedPage";
import styles from "./Pages.module.css";

interface ReferenceData {
  departments: { id: number; name: string }[];
  programs: { id: number; departmentId: number; code: string; name: string }[];
  halls: { id: number; name: string }[];
  rooms: { id: number; hallId: number; roomNumber: string }[];
}

export function ProfilePage() {
  const { user } = useAuth();
  const { userId } = useParams();
  const id = userId || user?.id;
  const owner = !userId || userId === user?.id;
  const [tab, setTab] = useState("Posts");
  const [edit, setEdit] = useState(false);
  const profile = useQuery({
    queryKey: ["profile", id],
    queryFn: ({ signal }) => apiRequest<Profile>(owner ? "/profile/me" : "/profile/" + id, {}, signal),
    enabled: Boolean(id),
    select: result => ({ ...result, data: normalizeProfile(result.data) }),
  });
  const posts = useQuery({
    queryKey: ["profile-posts", id],
    queryFn: ({ signal }) => apiRequest<Post[]>("/posts?userId=" + id + "&limit=50", {}, signal),
    enabled: Boolean(id && tab === "Posts"),
  });
  if (profile.isError) return <PageFrame title="Profile"><EmptyState title="Profile unavailable" body={profile.error.message} /></PageFrame>;
  const value = profile.data?.data;
  const coverStyle = value?.coverPictureUrl
    ? { backgroundImage: "url(" + mediaUrl(value.coverPictureUrl) + ")", backgroundSize: "cover", backgroundPosition: "center" }
    : {};
  return <PageFrame title="Profile" eyebrow={owner ? "Your IUTverse identity" : "Verified IUT member"}>
    <div className={styles.profileHero}>
      <div className={styles.cover} style={coverStyle} />
      <div className={styles.profileBody}>
        <div className={styles.profileAvatar}><Avatar size={96} name={value?.displayName} src={mediaUrl(value?.profilePictureUrl)} /></div>
        <div className={styles.profileActions}>{owner ? <Button onClick={() => setEdit(true)}><Edit3 size={17} />Edit profile</Button> : <Button><MessageSquare size={17} />Message</Button>}</div>
        <div className={styles.profileName}>
          <h1>{value?.displayName || "Loading…"}{value?.badges?.length ? <CheckCircle2 size={18} color="var(--accent)" /> : null}</h1>
          <p>{value?.handle ? "@" + value.handle : ""} {value?.department}{value?.batch ? " " + value.batch : ""}</p>
          <p>{value?.bio || "Complete your profile to help the IUT community know you."}</p>
        </div>
        <div className={styles.metrics}><span><strong>{posts.data?.data?.length || 0}</strong> Posts</span><span><strong>{value?.interests?.length || 0}</strong> Interests</span><span><strong>{value?.badges?.length || 0}</strong> Badges</span></div>
      </div>
    </div>
    <div className={styles.toolbar}>{["Posts", "Resources", "Opportunities", "Replies", "About"].map(item => <Chip key={item} active={tab === item} onClick={() => setTab(item)}>{item}</Chip>)}</div>
    <div className={styles.stack}>
      {tab === "Posts" && (posts.data?.data?.length ? posts.data.data.map(post => <PostCard key={post.id} post={post} />) : <EmptyState title="No public posts" body="Public contributions will appear here." />)}
      {tab === "About" && value && <AboutProfile profile={value} owner={owner} />}
      {!["Posts", "About"].includes(tab) && <EmptyState title={"No public " + tab.toLowerCase()} body="Contributions will appear here when available." />}
    </div>
    {value && <EditProfileDialog profile={value} open={edit} onClose={() => setEdit(false)} />}
  </PageFrame>;
}

function normalizeProfile(value: any): Profile {
  const source = value?.data || value?.user || value || {};
  const details = source.profile && typeof source.profile === "object" ? source.profile : {};
  const field = (...keys: string[]) => {
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null) return source[key];
      if (details[key] !== undefined && details[key] !== null) return details[key];
    }
    return undefined;
  };
  const department = field("department");
  return {
    id: field("id", "userId", "user_id"),
    displayName: field("displayName", "display_name", "name") || "IUT member",
    email: field("email"), handle: field("handle"),
    department: typeof department === "object" ? department?.name : department,
    departmentId: field("departmentId", "department_id"), batch: field("batch"),
    studentId: field("studentId", "student_id"), bio: field("bio"),
    interests: field("interests") || [], badges: field("badges") || [], role: field("role"),
    profilePictureUrl: field("profilePictureUrl", "profile_picture_url", "profilePicture"),
    coverPictureUrl: field("coverPictureUrl", "cover_picture_url", "coverPicture"),
    schoolName: field("schoolName", "school_name"), collegeName: field("collegeName", "college_name"),
    currentProgram: field("currentProgram", "current_program"), programId: field("programId", "program_id"),
    currentYear: field("currentYear", "current_year"), currentSemester: field("currentSemester", "current_semester"),
    hometown: field("hometown"), currentResidence: field("currentResidence", "current_residence"),
    residencyType: field("residencyType", "residency_type"),
    residentGender: field("residentGender", "resident_gender"),
    currentHall: field("currentHall", "current_hall"), hallId: field("hallId", "hall_id"),
    currentRoom: field("currentRoom", "current_room"), roomId: field("roomId", "room_id"),
    currentBed: field("currentBed", "current_bed"), privacy: field("privacy") || {},
  };
}

function AboutProfile({ profile, owner }: { profile: Profile; owner: boolean }) {
  return <>
    <Card padded><h2>Department and batch</h2><p>{profile.department || "Not added"} {profile.batch || ""}</p><h2>Academic interests</h2><p>{profile.interests?.join(", ") || "Not added"}</p><h2>Education</h2><p>{[profile.schoolName, profile.collegeName, profile.currentProgram, profile.currentYear, profile.currentSemester].filter(Boolean).join(" · ") || "Not added"}</p></Card>
    {owner && <Card padded><h2><LockKeyhole size={18} /> Private information</h2><p>Residence and direct contact details are visible only to you.</p><p>{[profile.hometown, profile.currentResidence, profile.currentBed].filter(Boolean).join(" · ") || "No private details added"}</p></Card>}
  </>;
}

function EditProfileDialog({ profile, open, onClose }: { profile: Profile; open: boolean; onClose(): void }) {
  const [form, setForm] = useState({ ...profile, interestsText: profile.interests?.join(", ") || "" });
  const [uploading, setUploading] = useState<"picture" | "cover" | null>(null);
  const cache = useQueryClient();
  const { notify } = useToast();
  const { refreshUser } = useAuth();
  const references = useQuery({ queryKey: ["profile-reference-data"], queryFn: ({ signal }) => apiRequest<ReferenceData>("/profile-reference-data", {}, signal), enabled: open, staleTime: 300000 });
  useEffect(() => setForm({ ...profile, interestsText: profile.interests?.join(", ") || "" }), [profile]);
  const programs = useMemo(() => references.data?.data.programs.filter(item => item.departmentId === Number(form.departmentId)) || [], [form.departmentId, references.data]);
  const rooms = useMemo(() => references.data?.data.rooms.filter(item => item.hallId === Number(form.hallId)) || [], [form.hallId, references.data]);
  const set = (key: string, value: unknown) => setForm(current => ({ ...current, [key]: value }));
  const update = useMutation({
    mutationFn: () => apiRequest<Profile>("/profile/me", { method: "PATCH", ...jsonBody({
      displayName: form.displayName, handle: form.handle || null,
      departmentId: form.departmentId || null, programId: form.programId || null,
      batch: form.batch || null, studentId: form.studentId || null, bio: form.bio || null,
      interests: form.interestsText.split(",").map(item => item.trim()).filter(Boolean),
      schoolName: form.schoolName || null, collegeName: form.collegeName || null,
      hometown: form.hometown || null,
      residencyType: form.residencyType || null,
      residentGender: form.residentGender || null,
      nonResidentAddress: form.residencyType === "non_resident" ? form.currentResidence || null : null,
      hallId: form.hallId || null, roomId: form.roomId || null,
      currentYear: form.currentYear || null, currentSemester: form.currentSemester || null,
      currentBed: form.currentBed || null,
    }) }),
    onSuccess: async () => {
      await Promise.all([cache.invalidateQueries({ queryKey: ["profile"] }), cache.invalidateQueries({ queryKey: ["conversations"] }), refreshUser()]);
      notify("Profile updated."); onClose();
    },
  });
  const upload = async (type: "picture" | "cover", file?: File) => {
    if (!file) return;
    setUploading(type);
    try {
      const body = new FormData();
      body.append(type === "picture" ? "profilePicture" : "coverPicture", file);
      await apiRequest("/profile/upload-" + type, { method: "POST", body });
      await Promise.all([cache.invalidateQueries({ queryKey: ["profile"] }), cache.invalidateQueries({ queryKey: ["conversations"] })]);
      notify(type === "picture" ? "Profile picture updated." : "Cover picture updated.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Image upload failed.");
    } finally { setUploading(null); }
  };
  return <Dialog title="Edit profile" open={open} onClose={onClose}>
    <form className={styles.form} onSubmit={event => { event.preventDefault(); update.mutate(); }}>
      <div className={styles.formGrid}>
        <label className={styles.file}><Camera />{uploading === "picture" ? "Uploading…" : "Change avatar"}<input disabled={Boolean(uploading)} type="file" accept="image/*" onChange={event => void upload("picture", event.target.files?.[0])} /></label>
        <label className={styles.file}><Camera />{uploading === "cover" ? "Uploading…" : "Change cover"}<input disabled={Boolean(uploading)} type="file" accept="image/*" onChange={event => void upload("cover", event.target.files?.[0])} /></label>
      </div>
      <div className={styles.formGrid}>
        <Field label="Display name"><Input required value={form.displayName || ""} onChange={event => set("displayName", event.target.value)} /></Field>
        <Field label="Handle"><Input value={form.handle || ""} onChange={event => set("handle", event.target.value.replace(/[^a-z0-9_]/gi, ""))} /></Field>
        <Field label="Department"><Select value={form.departmentId || ""} onChange={event => setForm(current => ({ ...current, departmentId: Number(event.target.value) || undefined, programId: undefined }))}><option value="">Select department</option>{references.data?.data.departments.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="Program"><Select disabled={!form.departmentId} value={form.programId || ""} onChange={event => set("programId", Number(event.target.value) || undefined)}><option value="">{form.departmentId ? "Select program" : "Select a department first"}</option>{programs.map(item => <option value={item.id} key={item.id}>{item.code} — {item.name}</option>)}</Select></Field>
        <Field label="Batch"><Input type="number" value={form.batch || ""} onChange={event => set("batch", Number(event.target.value) || undefined)} /></Field>
        <Field label="Student ID"><Input value={form.studentId || ""} onChange={event => set("studentId", event.target.value)} /></Field>
      </div>
      <Field label="Bio"><Textarea maxLength={300} value={form.bio || ""} onChange={event => set("bio", event.target.value)} /></Field>
      <Field label="Interests (comma separated)"><Input value={form.interestsText} onChange={event => set("interestsText", event.target.value)} /></Field>
      <details><summary>Education and residence</summary><div className={styles.formGrid}>
        <Field label="School"><Input value={form.schoolName || ""} onChange={event => set("schoolName", event.target.value)} /></Field>
        <Field label="College"><Input value={form.collegeName || ""} onChange={event => set("collegeName", event.target.value)} /></Field>
        <Field label="Hometown"><Input value={form.hometown || ""} onChange={event => set("hometown", event.target.value)} /></Field>
        <Field label="Residency"><Select value={form.residencyType || ""} onChange={event => setForm(current => ({ ...current, residencyType: (event.target.value || undefined) as Profile["residencyType"], residentGender: undefined, hallId: undefined, roomId: undefined, currentResidence: "" }))}><option value="">Select residency</option><option value="resident">Resident student</option><option value="non_resident">Non-resident student</option></Select></Field>
        {form.residencyType === "non_resident" && <Field label="Full residential address"><Textarea required value={form.currentResidence || ""} onChange={event => set("currentResidence", event.target.value)} /></Field>}
        {form.residencyType === "resident" && <Field label="Resident gender"><Select value={form.residentGender || ""} onChange={event => setForm(current => ({ ...current, residentGender: (event.target.value || undefined) as Profile["residentGender"], hallId: undefined, roomId: undefined }))}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option></Select></Field>}
        {form.residencyType === "resident" && form.residentGender === "male" && <Field label="Hall"><Select required value={form.hallId || ""} onChange={event => setForm(current => ({ ...current, hallId: Number(event.target.value) || undefined, roomId: undefined }))}><option value="">Select hall</option>{references.data?.data.halls.filter(item => ["North", "South", "Utility"].includes(item.name)).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>}
        {form.residencyType === "resident" && form.residentGender === "male" && <Field label="Room"><Select required disabled={!form.hallId} value={form.roomId || ""} onChange={event => set("roomId", Number(event.target.value) || undefined)}><option value="">{form.hallId ? "Select room" : "Select a hall first"}</option>{rooms.map(item => <option value={item.id} key={item.id}>{item.roomNumber}</option>)}</Select></Field>}
        {form.residencyType === "resident" && form.residentGender === "female" && <p>Female resident status will be stored without an invented hall or room assignment.</p>}
      </div></details>
      {references.isError && <p role="alert">Profile choices could not load: {references.error.message}</p>}
      {update.isError && <p role="alert">{update.error.message}</p>}
      <div className={styles.notice}><ShieldCheck size={18} />Private residence details are never included in public profile responses.</div>
      <DialogActions><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={update.isPending || references.isLoading || Boolean(uploading)}>{update.isPending ? "Saving…" : "Save changes"}</Button></DialogActions>
    </form>
  </Dialog>;
}

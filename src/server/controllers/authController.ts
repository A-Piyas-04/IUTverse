import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json } from "../http/responses";
import logger from "../utils/logger";
import config from "../config/config";
import { validateIUTEmail } from "../utils/authUtils";
import { requiredText } from "../utils/validation";
import { pageRange } from "../utils/supabaseData";
import * as securityService from "../services/securityService";
import {
  createAuthClient,
  supabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from "../config/supabase";

const ensureSupabaseAuth = () => {
  if (!isSupabaseConfigured) {
    throw Object.assign(new Error("Supabase Auth is not configured"), { statusCode: 500 });
  }
};

const publicUserFromSession = (sessionUser: any, profile: any = null) => ({
  id: sessionUser.id,
  email: sessionUser.email,
  name: profile?.display_name || sessionUser.user_metadata?.display_name || null,
  role: profile?.role || "user",
  createdAt: sessionUser.created_at,
});

const getProfile = async (userId: string) => {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return null;
  const [{ data }, security] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, display_name").eq("id", userId).maybeSingle(),
    securityService.getSecurityContext(userId),
  ]);
  return data ? { ...data, role: security.role, membershipStatus: security.membershipStatus } : null;
};

export const signup: Handler = async (ctx) => {
  try {
    ensureSupabaseAuth();

    const { email, password, name } = ctx.body;

    if (!email) {
      return json(400, { message: "Email is required" });
    }

    if (!password || password.length < 8) {
      return json(400, { message: "Password must be at least 8 characters long" });
    }

    if (!validateIUTEmail(email)) {
      return json(400, { message: "Please provide a valid IUT email address" });
    }

    const { data, error } = await createAuthClient()!.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name || email.split("@")[0],
        },
      },
    });

    if (error) {
      // The provider message distinguishes existing accounts; keep it in logs.
      logger.warn("Signup rejected by Supabase Auth", { code: error.code, status: error.status });
      return json(400, { message: "Could not create the account. If you already have one, sign in or reset your password." });
    }

    if (isSupabaseAdminConfigured && supabaseAdmin && data.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: data.user.id,
        display_name: name || email.split("@")[0],
      });
    }

    return json(201, {
      message: data.session
        ? "Account created successfully."
        : "Account created successfully. Please check your email to confirm your account.",
      token: data.session?.access_token || null,
      refreshToken: data.session?.refresh_token || null,
      user: data.user ? publicUserFromSession(data.user) : null,
    });
  } catch (error: any) {
    logger.error("Signup error:", error);
    return json(error.statusCode || 500, { message: error.message || "Internal server error. Please try again." });
  }
};

export const login: Handler = async (ctx) => {
  try {
    ensureSupabaseAuth();

    const { email, password } = ctx.body;

    if (!email || !password) {
      return json(400, { message: "Email and password are required" });
    }

    const authClient = createAuthClient()!;
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      // Same answer for every cause; the log says which (e.g. invalid_credentials, email_not_confirmed).
      logger.warn("Login rejected by Supabase Auth", { code: error?.code, status: error?.status });
      return json(401, { message: "Invalid email or password. Please check your credentials." });
    }

    const profile = await getProfile(data.user.id);
    if (profile?.membershipStatus !== "active") {
      // Revokes only this request's session.
      await authClient.auth.signOut().catch(() => {});
      return response.forbidden("Active IUTverse membership required");
    }

    return json(200, {
      message: "Login successful",
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: publicUserFromSession(data.user, profile),
    });
  } catch (error) {
    logger.error("Login error:", error);
    return json(500, { message: "Internal server error. Please try again." });
  }
};

export const requestPasswordReset: Handler = async (ctx) => {
  try {
    ensureSupabaseAuth();

    const emailResult = requiredText(ctx.body.email, "Email", { max: 254 });
    if (!emailResult.ok) return response.badRequest(emailResult.error);
    const email = emailResult.value;
    // The redirect target is server configuration, never client input. Unset
    // means Supabase uses the project's Site URL.
    const options = config.auth.passwordResetRedirectUrl
      ? { redirectTo: config.auth.passwordResetRedirectUrl }
      : {};

    const { error: resetError } = await createAuthClient()!.auth.resetPasswordForEmail(email, options);
    // Same response either way so the endpoint does not reveal which emails exist.
    if (resetError) logger.warn("Password reset request failed", { code: resetError.code, status: resetError.status });

    return response.success(
      null,
      "If that IUT email exists, a password reset email has been sent."
    );
  } catch (error) {
    logger.error("Password reset request error:", error);
    return response.serverError("Failed to request password reset");
  }
};

export const changePassword: Handler = async (ctx) => {
  try {
    if (!isSupabaseAdminConfigured || !supabaseAdmin) {
      return response.serverError("Supabase Admin is not configured");
    }

    const password = typeof ctx.body.password === "string" ? ctx.body.password : "";
    if (password.length < 8 || password.length > 128) {
      return response.badRequest("Password must be between 8 and 128 characters long");
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(ctx.user!.id, {
      password,
    });
    if (updateError) return response.badRequest(updateError.message);

    return response.success(null, "Password updated successfully");
  } catch (error: any) {
    logger.error("Password change error:", error);
    return response.serverError("Failed to update password", error.message);
  }
};

export const getAllUsers: Handler = async (ctx) => {
  try {
    if (!isSupabaseAdminConfigured || !supabaseAdmin) {
      return json(500, { message: "Supabase Admin is not configured" });
    }

    const range = pageRange(ctx.query.page, ctx.query.limit);
    const { count, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (countError) {
      return response.serverError("Failed to fetch users", countError.message);
    }

    const { data: users, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, department_id, batch, created_at")
      .order("created_at", { ascending: false })
      .range(range.from, range.to);

    if (error) {
      return response.serverError("Failed to fetch users", error.message);
    }

    const ids = users.map((user) => user.id);
    const [{ data: roles, error: rolesError }, { data: memberships, error: membershipsError }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("memberships").select("user_id, status, source").in("user_id", ids),
    ]);
    if (rolesError || membershipsError) {
      return response.serverError("Failed to fetch user security data", (rolesError || membershipsError)!.message);
    }
    const roleByUser = new Map((roles || []).map((row) => [row.user_id, row.role]));
    const membershipByUser = new Map((memberships || []).map((row) => [row.user_id, row]));
    const safeUsers = users.map((user) => ({
      ...user,
      role: roleByUser.get(user.id) || "user",
      membershipStatus: membershipByUser.get(user.id)?.status || "missing",
      membershipSource: membershipByUser.get(user.id)?.source || null,
    }));

    return response.success(safeUsers, null, {
      pagination: {
        page: range.page,
        limit: range.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / range.limit),
      },
    });
  } catch (error: any) {
    logger.error("Get users error:", error);
    return response.serverError("Internal server error. Please try again.", error.message);
  }
};

export const validateToken: Handler = (ctx) =>
  json(200, {
    message: "Token is valid",
    user: {
      id: ctx.user!.id,
      email: ctx.user!.email,
      name: ctx.user!.name,
      role: ctx.user!.role,
    },
  });

export const getMe: Handler = (ctx) =>
  response.success({
    id: ctx.user!.id,
    email: ctx.user!.email,
    displayName: ctx.user!.name,
    role: ctx.user!.role,
    membershipStatus: ctx.user!.membershipStatus,
  });

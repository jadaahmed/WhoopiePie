import { redirect } from "next/navigation";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type UniversityClaims = {
  sub?: string;
  email?: string;
  user_metadata?: {
    role?: unknown;
    full_name?: unknown;
  };
};

function getRoleFromMetadata(metadata: unknown): UserRole | null {
  if (!metadata || typeof metadata !== "object" || !("role" in metadata)) {
    return null;
  }

  const role = (metadata as { role?: unknown }).role;
  return isUserRole(role) ? role : null;
}

export async function getSessionProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as UniversityClaims | undefined;

  if (!claims?.sub) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, university_id, department")
    .eq("id", claims.sub)
    .single();

  const role = profile?.role ?? getRoleFromMetadata(claims.user_metadata) ?? "student";
  const displayName =
    profile?.full_name ??
    (typeof claims.user_metadata?.full_name === "string"
      ? claims.user_metadata.full_name
      : null) ??
    claims.email ??
    "University user";

  return {
    supabase,
    userId: claims.sub,
    email: claims.email ?? "",
    role,
    displayName,
    profile,
  };
}

export function dashboardPathForRole(role: UserRole) {
  if (role === "admin") {
    return "/dashboard/admin";
  }

  return role === "staff" ? "/dashboard/staff" : "/dashboard/student";
}

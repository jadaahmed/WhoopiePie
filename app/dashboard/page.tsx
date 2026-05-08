import { redirect } from "next/navigation";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

export default async function DashboardPage() {
  const { role } = await getSessionProfile();

  redirect(dashboardPathForRole(role));
}

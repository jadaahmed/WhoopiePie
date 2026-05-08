import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { communityPostTypeLabels } from "@/lib/community/options";
import { getSessionProfile } from "@/lib/auth/session";

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function AnnouncementDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { displayName, profile, role, supabase } = await getSessionProfile();
  const { id } = await params;

  const { data: post } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) {
    notFound();
  }

  return (
    <AppShell
      active="announcements"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Community module</p>
          <h1>{post.title}</h1>
          <p>
            {communityPostTypeLabels[post.post_type]} · {post.category} ·{" "}
            {formatPostDate(post.post_date)}
          </p>
        </div>
        <Link className="button secondary" href="/announcements">
          Back to hub
        </Link>
      </div>

      <article className="dashboard-card readable-card">
        {post.description.split(/\n{2,}/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </AppShell>
  );
}

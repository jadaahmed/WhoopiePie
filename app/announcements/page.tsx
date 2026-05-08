import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { communityPostTypeLabels } from "@/lib/community/options";
import { getSessionProfile } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type CommunityPost = Database["public"]["Tables"]["community_posts"]["Row"];
type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function getPreview(text: string) {
  return text.length > 150 ? `${text.slice(0, 147)}...` : text;
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase } = await getSessionProfile();
  const params = await searchParams;
  const status = getParam(params, "status");

  const { data: posts } = await supabase
    .from("community_posts")
    .select("*")
    .order("post_date", { ascending: false })
    .order("created_at", { ascending: false });

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
          <h1>Announcements & events</h1>
          <p>University-wide updates listed with the newest items first.</p>
        </div>
        {role !== "student" ? (
          <Link className="button" href="/announcements/create">
            Post update
          </Link>
        ) : null}
      </div>

      {status === "published" ? (
        <div className="message-banner success">
          Update published and visible in the hub.
        </div>
      ) : null}

      {posts && posts.length > 0 ? (
        <div className="catalog-grid">
          {posts.map((post: CommunityPost) => (
            <article className="course-card" key={post.id}>
              <header>
                <span className="role-badge">
                  {communityPostTypeLabels[post.post_type]}
                </span>
                <span className="status">{formatPostDate(post.post_date)}</span>
              </header>
              <h2>{post.title}</h2>
              <dl className="detail-list">
                <div>
                  <dt>Category</dt>
                  <dd>{post.category}</dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>{formatPostDate(post.post_date)}</dd>
                </div>
              </dl>
              <p className="muted">{getPreview(post.description)}</p>
              <footer>
                <a className="button secondary" href={`/announcements/${post.id}`}>
                  View details
                </a>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No announcements or events</h2>
          <p>Published university-wide updates will appear here.</p>
        </div>
      )}
    </AppShell>
  );
}
